import type { PrivacyLevel } from '@onboard/shared';
import { and, eq, or } from 'drizzle-orm';
import { db } from '../db/client.js';
import { friendships, userBlocks } from '../db/schema/index.js';

/** Shared shape for `db` or a `db.transaction` callback's `tx`, so callers can compose atomic writes. */
export type Executor = Pick<typeof db, 'insert' | 'delete' | 'update' | 'select' | 'execute'>;

export interface ViewerRelation {
  isSelf: boolean;
  isFriend: boolean;
  blocked: boolean;
}

/** Admin does NOT bypass: this decides visibility on public-facing pages/DTOs only. */
export function canView(level: PrivacyLevel, relation: ViewerRelation): boolean {
  if (relation.blocked) return false;
  if (relation.isSelf) return true;
  if (level === 'public') return true;
  if (level === 'friends') return relation.isFriend;
  return false;
}

/** Friendship rows are stored with `userA < userB`; callers needing that order can reuse this. */
export function orderPair(x: string, y: string): [string, string] {
  return x < y ? [x, y] : [y, x];
}

export async function areFriends(
  userId: string,
  otherId: string,
  executor: Executor = db,
): Promise<boolean> {
  const [userA, userB] = orderPair(userId, otherId);
  const [row] = await executor
    .select({ userA: friendships.userA })
    .from(friendships)
    .where(and(eq(friendships.userA, userA), eq(friendships.userB, userB)))
    .limit(1);
  return !!row;
}

export async function isBlocked(
  userId: string,
  otherId: string,
  executor: Executor = db,
): Promise<boolean> {
  const [row] = await executor
    .select({ blockerId: userBlocks.blockerId })
    .from(userBlocks)
    .where(
      or(
        and(eq(userBlocks.blockerId, userId), eq(userBlocks.blockedId, otherId)),
        and(eq(userBlocks.blockerId, otherId), eq(userBlocks.blockedId, userId)),
      ),
    )
    .limit(1);
  return !!row;
}

export async function loadViewerRelation(
  viewerId: string | null,
  ownerId: string,
): Promise<ViewerRelation> {
  if (!viewerId) return { isSelf: false, isFriend: false, blocked: false };
  if (viewerId === ownerId) return { isSelf: true, isFriend: false, blocked: false };
  const [isFriend, blocked] = await Promise.all([
    areFriends(viewerId, ownerId),
    isBlocked(viewerId, ownerId),
  ]);
  return { isSelf: false, isFriend, blocked };
}
