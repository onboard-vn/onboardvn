import type { ClubRole } from '@onboard/shared';
import { and, asc, count, desc, eq, inArray, isNull, sql } from 'drizzle-orm';
import { db } from '../../db/client.js';
import {
  clubExternalMembers,
  clubLinkAttempts,
  clubMembers,
  clubs,
  identities,
  meetups,
  users,
} from '../../db/schema/index.js';
import { digestLoginId } from '../../lib/login-digest.js';

export type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
export type Executor = Tx | typeof db;

export type ClubRow = typeof clubs.$inferSelect;

export interface MemberUserRow {
  userId: string;
  role: ClubRole;
  joinedAt: Date;
  username: string | null;
  displayUsername: string | null;
  name: string;
  image: string | null;
  profileVisibility: 'public' | 'friends' | 'private';
}

export async function insertClub(
  values: typeof clubs.$inferInsert,
  executor: Executor = db,
): Promise<ClubRow> {
  const [row] = await executor.insert(clubs).values(values).returning();
  return row!;
}

export async function findClubBySlug(slug: string): Promise<ClubRow | undefined> {
  const [row] = await db.select().from(clubs).where(eq(clubs.slug, slug)).limit(1);
  return row;
}

export async function findClubById(id: string, executor: Executor = db) {
  const [row] = await executor.select().from(clubs).where(eq(clubs.id, id)).limit(1);
  return row;
}

export async function findClubByInviteHash(
  hash: string,
  executor: Executor = db,
): Promise<ClubRow | undefined> {
  const [row] = await executor
    .select()
    .from(clubs)
    .where(eq(clubs.inviteCodeHash, hash))
    .limit(1);
  return row;
}

export async function lockClub(tx: Tx, id: string): Promise<ClubRow | undefined> {
  const [row] = await tx.select().from(clubs).where(eq(clubs.id, id)).for('update');
  return row;
}

export async function updateClub(
  id: string,
  values: Partial<typeof clubs.$inferInsert>,
  executor: Executor = db,
): Promise<ClubRow | undefined> {
  const [row] = await executor.update(clubs).set(values).where(eq(clubs.id, id)).returning();
  return row;
}

/** Club-visibility meetups become `private` first: the `club_id` FK nulls on delete and would
 * otherwise violate the visibility check. */
export async function deleteClub(tx: Tx, id: string): Promise<void> {
  await tx
    .update(meetups)
    .set({ visibility: 'private' })
    .where(and(eq(meetups.clubId, id), eq(meetups.visibility, 'club')));
  await tx.delete(clubs).where(eq(clubs.id, id));
}

export async function countMembers(clubId: string): Promise<number> {
  const [row] = await db
    .select({ value: count() })
    .from(clubMembers)
    .where(eq(clubMembers.clubId, clubId));
  return row?.value ?? 0;
}

export async function memberCountsByClubIds(ids: string[]): Promise<Map<string, number>> {
  if (ids.length === 0) return new Map();
  const rows = await db
    .select({ clubId: clubMembers.clubId, value: count() })
    .from(clubMembers)
    .where(inArray(clubMembers.clubId, ids))
    .groupBy(clubMembers.clubId);
  return new Map(rows.map((r) => [r.clubId, r.value]));
}

export async function listClubsForUser(userId: string) {
  return db
    .select({
      id: clubs.id,
      slug: clubs.slug,
      name: clubs.name,
      myRole: clubMembers.role,
    })
    .from(clubMembers)
    .innerJoin(clubs, eq(clubs.id, clubMembers.clubId))
    .where(eq(clubMembers.userId, userId))
    .orderBy(asc(clubs.name));
}

export async function listAllClubs() {
  return db
    .select({
      id: clubs.id,
      slug: clubs.slug,
      name: clubs.name,
      visibility: clubs.visibility,
      createdAt: clubs.createdAt,
      memberCount: sql<number>`(select count(*)::int from ${clubMembers} where ${clubMembers.clubId} = ${clubs.id})`,
    })
    .from(clubs)
    .orderBy(desc(clubs.createdAt))
    .limit(200);
}

export async function findMember(clubId: string, userId: string, executor: Executor = db) {
  const [row] = await executor
    .select({ role: clubMembers.role, joinedAt: clubMembers.joinedAt })
    .from(clubMembers)
    .where(and(eq(clubMembers.clubId, clubId), eq(clubMembers.userId, userId)))
    .limit(1);
  return row;
}

export async function isClubMember(clubId: string, userId: string): Promise<boolean> {
  return Boolean(await findMember(clubId, userId));
}

export async function insertMember(
  values: typeof clubMembers.$inferInsert,
  executor: Executor = db,
): Promise<boolean> {
  const rows = await executor
    .insert(clubMembers)
    .values(values)
    .onConflictDoNothing()
    .returning({ userId: clubMembers.userId });
  return rows.length > 0;
}

export async function updateMemberRole(
  clubId: string,
  userId: string,
  role: ClubRole,
  executor: Executor = db,
): Promise<void> {
  await executor
    .update(clubMembers)
    .set({ role })
    .where(and(eq(clubMembers.clubId, clubId), eq(clubMembers.userId, userId)));
}

export async function deleteMember(
  clubId: string,
  userId: string,
  executor: Executor = db,
): Promise<void> {
  await executor
    .delete(clubMembers)
    .where(and(eq(clubMembers.clubId, clubId), eq(clubMembers.userId, userId)));
}

