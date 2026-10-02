import { and, desc, eq } from 'drizzle-orm';
import { db } from '../../db/client.js';
import { userWishlist } from '../../db/schema/index.js';

export interface WishlistRow {
  gameId: string;
  createdAt: Date;
}

export async function insertWishlistItem(userId: string, gameId: string): Promise<boolean> {
  const rows = await db
    .insert(userWishlist)
    .values({ userId, gameId })
    .onConflictDoNothing()
    .returning({ gameId: userWishlist.gameId });
  return rows.length > 0;
}

export async function deleteWishlistItem(userId: string, gameId: string): Promise<void> {
  await db
    .delete(userWishlist)
    .where(and(eq(userWishlist.userId, userId), eq(userWishlist.gameId, gameId)));
}

export function listWishlistItems(userId: string): Promise<WishlistRow[]> {
  return db
    .select({ gameId: userWishlist.gameId, createdAt: userWishlist.createdAt })
    .from(userWishlist)
    .where(eq(userWishlist.userId, userId))
    .orderBy(desc(userWishlist.createdAt), desc(userWishlist.gameId));
}
