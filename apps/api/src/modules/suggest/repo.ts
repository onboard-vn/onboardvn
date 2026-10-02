import type { SuggestQuery } from '@onboard/shared';
import { and, eq, inArray, or, sql, type SQL } from 'drizzle-orm';
import { db } from '../../db/client.js';
import {
  cafeGames,
  cafes,
  clubMembers,
  games,
  userGames,
  userWishlist,
  users,
} from '../../db/schema/index.js';
import { publicCafeWhere } from '../cafes/visibility.js';

export interface PoolCandidate {
  id: string;
  weight: number | null;
}

export interface PoolScope {
  source: SuggestQuery['source'];
  provinceCode?: string;
  cafeId?: string;
  clubId?: string;
  userId?: string;
}

export interface OwnerRow {
  gameId: string;
  userId: string;
  name: string;
  username: string | null;
}

/** Users whose shelf may feed a social source; the caller's own shelf is always allowed. */
function ownerCondition(scope: PoolScope): SQL {
  const me = scope.userId;
  const notBlocked = me
    ? sql`not exists (select 1 from user_blocks b where (b.blocker_id = ${me} and b.blocked_id = ${users.id}) or (b.blocker_id = ${users.id} and b.blocked_id = ${me}))`
    : sql`true`;
  const self = me ? eq(users.id, me) : sql`false`;
  switch (scope.source) {
    case 'club':
      return or(
        self,
        and(
          eq(users.clubShelfSuggest, true),
          notBlocked,
          inArray(
            users.id,
            db
              .select({ id: clubMembers.userId })
              .from(clubMembers)
              .where(eq(clubMembers.clubId, scope.clubId!)),
          ),
        ),
      )!;
    case 'friends':
      return or(
        self,
        and(
          inArray(users.profileVisibility, ['public', 'friends']),
          notBlocked,
          sql`${users.id} in (select user_b from friendships where user_a = ${me} union select user_a from friendships where user_b = ${me})`,
        ),
      )!;
    default:
      return and(
        eq(users.provinceCode, scope.provinceCode!),
        eq(users.profileVisibility, 'public'),
        notBlocked,
      )!;
  }
}

const ownedGameIds = (scope: PoolScope) =>
  db
    .select({ id: userGames.gameId })
    .from(userGames)
    .innerJoin(users, eq(users.id, userGames.userId))
    .where(ownerCondition(scope));

export async function findOwners(scope: PoolScope, gameIds: string[]): Promise<OwnerRow[]> {
  if (gameIds.length === 0) return [];
  return db
    .select({
      gameId: userGames.gameId,
      userId: users.id,
      name: users.name,
      username: users.username,
    })
    .from(userGames)
    .innerJoin(users, eq(users.id, userGames.userId))
    .where(and(ownerCondition(scope), inArray(userGames.gameId, gameIds)));
}

function sourceCondition(scope: PoolScope): SQL | undefined {
  switch (scope.source) {
    case 'province':
      return inArray(
        games.id,
        db
          .select({ id: cafeGames.gameId })
          .from(cafeGames)
          .innerJoin(cafes, eq(cafes.id, cafeGames.cafeId))
          .where(and(publicCafeWhere(), eq(cafes.provinceCode, scope.provinceCode!))),
      );
    case 'cafe':
      return inArray(
        games.id,
        db
          .select({ id: cafeGames.gameId })
          .from(cafeGames)
          .innerJoin(cafes, eq(cafes.id, cafeGames.cafeId))
          .where(and(publicCafeWhere(), eq(cafes.id, scope.cafeId!))),
      );
    case 'shelf':
      return inArray(
        games.id,
        db
          .select({ id: userGames.gameId })
          .from(userGames)
          .where(eq(userGames.userId, scope.userId!)),
      );
    case 'wishlist':
      return inArray(
        games.id,
        db
          .select({ id: userWishlist.gameId })
          .from(userWishlist)
          .where(eq(userWishlist.userId, scope.userId!)),
      );
    case 'club':
    case 'friends':
      return inArray(games.id, ownedGameIds(scope));
    case 'city':
      return or(
        inArray(
          games.id,
          db
            .select({ id: cafeGames.gameId })
            .from(cafeGames)
            .innerJoin(cafes, eq(cafes.id, cafeGames.cafeId))
            .where(and(publicCafeWhere(), eq(cafes.provinceCode, scope.provinceCode!))),
        ),
        inArray(games.id, ownedGameIds(scope)),
      );
    default:
      return undefined;
  }
}

export async function findCandidates(scope: PoolScope, filters: SQL[]): Promise<PoolCandidate[]> {
  const rows = await db
    .select({ id: games.id, weight: games.weight })
    .from(games)
    .where(and(sourceCondition(scope), ...filters));
  return rows.map((r) => ({ id: r.id, weight: r.weight === null ? null : Number(r.weight) }));
}

/** Public cafés per game, nationwide or within a province. */
export async function cafeCountsByGame(provinceCode?: string): Promise<Map<string, number>> {
  const rows = await db
    .select({
      gameId: cafeGames.gameId,
      value: sql<number>`count(distinct ${cafeGames.cafeId})::int`,
    })
    .from(cafeGames)
    .innerJoin(cafes, eq(cafes.id, cafeGames.cafeId))
    .where(and(publicCafeWhere(), provinceCode ? eq(cafes.provinceCode, provinceCode) : undefined))
    .groupBy(cafeGames.gameId);
  return new Map(rows.map((r) => [r.gameId, r.value]));
}

export async function publicCafeExists(cafeId: string): Promise<boolean> {
  const [row] = await db
    .select({ id: cafes.id })
    .from(cafes)
    .where(and(eq(cafes.id, cafeId), publicCafeWhere()))
    .limit(1);
  return Boolean(row);
}
