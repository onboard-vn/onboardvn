import { and, eq, inArray } from 'drizzle-orm';
import {
  clubExternalMembers,
  clubExternalOwnerships,
  gameExternalMetadata,
  games,
} from '../../db/schema/index.js';
import { slugify } from '../../modules/games/slug.js';
import { chunked, dedupe, stableJson, type SyncContext } from './context.js';
import type { ExternalGame, ExternalMember } from './types.js';

export async function syncMembers(
  ctx: SyncContext,
  members: ExternalMember[],
  loginIds: Map<string, string>,
): Promise<void> {
  const { tx, club, report } = ctx;
  const existing = await tx
    .select()
    .from(clubExternalMembers)
    .where(eq(clubExternalMembers.clubId, club.id));
  const byExternalId = new Map(existing.map((row) => [row.externalId, row]));

  for (const dto of dedupe(members, (m) => m.externalId)) {
    const loginId = dto.loginId ?? loginIds.get(dto.externalId);
    const row = byExternalId.get(dto.externalId);
    if (!row) {
      const [created] = await tx
        .insert(clubExternalMembers)
        .values({
          clubId: club.id,
          externalId: dto.externalId,
          nickname: dto.nickname,
          stats: dto.stats,
          externalLoginId: loginId ?? null,
        })
        .returning({ id: clubExternalMembers.id });
      ctx.members.set(dto.externalId, { id: created!.id, userId: null });
      report.members.created++;
      continue;
    }
    ctx.members.set(dto.externalId, { id: row.id, userId: row.userId });
    const changes: Partial<typeof clubExternalMembers.$inferInsert> = {};
    if (row.nickname !== dto.nickname) changes.nickname = dto.nickname;
    if (stableJson(row.stats) !== stableJson(dto.stats)) changes.stats = dto.stats;
    if (loginId && row.externalLoginId !== loginId) changes.externalLoginId = loginId;
    if (Object.keys(changes).length === 0) {
      report.members.unchanged++;
      continue;
    }
    await tx.update(clubExternalMembers).set(changes).where(eq(clubExternalMembers.id, row.id));
    report.members.updated++;
  }
}

const slugFor = (game: ExternalGame) => slugify(game.name) || `game-${game.externalId}`;

export async function syncGames(ctx: SyncContext, input: ExternalGame[]): Promise<void> {
  const { tx, source, report } = ctx;
  const list = dedupe(input, (g) => g.externalId);

  const mapped = new Map(
    (
      await tx
        .select({
          externalId: gameExternalMetadata.externalId,
          gameId: gameExternalMetadata.gameId,
        })
        .from(gameExternalMetadata)
        .where(eq(gameExternalMetadata.source, source))
    ).map((row) => [row.externalId, row.gameId]),
  );
  const bggIds = list.flatMap((g) => (g.bggId ? [g.bggId] : []));
  const byBgg = new Map<number, string>();
  for (const part of chunked(bggIds)) {
    const rows = await tx
      .select({ id: games.id, bggId: games.bggId })
      .from(games)
      .where(inArray(games.bggId, part));
    for (const row of rows) byBgg.set(row.bggId!, row.id);
  }
  const bySlug = new Map<string, string>();
  for (const part of chunked(list.map(slugFor))) {
    const rows = await tx
      .select({ id: games.id, slug: games.slug })
      .from(games)
      .where(inArray(games.slug, part));
    for (const row of rows) bySlug.set(row.slug, row.id);
  }

  for (const dto of list) {
    let gameId = mapped.get(dto.externalId);
    if (gameId) {
      report.games.unchanged++;
    } else {
      const slug = slugFor(dto);
      gameId = (dto.bggId ? byBgg.get(dto.bggId) : undefined) ?? bySlug.get(slug);
      if (gameId) {
        report.games.linked++;
      } else {
        const [created] = await tx
          .insert(games)
          .values({
            slug,
            nameEn: dto.name,
            bggId: dto.bggId ?? null,
            minPlayers: dto.minPlayers ?? null,
            maxPlayers: dto.maxPlayers ?? null,
            playMinutes: dto.playMinutes ?? null,
          })
          .returning({ id: games.id });
        gameId = created!.id;
        bySlug.set(slug, gameId);
        report.games.created++;
      }
      await tx
        .insert(gameExternalMetadata)
        .values({
          gameId,
          source,
          externalId: dto.externalId,
          payload: { name: dto.name, year: dto.year ?? null },
          fetchedAt: new Date(),
        })
        .onConflictDoNothing();
    }
    ctx.gameIds.set(dto.externalId, gameId);
  }

  await syncOwnerships(ctx, list);
}

async function syncOwnerships(ctx: SyncContext, list: ExternalGame[]): Promise<void> {
  const { tx, club, report } = ctx;
  const desired = new Map<string, { gameId: string; externalMemberId: string }>();
  for (const dto of list) {
    for (const owner of dto.owners) {
      const member = ctx.members.get(owner.externalMemberId);
      const gameId = ctx.gameIds.get(dto.externalId);
      if (!member || !gameId) {
        report.unknownMemberRefs++;
        continue;
      }
      desired.set(`${gameId}|${member.id}`, { gameId, externalMemberId: member.id });
    }
  }

  const existing = await tx
    .select()
    .from(clubExternalOwnerships)
    .where(eq(clubExternalOwnerships.clubId, club.id));
  const existingKeys = new Set(existing.map((r) => `${r.gameId}|${r.externalMemberId}`));

  const toAdd = [...desired.entries()].filter(([key]) => !existingKeys.has(key)).map(([, v]) => v);
  for (const part of chunked(toAdd)) {
    await tx.insert(clubExternalOwnerships).values(part.map((v) => ({ clubId: club.id, ...v })));
  }
  report.ownerships.added += toAdd.length;

  for (const row of existing.filter((r) => !desired.has(`${r.gameId}|${r.externalMemberId}`))) {
    await tx
      .delete(clubExternalOwnerships)
      .where(
        and(
          eq(clubExternalOwnerships.clubId, club.id),
          eq(clubExternalOwnerships.gameId, row.gameId),
          eq(clubExternalOwnerships.externalMemberId, row.externalMemberId),
        ),
      );
    report.ownerships.removed++;
  }
}
