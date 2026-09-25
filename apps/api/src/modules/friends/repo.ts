import type { FriendSummary, PrivacyLevel } from '@onboard/shared';
import { and, count, desc, eq, or, sql } from 'drizzle-orm';
import { db } from '../../db/client.js';
import { friendRequests, friendships, userBlocks, users } from '../../db/schema/index.js';
import { orderPair, type Executor } from '../../lib/visibility.js';

/** Serializes concurrent writers for the same pair (e.g. A->B and B->A sent at once); must run inside `db.transaction`, the lock releases on commit/rollback. */
export async function lockPair(tx: Executor, userId: string, otherId: string): Promise<void> {
  const [userA, userB] = orderPair(userId, otherId);
  await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${`${userA}:${userB}`}, 0))`);
}

const FRIEND_SUMMARY_COLUMNS = {
  id: users.id,
  username: users.username,
  displayUsername: users.displayUsername,
  name: users.name,
  image: users.image,
} as const;

export interface UserPrivacyRow {
  id: string;
  username: string | null;
  name: string;
  friendCode: string;
  profileVisibility: PrivacyLevel;
  playsVisibility: PrivacyLevel;
  friendsVisibility: PrivacyLevel;
  emailOnFriendRequest: boolean;
  email: string;
}

export async function findUserByUsername(username: string) {
  const [row] = await db
    .select({ id: users.id, username: users.username })
    .from(users)
    .where(eq(users.username, username))
    .limit(1);
  return row;
}

export async function findUserByFriendCode(code: string) {
  const [row] = await db
    .select({ ...FRIEND_SUMMARY_COLUMNS })
    .from(users)
    .where(eq(users.friendCode, code))
    .limit(1);
  return row;
}

export async function getUserPrivacy(userId: string): Promise<UserPrivacyRow | undefined> {
  const [row] = await db
    .select({
      id: users.id,
      username: users.username,
      name: users.name,
      friendCode: users.friendCode,
      profileVisibility: users.profileVisibility,
      playsVisibility: users.playsVisibility,
      friendsVisibility: users.friendsVisibility,
      emailOnFriendRequest: users.emailOnFriendRequest,
      email: users.email,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  return row;
}

export async function rotateFriendCode(userId: string, code: string): Promise<void> {
  await db.update(users).set({ friendCode: code }).where(eq(users.id, userId));
}

export async function updatePrivacy(
  userId: string,
  input: Partial<{
    profileVisibility: PrivacyLevel;
    playsVisibility: PrivacyLevel;
    friendsVisibility: PrivacyLevel;
    emailOnFriendRequest: boolean;
  }>,
): Promise<void> {
  await db.update(users).set(input).where(eq(users.id, userId));
}

export async function insertFriendship(
  userId: string,
  otherId: string,
  executor: Executor = db,
): Promise<void> {
  const [userA, userB] = orderPair(userId, otherId);
  await executor.insert(friendships).values({ userA, userB }).onConflictDoNothing();
}

export async function deleteFriendship(
  userId: string,
  otherId: string,
  executor: Executor = db,
): Promise<boolean> {
  const [userA, userB] = orderPair(userId, otherId);
  const rows = await executor
    .delete(friendships)
    .where(and(eq(friendships.userA, userA), eq(friendships.userB, userB)))
    .returning({ userA: friendships.userA });
  return rows.length > 0;
}

export async function listFriends(userId: string): Promise<FriendSummary[]> {
  const asA = db
    .select({ ...FRIEND_SUMMARY_COLUMNS })
    .from(friendships)
    .innerJoin(users, eq(users.id, friendships.userB))
    .where(eq(friendships.userA, userId));
  const asB = db
    .select({ ...FRIEND_SUMMARY_COLUMNS })
    .from(friendships)
    .innerJoin(users, eq(users.id, friendships.userA))
    .where(eq(friendships.userB, userId));
  const [rowsA, rowsB] = await Promise.all([asA, asB]);
  return [...rowsA, ...rowsB];
}

export async function findRequest(fromUserId: string, toUserId: string, executor: Executor = db) {
  const [row] = await executor
    .select()
    .from(friendRequests)
    .where(and(eq(friendRequests.fromUserId, fromUserId), eq(friendRequests.toUserId, toUserId)))
    .limit(1);
  return row;
}

export async function insertRequest(
  fromUserId: string,
  toUserId: string,
  executor: Executor = db,
): Promise<void> {
  await executor
    .insert(friendRequests)
    .values({ fromUserId, toUserId, status: 'pending' })
    .onConflictDoNothing();
}

export async function deleteRequest(
  fromUserId: string,
  toUserId: string,
  executor: Executor = db,
): Promise<boolean> {
  const rows = await executor
    .delete(friendRequests)
    .where(and(eq(friendRequests.fromUserId, fromUserId), eq(friendRequests.toUserId, toUserId)))
    .returning({ fromUserId: friendRequests.fromUserId });
  return rows.length > 0;
}

export async function deleteRequestsBetween(
  userId: string,
  otherId: string,
  executor: Executor = db,
): Promise<void> {
  await executor
    .delete(friendRequests)
    .where(
      or(
        and(eq(friendRequests.fromUserId, userId), eq(friendRequests.toUserId, otherId)),
        and(eq(friendRequests.fromUserId, otherId), eq(friendRequests.toUserId, userId)),
      ),
    );
}

export async function markRequestDeclined(fromUserId: string, toUserId: string): Promise<void> {
  await db
    .update(friendRequests)
    .set({ status: 'declined', respondedAt: new Date() })
    .where(and(eq(friendRequests.fromUserId, fromUserId), eq(friendRequests.toUserId, toUserId)));
}

export async function countOutgoingPending(
  userId: string,
  executor: Executor = db,
): Promise<number> {
  const [row] = await executor
    .select({ value: count() })
    .from(friendRequests)
    .where(and(eq(friendRequests.fromUserId, userId), eq(friendRequests.status, 'pending')));
  return row?.value ?? 0;
}

export async function countIncomingPending(userId: string): Promise<number> {
  const [row] = await db
    .select({ value: count() })
    .from(friendRequests)
    .where(and(eq(friendRequests.toUserId, userId), eq(friendRequests.status, 'pending')));
  return row?.value ?? 0;
}

export interface FriendRequestRow {
  fromUserId: string;
  toUserId: string;
  createdAt: Date;
  user: FriendSummary;
}

export async function listRequests(userId: string, dir: 'in' | 'out'): Promise<FriendRequestRow[]> {
  const selfColumn = dir === 'in' ? friendRequests.toUserId : friendRequests.fromUserId;
  const otherColumn = dir === 'in' ? friendRequests.fromUserId : friendRequests.toUserId;
  const rows = await db
    .select({
      fromUserId: friendRequests.fromUserId,
      toUserId: friendRequests.toUserId,
      createdAt: friendRequests.createdAt,
      ...FRIEND_SUMMARY_COLUMNS,
    })
    .from(friendRequests)
    .innerJoin(users, eq(users.id, otherColumn))
    .where(and(eq(selfColumn, userId), eq(friendRequests.status, 'pending')))
    .orderBy(desc(friendRequests.createdAt));
  return rows.map(({ id, username, displayUsername, name, image, ...rest }) => ({
    ...rest,
    user: { id, username, displayUsername, name, image },
  }));
}

export async function insertBlock(
  blockerId: string,
  blockedId: string,
  executor: Executor = db,
): Promise<void> {
  await executor.insert(userBlocks).values({ blockerId, blockedId }).onConflictDoNothing();
}

export async function deleteBlock(blockerId: string, blockedId: string): Promise<void> {
  await db
    .delete(userBlocks)
    .where(and(eq(userBlocks.blockerId, blockerId), eq(userBlocks.blockedId, blockedId)));
}

export async function listBlocks(blockerId: string): Promise<FriendSummary[]> {
  const rows = await db
    .select({ ...FRIEND_SUMMARY_COLUMNS })
    .from(userBlocks)
    .innerJoin(users, eq(users.id, userBlocks.blockedId))
    .where(eq(userBlocks.blockerId, blockerId))
    .orderBy(desc(userBlocks.createdAt));
  return rows;
}
