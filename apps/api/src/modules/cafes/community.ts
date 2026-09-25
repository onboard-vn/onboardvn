import type {
  AdminContributionListResponse,
  AdminContributionsQuery,
  CafeGameSource,
  CommunityAddGamesResult,
} from '@onboard/shared';
import { and, count, desc, eq, inArray } from 'drizzle-orm';
import { db } from '../../db/client.js';
import {
  adminAuditLog,
  cafeGameEvents,
  cafeGames,
  cafes,
  games,
  users,
} from '../../db/schema/index.js';
import { ApiError } from '../../lib/errors.js';
import type { SessionUser } from '../../types.js';
import * as repo from './repo.js';
import type { Tx } from './repo.js';
import { isPubliclyVisibleCafe } from './visibility.js';

/** Latest event per game determines whether a community re-add is blocked: a `remove` logged by
 * staff/owner (not community) means the game stays out until they confirm/re-add it. */
async function findCommunityBlockedGameIds(
  tx: Tx,
  cafeId: string,
  gameIds: string[],
): Promise<Set<string>> {
  if (gameIds.length === 0) return new Set();

  const events = await tx
    .select({
      gameId: cafeGameEvents.gameId,
      action: cafeGameEvents.action,
      source: cafeGameEvents.source,
    })
    .from(cafeGameEvents)
    .where(and(eq(cafeGameEvents.cafeId, cafeId), inArray(cafeGameEvents.gameId, gameIds)))
    .orderBy(desc(cafeGameEvents.createdAt));

  const latestByGame = new Map<string, { action: string; source: string }>();
  for (const event of events) {
    if (!latestByGame.has(event.gameId)) latestByGame.set(event.gameId, event);
  }

  const blocked = new Set<string>();
  for (const [gameId, latest] of latestByGame) {
    if (latest.action === 'remove' && latest.source !== 'community') blocked.add(gameId);
  }
  return blocked;
}

export async function addCommunityGamesService(
  cafeId: string,
  gameIds: string[],
  user: SessionUser,
): Promise<CommunityAddGamesResult> {
  if (user.contributionBlockedAt) {
    throw new ApiError('FORBIDDEN', 403, 'Tài khoản đã bị chặn đóng góp cộng đồng');
  }

  const cafe = await repo.findCafeRowById(cafeId);
  if (!cafe) throw new ApiError('NOT_FOUND', 404, 'Không tìm thấy quán');
  if (!isPubliclyVisibleCafe(cafe.consentStatus)) {
    throw new ApiError('FORBIDDEN', 403, 'Quán chưa công khai để đóng góp');
  }

  const uniqueIds = [...new Set(gameIds)];
  const allExist = await repo.gameIdsExist(uniqueIds);
  if (!allExist) throw new ApiError('VALIDATION_FAILED', 422, 'Danh sách game có mục không hợp lệ');

  return db.transaction(async (tx) => {
    const existing = await tx
      .select({ gameId: cafeGames.gameId })
      .from(cafeGames)
      .where(and(eq(cafeGames.cafeId, cafeId), inArray(cafeGames.gameId, uniqueIds)));
    const existingIds = new Set(existing.map((r) => r.gameId));
    const candidateIds = uniqueIds.filter((id) => !existingIds.has(id));

    const blockedIds = await findCommunityBlockedGameIds(tx, cafeId, candidateIds);
    const toInsert = candidateIds.filter((id) => !blockedIds.has(id));

    if (toInsert.length === 0 && blockedIds.size === uniqueIds.length) {
      throw new ApiError(
        'CONFLICT',
        409,
        'Các game này đã bị gỡ và cần chủ quán/staff xác nhận lại',
      );
    }

    const inserted =
      toInsert.length > 0
        ? await tx
            .insert(cafeGames)
            .values(
              toInsert.map((gameId) => ({
                cafeId,
                gameId,
                addedBy: user.id,
                addedVia: 'scan' as const,
                source: 'community' as const,
              })),
            )
            .onConflictDoNothing({ target: [cafeGames.cafeId, cafeGames.gameId] })
            .returning({ gameId: cafeGames.gameId })
        : [];

    if (inserted.length > 0) {
      await tx.insert(cafeGameEvents).values(
        inserted.map(({ gameId }) => ({
          cafeId,
          gameId,
          userId: user.id,
          action: 'add' as const,
          source: 'community' as const,
        })),
      );
    }

    return {
      added: inserted.length,
      skipped: uniqueIds.length - inserted.length - blockedIds.size,
      skippedRemoved: blockedIds.size,
    };
  });
}

/** Confirm only changes anything for a `community` row (drops the label) — an already
 * owner/staff-sourced row is a no-op: no event, no source change. */