export async function listMembers(clubId: string): Promise<MemberUserRow[]> {
  const rank = sql`case ${clubMembers.role} when 'owner' then 0 when 'admin' then 1 else 2 end`;
  return db
    .select({
      userId: users.id,
      role: clubMembers.role,
      joinedAt: clubMembers.joinedAt,
      username: users.username,
      displayUsername: users.displayUsername,
      name: users.name,
      image: users.image,
      profileVisibility: users.profileVisibility,
    })
    .from(clubMembers)
    .innerJoin(users, eq(users.id, clubMembers.userId))
    .where(eq(clubMembers.clubId, clubId))
    .orderBy(rank, asc(clubMembers.joinedAt));
}

/** Longest-standing admin first, then longest-standing member. */
export async function findSuccessor(tx: Tx, clubId: string, excludeUserId: string) {
  const rank = sql`case ${clubMembers.role} when 'admin' then 0 else 1 end`;
  const [row] = await tx
    .select({ userId: clubMembers.userId })
    .from(clubMembers)
    .where(and(eq(clubMembers.clubId, clubId), sql`${clubMembers.userId} <> ${excludeUserId}`))
    .orderBy(rank, asc(clubMembers.joinedAt))
    .limit(1);
  return row?.userId;
}

export async function ownedClubIds(userId: string): Promise<string[]> {
  const rows = await db
    .select({ clubId: clubMembers.clubId })
    .from(clubMembers)
    .where(and(eq(clubMembers.userId, userId), eq(clubMembers.role, 'owner')));
  return rows.map((r) => r.clubId);
}

const EXTERNAL_MEMBER_DTO_COLUMNS = {
  id: clubExternalMembers.id,
  externalId: clubExternalMembers.externalId,
  nickname: clubExternalMembers.nickname,
  stats: clubExternalMembers.stats,
  linkedUserId: clubExternalMembers.userId,
} as const;

export function listExternalMembers(clubId: string) {
  return db
    .select(EXTERNAL_MEMBER_DTO_COLUMNS)
    .from(clubExternalMembers)
    .where(eq(clubExternalMembers.clubId, clubId))
    .orderBy(asc(clubExternalMembers.nickname));
}

export async function findExternalMatches(tx: Tx, clubId: string, input: string) {
  const loginDigest = digestLoginId(input);
  return tx
    .select({ id: clubExternalMembers.id, userId: clubExternalMembers.userId })
    .from(clubExternalMembers)
    .where(
      and(
        eq(clubExternalMembers.clubId, clubId),
        eq(clubExternalMembers.externalLoginDigest, loginDigest),
      ),
    )
    .limit(2);
}

export async function bindExternalMember(tx: Tx, id: string, userId: string): Promise<boolean> {
  const [member] = await tx
    .select({
      clubId: clubExternalMembers.clubId,
      externalId: clubExternalMembers.externalId,
      userId: clubExternalMembers.userId,
    })
    .from(clubExternalMembers)
    .where(eq(clubExternalMembers.id, id))
    .for('update');
  if (!member) return false;
  if (member.userId !== null && member.userId !== userId) return false;

  if (member.userId === null) {
    const [existingLink] = await tx
      .select({ id: clubExternalMembers.id })
      .from(clubExternalMembers)
      .where(
        and(
          eq(clubExternalMembers.clubId, member.clubId),
          eq(clubExternalMembers.userId, userId),
        ),
      )
      .limit(1);
    if (existingLink) return false;

    const rows = await tx
      .update(clubExternalMembers)
      .set({ userId })
      .where(and(eq(clubExternalMembers.id, id), isNull(clubExternalMembers.userId)))
      .returning({ id: clubExternalMembers.id });
    if (rows.length === 0) return false;
  }

  await setExternalIdentityUser(tx, member.clubId, member.externalId, userId);
  return true;
}

export async function lockLinkAttemptScopes(tx: Tx, scopeKeys: string[], now: Date) {
  await tx
    .insert(clubLinkAttempts)
    .values(
      scopeKeys.map((scopeKey) => ({
        scopeKey,
        failures: 0,
        windowStartedAt: now,
        lockedUntil: null,
        updatedAt: now,
      })),
    )
    .onConflictDoNothing();

  return tx
    .select()
    .from(clubLinkAttempts)
    .where(inArray(clubLinkAttempts.scopeKey, scopeKeys))
    .orderBy(asc(clubLinkAttempts.scopeKey))
    .for('update');
}

export async function updateLinkAttemptScope(
  tx: Tx,
  scopeKey: string,
  values: Pick<
    typeof clubLinkAttempts.$inferInsert,
    'failures' | 'windowStartedAt' | 'lockedUntil' | 'updatedAt'
  >,
): Promise<void> {
  await tx.update(clubLinkAttempts).set(values).where(eq(clubLinkAttempts.scopeKey, scopeKey));
}

async function setExternalIdentityUser(
  executor: Executor,
  clubId: string,
  externalId: string,
  userId: string | null,
): Promise<void> {
  await executor
    .update(identities)
    .set({ userId })
    .where(
      and(
        eq(identities.kind, 'external'),
        eq(identities.clubId, clubId),
        eq(identities.externalId, externalId),
      ),
    );
}

export async function unlinkExternalMember(clubId: string, memberId: string): Promise<boolean> {
  return db.transaction(async (tx) => {
    const rows = await tx
      .update(clubExternalMembers)
      .set({ userId: null })
      .where(and(eq(clubExternalMembers.id, memberId), eq(clubExternalMembers.clubId, clubId)))
      .returning({ externalId: clubExternalMembers.externalId });
    if (rows[0]) await setExternalIdentityUser(tx, clubId, rows[0].externalId, null);
    return rows.length > 0;
  });
}

export async function findClubRefsByIds(ids: string[]) {
  if (ids.length === 0) return new Map<string, { id: string; slug: string; name: string }>();
  const rows = await db
    .select({ id: clubs.id, slug: clubs.slug, name: clubs.name })
    .from(clubs)
    .where(inArray(clubs.id, ids));
  return new Map(rows.map((r) => [r.id, r]));
}
