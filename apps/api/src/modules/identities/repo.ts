import { and, asc, eq, inArray, isNull, notExists, or, sql, type SQL } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { db } from '../../db/client.js';
import {
  clubMembers,
  identities,
  meetupParticipants,
  meetups,
  meetupTableIdentities,
  meetupTables,
  users,
} from '../../db/schema/index.js';

export type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
export type Executor = Tx | typeof db;
export type IdentityRow = typeof identities.$inferSelect;

export interface IdentityViewRow extends IdentityRow {
  user: {
    name: string;
    username: string | null;
    image: string | null;
    profileVisibility: 'public' | 'friends' | 'private';
  } | null;
  inviterUserId: string | null;
}

const inviter = alias(identities, 'inviter');

const viewColumns = {
  identity: identities,
  userName: users.name,
  username: users.username,
  image: users.image,
  profileVisibility: users.profileVisibility,
  inviterUserId: inviter.userId,
} as const;

type RawViewRow = {
  identity: IdentityRow;
  userName: string | null;
  username: string | null;
  image: string | null;
  profileVisibility: 'public' | 'friends' | 'private' | null;
  inviterUserId: string | null;
};

const toViewRow = (r: RawViewRow): IdentityViewRow => ({
  ...r.identity,
  user:
    r.userName !== null && r.profileVisibility !== null
      ? {
          name: r.userName,
          username: r.username,
          image: r.image,
          profileVisibility: r.profileVisibility,
        }
      : null,
  inviterUserId: r.inviterUserId,
});

function viewQuery(executor: Executor) {
  return executor
    .select(viewColumns)
    .from(identities)
    .leftJoin(users, eq(users.id, identities.userId))
    .leftJoin(inviter, eq(inviter.id, identities.invitedByIdentityId));
}

export async function findIdentityViews(
  ids: string[],
  executor: Executor = db,
): Promise<IdentityViewRow[]> {
  if (ids.length === 0) return [];
  const rows = await viewQuery(executor).where(inArray(identities.id, ids));
  return rows.map(toViewRow);
}

export async function findIdentity(id: string, executor: Executor = db) {
  const [row] = await executor.select().from(identities).where(eq(identities.id, id)).limit(1);
  return row;
}

export async function lockIdentity(tx: Tx, id: string) {
  const [row] = await tx.select().from(identities).where(eq(identities.id, id)).for('update');
  return row;
}

export async function getOrCreateMemberIdentity(
  userId: string,
  executor: Executor = db,
): Promise<IdentityRow> {
  const [user] = await executor
    .select({ name: users.name })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  await executor
    .insert(identities)
    .values({ kind: 'member', userId, displayName: user?.name ?? 'Người chơi' })
    .onConflictDoNothing();
  const [row] = await executor
    .select()
    .from(identities)
    .where(and(eq(identities.kind, 'member'), eq(identities.userId, userId)))
    .limit(1);
  return row!;
}

/** Bulk variant: returns userId -> identity id. */
export async function ensureMemberIdentities(
  userIds: string[],
  executor: Executor = db,
): Promise<Map<string, string>> {
  const unique = [...new Set(userIds)];
  if (unique.length === 0) return new Map();
  await executor.execute(sql`
    insert into identities (kind, user_id, display_name)
    select 'member', u.id, u.name from users u
    where u.id in (${sql.join(
      unique.map((id) => sql`${id}`),
      sql`, `,
    )})
    on conflict do nothing`);
  const rows = await executor
    .select({ id: identities.id, userId: identities.userId })
    .from(identities)
    .where(and(eq(identities.kind, 'member'), inArray(identities.userId, unique)));
  return new Map(rows.map((r) => [r.userId!, r.id]));
}

export async function adminClubIds(userId: string, executor: Executor = db): Promise<Set<string>> {
  const rows = await executor
    .select({ clubId: clubMembers.clubId })
    .from(clubMembers)
    .where(and(eq(clubMembers.userId, userId), inArray(clubMembers.role, ['owner', 'admin'])));
  return new Set(rows.map((r) => r.clubId));
}

export async function isClubAdmin(
  clubId: string | null,
  userId: string,
  executor: Executor = db,
): Promise<boolean> {
  if (!clubId) return false;
  return (await adminClubIds(userId, executor)).has(clubId);
}

