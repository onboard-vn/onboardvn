import type { ShelfAddInput, ShelfCondition } from '@onboard/shared';
import { and, count, desc, eq, max } from 'drizzle-orm';
import { db } from '../../db/client.js';
import { identities, playPlayers, plays, userGames } from '../../db/schema/index.js';
import type { Executor } from '../../lib/visibility.js';

export interface UserGameRow {
  gameId: string;
  note: string | null;
  condition: ShelfCondition | null;
  sleeved: boolean;
  boxProtected: boolean;
  edition: string | null;
  createdAt: Date;
}

const rowColumns = {
  gameId: userGames.gameId,
  note: userGames.note,
  condition: userGames.condition,
  sleeved: userGames.sleeved,
  boxProtected: userGames.boxProtected,
  edition: userGames.edition,
  createdAt: userGames.createdAt,
};

type ShelfFields = Omit<ShelfAddInput, 'gameId'>;

/** Omitted field = keep the stored value on conflict; `null` = clear. */
export async function upsertShelfItem(
  userId: string,
  gameId: string,
  fields: ShelfFields,
): Promise<void> {
  const provided = Object.fromEntries(
    Object.entries({
      note: fields.note,
      condition: fields.condition,
      sleeved: fields.sleeved,
      boxProtected: fields.boxProtected,
      edition: fields.edition,
    }).filter(([, v]) => v !== undefined),
  ) as Partial<typeof userGames.$inferInsert>;
  const insert = db.insert(userGames).values({ userId, gameId, ...provided });
  if (Object.keys(provided).length === 0) {
    await insert.onConflictDoNothing();
    return;
  }
  await insert.onConflictDoUpdate({
    target: [userGames.userId, userGames.gameId],
    set: provided,
  });
}

export async function deleteShelfItem(userId: string, gameId: string): Promise<boolean> {
  const rows = await db
    .delete(userGames)
    .where(and(eq(userGames.userId, userId), eq(userGames.gameId, gameId)))
    .returning({ gameId: userGames.gameId });
  return rows.length > 0;
}

export async function findShelfItem(
  userId: string,
  gameId: string,
): Promise<UserGameRow | undefined> {
  const [row] = await db
    .select(rowColumns)
    .from(userGames)
    .where(and(eq(userGames.userId, userId), eq(userGames.gameId, gameId)))
    .limit(1);
  return row;
}

export async function listShelfItems(userId: string): Promise<UserGameRow[]> {
  return db
    .select(rowColumns)
    .from(userGames)
    .where(eq(userGames.userId, userId))
    .orderBy(desc(userGames.createdAt));
}

export async function countOwners(gameId: string, executor: Executor = db): Promise<number> {
  const [row] = await executor
    .select({ value: count() })
    .from(userGames)
    .where(eq(userGames.gameId, gameId));
  return row?.value ?? 0;
}

export async function lastPlayedByGame(userId: string): Promise<Map<string, Date>> {
  const rows = await db
    .select({ gameId: plays.gameId, lastPlayedAt: max(plays.startedAt) })
    .from(plays)
    .innerJoin(playPlayers, eq(playPlayers.playId, plays.id))
    .innerJoin(identities, eq(identities.id, playPlayers.identityId))
    .innerJoin(userGames, and(eq(userGames.gameId, plays.gameId), eq(userGames.userId, userId)))
    .where(and(eq(identities.userId, userId), eq(identities.kind, 'member')))
    .groupBy(plays.gameId);
  return new Map(
    rows.flatMap((r) => (r.lastPlayedAt ? [[r.gameId, r.lastPlayedAt] as const] : [])),
  );
}