export async function confirmCafeGameService(
  cafeId: string,
  gameId: string,
  userId: string,
  source: CafeGameSource,
): Promise<void> {
  await db.transaction(async (tx) => {
    const [existing] = await tx
      .select({ source: cafeGames.source })
      .from(cafeGames)
      .where(and(eq(cafeGames.cafeId, cafeId), eq(cafeGames.gameId, gameId)));
    if (!existing) throw new ApiError('NOT_FOUND', 404, 'Game không có trong kho của quán này');
    if (existing.source !== 'community') return;

    const updated = await tx
      .update(cafeGames)
      .set({ source })
      .where(and(eq(cafeGames.cafeId, cafeId), eq(cafeGames.gameId, gameId)))
      .returning({ gameId: cafeGames.gameId });
    if (updated.length === 0) return;

    await tx.insert(cafeGameEvents).values({ cafeId, gameId, userId, action: 'confirm', source });
  });
}

export async function adminListContributionsService(
  query: AdminContributionsQuery,
): Promise<AdminContributionListResponse> {
  const conditions = [eq(cafeGameEvents.action, 'add'), eq(cafeGameEvents.source, 'community')];
  if (query.userId) conditions.push(eq(cafeGameEvents.userId, query.userId));
  if (query.cafeId) conditions.push(eq(cafeGameEvents.cafeId, query.cafeId));
  const where = and(...conditions);

  const selection = {
    id: cafeGameEvents.id,
    cafeId: cafeGameEvents.cafeId,
    cafeName: cafes.name,
    gameId: cafeGameEvents.gameId,
    gameNameEn: games.nameEn,
    userId: cafeGameEvents.userId,
    userName: users.name,
    createdAt: cafeGameEvents.createdAt,
  };

  const [rows, totalRows] = await Promise.all([
    db
      .select(selection)
      .from(cafeGameEvents)
      .innerJoin(cafes, eq(cafes.id, cafeGameEvents.cafeId))
      .innerJoin(games, eq(games.id, cafeGameEvents.gameId))
      .leftJoin(users, eq(users.id, cafeGameEvents.userId))
      .where(where)
      .orderBy(desc(cafeGameEvents.createdAt))
      .limit(query.pageSize)
      .offset((query.page - 1) * query.pageSize),
    db.select({ total: count() }).from(cafeGameEvents).where(where),
  ]);

  return {
    items: rows.map((row) => ({ ...row, createdAt: row.createdAt.toISOString() })),
    page: query.page,
    pageSize: query.pageSize,
    total: totalRows[0]?.total ?? 0,
  };
}

export async function adminBlockContributionsService(
  targetUserId: string,
  actorUserId: string,
): Promise<void> {
  await db.transaction(async (tx) => {
    const updated = await tx
      .update(users)
      .set({ contributionBlockedAt: new Date() })
      .where(eq(users.id, targetUserId))
      .returning({ id: users.id });
    if (updated.length === 0) throw new ApiError('NOT_FOUND', 404, 'Không tìm thấy người dùng');

    await tx.insert(adminAuditLog).values({
      actorUserId,
      action: 'cafe_contribution.block',
      targetType: 'user',
      targetId: targetUserId,
    });
  });
}

export async function adminUnblockContributionsService(
  targetUserId: string,
  actorUserId: string,
): Promise<void> {
  await db.transaction(async (tx) => {
    const updated = await tx
      .update(users)
      .set({ contributionBlockedAt: null })
      .where(eq(users.id, targetUserId))
      .returning({ id: users.id });
    if (updated.length === 0) throw new ApiError('NOT_FOUND', 404, 'Không tìm thấy người dùng');

    await tx.insert(adminAuditLog).values({
      actorUserId,
      action: 'cafe_contribution.unblock',
      targetType: 'user',
      targetId: targetUserId,
    });
  });
}

export async function adminRemoveCommunityGamesService(
  targetUserId: string,
  actorUserId: string,
): Promise<{ removed: number }> {
  return db.transaction(async (tx) => {
    const rows = await tx
      .delete(cafeGames)
      .where(and(eq(cafeGames.source, 'community'), eq(cafeGames.addedBy, targetUserId)))
      .returning({ cafeId: cafeGames.cafeId, gameId: cafeGames.gameId });

    if (rows.length > 0) {
      await tx.insert(cafeGameEvents).values(
        rows.map((row) => ({
          cafeId: row.cafeId,
          gameId: row.gameId,
          userId: actorUserId,
          action: 'remove' as const,
          source: 'staff' as const,
        })),
      );
    }

    await tx.insert(adminAuditLog).values({
      actorUserId,
      action: 'cafe_contribution.remove_all',
      targetType: 'user',
      targetId: targetUserId,
    });

    return { removed: rows.length };
  });
}