export async function listClubIdentities(
  clubId: string,
  q: string | undefined,
  limit: number,
): Promise<IdentityViewRow[]> {
  const clubUserIds = db
    .select({ id: clubMembers.userId })
    .from(clubMembers)
    .where(eq(clubMembers.clubId, clubId));
  const nameExpr = sql<string>`coalesce(${users.name}, ${identities.displayName})`;
  const clauses: SQL[] = [
    isNull(identities.claimedAt),
    or(
      and(eq(identities.kind, 'member'), inArray(identities.userId, clubUserIds)),
      and(
        eq(identities.clubId, clubId),
        or(
          isNull(identities.userId),
          notExists(
            db
              .select()
              .from(clubMembers)
              .where(
                and(eq(clubMembers.clubId, clubId), eq(clubMembers.userId, identities.userId)),
              ),
          ),
        ),
      ),
    )!,
  ];
  if (q) {
    const escaped = q.replace(/[\\%_]/g, (m) => `\\${m}`);
    clauses.push(sql`${nameExpr} ilike ${`%${escaped}%`}`);
  }
  const rows = await viewQuery(db)
    .where(and(...clauses))
    .orderBy(asc(nameExpr), asc(identities.id))
    .limit(limit);
  return rows.map(toViewRow);
}

export async function ensureClubMemberIdentities(clubId: string): Promise<void> {
  const rows = await db
    .select({ userId: clubMembers.userId })
    .from(clubMembers)
    .where(eq(clubMembers.clubId, clubId));
  await ensureMemberIdentities(rows.map((r) => r.userId));
}

/** User seats (going participants) and non-user seats of the given tables, as identity ids. */
export async function seatedIdentityIdsByTable(
  tableIds: string[],
  executor: Executor = db,
): Promise<Map<string, string[]>> {
  const byTable = new Map<string, string[]>(tableIds.map((id) => [id, []]));
  if (tableIds.length === 0) return byTable;
  const userSeats = await executor
    .select({ tableId: meetupParticipants.tableId, userId: meetupParticipants.userId })
    .from(meetupParticipants)
    .where(
      and(inArray(meetupParticipants.tableId, tableIds), eq(meetupParticipants.status, 'going')),
    );
  const memberIds = await ensureMemberIdentities(
    userSeats.map((s) => s.userId),
    executor,
  );
  const otherSeats = await executor
    .select({
      tableId: meetupTableIdentities.tableId,
      identityId: meetupTableIdentities.identityId,
    })
    .from(meetupTableIdentities)
    .where(inArray(meetupTableIdentities.tableId, tableIds));
  const push = (tableId: string, identityId: string) => {
    const list = byTable.get(tableId)!;
    if (!list.includes(identityId)) list.push(identityId);
  };
  for (const s of userSeats) if (s.tableId) push(s.tableId, memberIds.get(s.userId)!);
  for (const s of otherSeats) push(s.tableId, s.identityId);
  return byTable;
}

export async function countSeats(tableId: string, executor: Executor = db): Promise<number> {
  return (await seatedIdentityIdsByTable([tableId], executor)).get(tableId)!.length;
}

export interface TableContext {
  id: string;
  meetupId: string;
  hostUserId: string;
  seats: number | null;
  clubId: string | null;
}

export async function findTableContext(
  tableId: string,
  executor: Executor = db,
): Promise<TableContext | undefined> {
  const [row] = await executor
    .select({
      id: meetupTables.id,
      meetupId: meetupTables.meetupId,
      hostUserId: meetupTables.hostUserId,
      seats: meetupTables.seats,
      clubId: meetups.clubId,
    })
    .from(meetupTables)
    .innerJoin(meetups, eq(meetups.id, meetupTables.meetupId))
    .where(eq(meetupTables.id, tableId))
    .limit(1);
  return row;
}

export async function isSeatedUser(
  tableId: string,
  userId: string,
  executor: Executor = db,
): Promise<boolean> {
  const [row] = await executor
    .select({ userId: meetupParticipants.userId })
    .from(meetupParticipants)
    .where(
      and(
        eq(meetupParticipants.tableId, tableId),
        eq(meetupParticipants.userId, userId),
        eq(meetupParticipants.status, 'going'),
      ),
    )
    .limit(1);
  return Boolean(row);
}
