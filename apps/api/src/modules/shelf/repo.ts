import { and, count, desc, eq } from 'drizzle-orm';
import { db } from '../../db/client.js';
import { userGames } from '../../db/schema/index.js';
import type { Executor } from '../../lib/visibility.js';

export interface UserGameRow {
  gameId: string;
  note: string | null;
  createdAt: Date;
}

/** `note === undefined` means "not provided": inserts as null, but leaves an existing note untouched on conflict. */
export async function upsertShelfItem(
  userId: string,
  gameId: string,
  note: string | null | undefined,
): Promise<void> {
  const values = { userId, gameId, note: note ?? null };
  if (note === undefined) {
    await db.insert(userGames).values(values).onConflictDoNothing();
    return;
  }
  await db
    .insert(userGames)
    .values(values)
    .onConflictDoUpdate({ target: [userGames.userId, userGames.gameId], set: { note } });
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
    .select({ gameId: userGames.gameId, note: userGames.note, createdAt: userGames.createdAt })
    .from(userGames)
    .where(and(eq(userGames.userId, userId), eq(userGames.gameId, gameId)))
    .limit(1);
  return row;
}

export async function listShelfItems(userId: string): Promise<UserGameRow[]> {
  return db
    .select({ gameId: userGames.gameId, note: userGames.note, createdAt: userGames.createdAt })
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
