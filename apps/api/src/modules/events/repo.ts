import type { MeetupStatus, MeetupVisibility, ParticipantStatus } from '@onboard/shared';
import { and, asc, eq, exists, gte, inArray, lt, or, sql, type SQL } from 'drizzle-orm';
import { db } from '../../db/client.js';
import {
  cafes,
  friendships,
  games,
  meetupParticipants,
  meetups,
  meetupTables,
  userBlocks,
  userGames,
  users,
} from '../../db/schema/index.js';

export type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
export type Executor = Tx | typeof db;

const PUBLIC_USER_COLUMNS = {
  id: users.id,
  username: users.username,
  displayUsername: users.displayUsername,
  name: users.name,
  image: users.image,
  profileVisibility: users.profileVisibility,
} as const;

export interface RawPublicUser {
  id: string;
  username: string | null;
  displayUsername: string | null;
  name: string;
  image: string | null;
  profileVisibility: 'public' | 'friends' | 'private';
}

// ---------------------------------------------------------------------------
// Visibility
// ---------------------------------------------------------------------------

function blockedWithCreator(viewerId: string): SQL {
  return exists(
    db
      .select({ x: sql`1` })
      .from(userBlocks)
      .where(
        or(
          and(eq(userBlocks.blockerId, viewerId), eq(userBlocks.blockedId, meetups.createdBy)),
          and(eq(userBlocks.blockerId, meetups.createdBy), eq(userBlocks.blockedId, viewerId)),
        ),
      ),
  );
}

function friendsWithCreator(viewerId: string): SQL {
  return exists(
    db
      .select({ x: sql`1` })
      .from(friendships)
      .where(
        or(
          and(eq(friendships.userA, viewerId), eq(friendships.userB, meetups.createdBy)),
          and(eq(friendships.userA, meetups.createdBy), eq(friendships.userB, viewerId)),
        ),
      ),
  );
}

function isParticipantSubquery(viewerId: string): SQL {
  return exists(
    db
      .select({ x: sql`1` })
      .from(meetupParticipants)
      .where(
        and(eq(meetupParticipants.meetupId, meetups.id), eq(meetupParticipants.userId, viewerId)),
      ),
  );
}

/** Single predicate reused by list, calendar, `/me/events`: creator + any participant (incl.
 * `invited`) always see it; `public` is open; `friends` requires friendship with the creator;
 * `private` is excluded here (only reachable via `?code=` on the detail route). Either direction
 * of a block hides it. */
export function visibleMeetupsWhere(viewerId: string | null): SQL {
  if (!viewerId) return eq(meetups.visibility, 'public');
  return and(
    sql`not ${blockedWithCreator(viewerId)}`,
    or(
      eq(meetups.createdBy, viewerId),
      isParticipantSubquery(viewerId),
      eq(meetups.visibility, 'public'),
      and(eq(meetups.visibility, 'friends'), friendsWithCreator(viewerId)),
    ),
  )!;
}

/** `/me/events`: only meetups the viewer created or participates in (any status, incl.
 * `invited`/`waitlist`) — no `public`/`friends` open-visibility branch, unlike
 * {@link visibleMeetupsWhere}. A block in either direction still hides it. */
export function myMeetupsWhere(viewerId: string): SQL {
  return and(
    sql`not ${blockedWithCreator(viewerId)}`,
    or(eq(meetups.createdBy, viewerId), isParticipantSubquery(viewerId)),
  )!;
}

/** Batches friendship/block lookups between `viewerId` and `otherIds` into 2 queries instead of
 * one `areFriends`/`isBlocked` pair per user — used to mask participant names by
 * `profileVisibility` without N+1. */
export async function batchRelations(
  viewerId: string | null,
  otherIds: string[],
): Promise<Map<string, { isFriend: boolean; blocked: boolean }>> {
  const ids = [...new Set(otherIds)].filter((id) => id !== viewerId);
  const map = new Map(ids.map((id) => [id, { isFriend: false, blocked: false }]));
  if (!viewerId || ids.length === 0) return map;
  const [friendRows, blockRows] = await Promise.all([
    db
      .select({ userA: friendships.userA, userB: friendships.userB })
      .from(friendships)
      .where(
        or(
          and(eq(friendships.userA, viewerId), inArray(friendships.userB, ids)),
          and(eq(friendships.userB, viewerId), inArray(friendships.userA, ids)),
        ),
      ),
    db
      .select({ blockerId: userBlocks.blockerId, blockedId: userBlocks.blockedId })
      .from(userBlocks)
      .where(
        or(
          and(eq(userBlocks.blockerId, viewerId), inArray(userBlocks.blockedId, ids)),
          and(eq(userBlocks.blockedId, viewerId), inArray(userBlocks.blockerId, ids)),
        ),
      ),
  ]);
  for (const r of friendRows) map.get(r.userA === viewerId ? r.userB : r.userA)!.isFriend = true;
  for (const r of blockRows)
    map.get(r.blockerId === viewerId ? r.blockedId : r.blockerId)!.blocked = true;
  return map;
}

// ---------------------------------------------------------------------------
// Meetups
// ---------------------------------------------------------------------------

export async function slugExists(slug: string, executor: Executor = db): Promise<boolean> {
  const [row] = await executor
    .select({ id: meetups.id })
    .from(meetups)
    .where(eq(meetups.slug, slug))
    .limit(1);
  return Boolean(row);
}

export interface MeetupRow {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  startsAt: Date;
  endsAt: Date | null;
  cafeId: string | null;
  addressLine: string | null;
  provinceCode: string;
  wardCode: string | null;
  capacity: number | null;
  visibility: MeetupVisibility;
  inviteCodeHash: string;
  status: MeetupStatus;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export function findMeetupById(
  id: string,
  executor: Executor = db,
): Promise<MeetupRow | undefined> {
  return executor
    .select()
    .from(meetups)
    .where(eq(meetups.id, id))
    .limit(1)
    .then((rows) => rows[0] as MeetupRow | undefined);
}

export async function findMeetupsByIds(ids: string[]): Promise<Map<string, MeetupRow>> {
  if (ids.length === 0) return new Map();
  const rows = (await db.select().from(meetups).where(inArray(meetups.id, ids))) as MeetupRow[];
  return new Map(rows.map((r) => [r.id, r]));
}

export function findMeetupBySlug(slug: string): Promise<MeetupRow | undefined> {
  return db
    .select()
    .from(meetups)
    .where(eq(meetups.slug, slug))
    .limit(1)
    .then((rows) => rows[0] as MeetupRow | undefined);
}

/** Row-locks the meetup for the duration of an RSVP/capacity transaction. */
export function findMeetupByIdForUpdate(tx: Tx, id: string): Promise<MeetupRow | undefined> {
  return tx
    .select()
    .from(meetups)
    .where(eq(meetups.id, id))
    .for('update')
    .then((rows) => rows[0] as MeetupRow | undefined);
}

export async function insertMeetup(
  values: typeof meetups.$inferInsert,
  executor: Executor = db,
): Promise<MeetupRow> {
  const [row] = await executor.insert(meetups).values(values).returning();
  return row as MeetupRow;
}

export async function updateMeetup(
  id: string,
  values: Partial<typeof meetups.$inferInsert>,
  executor: Executor = db,
): Promise<MeetupRow | undefined> {
  const [row] = await executor.update(meetups).set(values).where(eq(meetups.id, id)).returning();
  return row as MeetupRow | undefined;
}

export interface CafeRef {
  id: string;
  slug: string;
  name: string;
  provinceCode: string;
  wardCode: string;
  consentStatus: string;
}

export function findCafeRef(cafeId: string): Promise<CafeRef | undefined> {
  return db
    .select({
      id: cafes.id,
      slug: cafes.slug,
      name: cafes.name,
      provinceCode: cafes.provinceCode,
      wardCode: cafes.wardCode,
      consentStatus: cafes.consentStatus,
    })
    .from(cafes)
    .where(eq(cafes.id, cafeId))
    .limit(1)
    .then((rows) => rows[0]);
}

export async function findCafeRefsByIds(ids: string[]): Promise<Map<string, CafeRef>> {
  if (ids.length === 0) return new Map();
  const rows = await db
    .select({
      id: cafes.id,
      slug: cafes.slug,
      name: cafes.name,
      provinceCode: cafes.provinceCode,
      wardCode: cafes.wardCode,
      consentStatus: cafes.consentStatus,
    })
    .from(cafes)
    .where(inArray(cafes.id, ids));
  return new Map(rows.map((r) => [r.id, r]));
}

export interface MeetupListFilter {
  where: SQL;
  page: number;
  pageSize: number;
  /** `/me/events`: future meetups first (soonest first), then past ones (most recent first),
   * instead of a single ascending `startsAt` sort where old past meetups would lead. */
  upcomingFirst?: boolean;
}

export async function listMeetupIds({ where, page, pageSize, upcomingFirst }: MeetupListFilter) {
  const orderBy = upcomingFirst
    ? [
        sql`(${meetups.startsAt} < now()) asc`,
        sql`case when ${meetups.startsAt} >= now() then ${meetups.startsAt} end asc`,
        sql`case when ${meetups.startsAt} < now() then ${meetups.startsAt} end desc`,
      ]
    : [asc(meetups.startsAt)];
  const [rows, [{ value: total } = { value: 0 }]] = await Promise.all([
    db
      .select({ id: meetups.id })
      .from(meetups)
      .where(where)
      .orderBy(...orderBy)
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    db
      .select({ value: sql<number>`count(*)::int` })
      .from(meetups)
      .where(where),
  ]);
  return { ids: rows.map((r) => r.id), total };
}

// ---------------------------------------------------------------------------
// Tables
// ---------------------------------------------------------------------------

export interface MeetupTableRow {
  id: string;
  meetupId: string;
  hostUserId: string;
  gameId: string | null;
  seats: number | null;
  broughtByUserId: string | null;
  note: string | null;
  position: number;
  createdAt: Date;
}

export async function isHost(
  meetupId: string,
  userId: string,
  executor: Executor = db,
): Promise<boolean> {
  const [row] = await executor
    .select({ id: meetupTables.id })
    .from(meetupTables)
    .where(and(eq(meetupTables.meetupId, meetupId), eq(meetupTables.hostUserId, userId)))
    .limit(1);
  return Boolean(row);
}

export async function countTables(meetupId: string, executor: Executor = db): Promise<number> {
  const [row] = await executor
    .select({ value: sql<number>`count(*)::int` })
    .from(meetupTables)
    .where(eq(meetupTables.meetupId, meetupId));
  return row?.value ?? 0;
}

export async function nextTablePosition(
  meetupId: string,
  executor: Executor = db,
): Promise<number> {
  const [row] = await executor
    .select({ value: sql<number>`coalesce(max(${meetupTables.position}), 0) + 1` })
    .from(meetupTables)
    .where(eq(meetupTables.meetupId, meetupId));
  return row?.value ?? 1;
}

export async function insertTable(
  values: typeof meetupTables.$inferInsert,
  executor: Executor = db,
): Promise<MeetupTableRow> {
  const [row] = await executor.insert(meetupTables).values(values).returning();
  return row as MeetupTableRow;
}

export function findTableById(
  id: string,
  executor: Executor = db,
): Promise<MeetupTableRow | undefined> {
  return executor
    .select()
    .from(meetupTables)
    .where(eq(meetupTables.id, id))
    .limit(1)
    .then((rows) => rows[0] as MeetupTableRow | undefined);
}

/** Row-locks the table for the duration of a seat/capacity transaction. */
export function findTableByIdForUpdate(tx: Tx, id: string): Promise<MeetupTableRow | undefined> {
  return tx
    .select()
    .from(meetupTables)
    .where(eq(meetupTables.id, id))
    .for('update')
    .then((rows) => rows[0] as MeetupTableRow | undefined);
}

export async function updateTable(
  id: string,
  values: Partial<typeof meetupTables.$inferInsert>,
  executor: Executor = db,
): Promise<MeetupTableRow | undefined> {
  const [row] = await executor
    .update(meetupTables)
    .set(values)
    .where(eq(meetupTables.id, id))
    .returning();
  return row as MeetupTableRow | undefined;
}

export async function deleteTable(id: string, executor: Executor = db): Promise<boolean> {
  const rows = await executor
    .delete(meetupTables)
    .where(eq(meetupTables.id, id))
    .returning({ id: meetupTables.id });
  return rows.length > 0;
}

export async function countSeated(tableId: string, executor: Executor = db): Promise<number> {
  const [row] = await executor
    .select({ value: sql<number>`count(*)::int` })
    .from(meetupParticipants)
    .where(and(eq(meetupParticipants.tableId, tableId), eq(meetupParticipants.status, 'going')));
  return row?.value ?? 0;
}

export interface TableDetailRow {
  id: string;
  seats: number | null;
  note: string | null;
  position: number;
  host: RawPublicUser;
  game: { id: string; slug: string; nameVi: string | null; nameEn: string } | null;
  broughtBy: RawPublicUser | null;
}

export async function listTablesByMeetup(meetupId: string): Promise<TableDetailRow[]> {
  const rows = await db
    .select({
      id: meetupTables.id,
      seats: meetupTables.seats,
      note: meetupTables.note,
      position: meetupTables.position,
      hostId: users.id,
      hostUsername: users.username,
      hostDisplayUsername: users.displayUsername,
      hostName: users.name,
      hostImage: users.image,
      hostProfileVisibility: users.profileVisibility,
      gameId: games.id,
      gameSlug: games.slug,
      gameNameVi: games.nameVi,
      gameNameEn: games.nameEn,
    })
    .from(meetupTables)
    .innerJoin(users, eq(users.id, meetupTables.hostUserId))
    .leftJoin(games, eq(games.id, meetupTables.gameId))
    .where(eq(meetupTables.meetupId, meetupId))
    .orderBy(asc(meetupTables.position));

  const broughtByIds = await db
    .select({
      tableId: meetupTables.id,
      broughtById: users.id,
      username: users.username,
      displayUsername: users.displayUsername,
      name: users.name,
      image: users.image,
      profileVisibility: users.profileVisibility,
    })
    .from(meetupTables)
    .innerJoin(users, eq(users.id, meetupTables.broughtByUserId))
    .where(eq(meetupTables.meetupId, meetupId));
  const broughtByTableId = new Map(broughtByIds.map((r) => [r.tableId, r]));

  return rows.map((r) => {
    const brought = broughtByTableId.get(r.id);
    return {
      id: r.id,
      seats: r.seats,
      note: r.note,
      position: r.position,
      host: {
        id: r.hostId,
        username: r.hostUsername,
        displayUsername: r.hostDisplayUsername,
        name: r.hostName,
        image: r.hostImage,
        profileVisibility: r.hostProfileVisibility,
      },
      game: r.gameId
        ? { id: r.gameId, slug: r.gameSlug!, nameVi: r.gameNameVi ?? null, nameEn: r.gameNameEn! }
        : null,
      broughtBy: brought
        ? {
            id: brought.broughtById,
            username: brought.username,
            displayUsername: brought.displayUsername,
            name: brought.name,
            image: brought.image,
            profileVisibility: brought.profileVisibility,
          }
        : null,
    };
  });
}

export async function listSeatedUsersByTable(
  meetupId: string,
): Promise<Map<string, RawPublicUser[]>> {
  const rows = await db
    .select({ tableId: meetupParticipants.tableId, ...PUBLIC_USER_COLUMNS })
    .from(meetupParticipants)
    .innerJoin(users, eq(users.id, meetupParticipants.userId))
    .where(and(eq(meetupParticipants.meetupId, meetupId), eq(meetupParticipants.status, 'going')));
  const byTable = new Map<string, RawPublicUser[]>();
  for (const row of rows) {
    if (!row.tableId) continue;
    const list = byTable.get(row.tableId) ?? [];
    list.push(row);
    byTable.set(row.tableId, list);
  }
  return byTable;
}

// ---------------------------------------------------------------------------
// Participants
// ---------------------------------------------------------------------------

export interface ParticipantRow {
  meetupId: string;
  userId: string;
  status: ParticipantStatus;
  tableId: string | null;
  waitlistedAt: Date | null;
  respondedAt: Date | null;
}

export function findParticipant(
  meetupId: string,
  userId: string,
  executor: Executor = db,
): Promise<ParticipantRow | undefined> {
  return executor
    .select()
    .from(meetupParticipants)
    .where(and(eq(meetupParticipants.meetupId, meetupId), eq(meetupParticipants.userId, userId)))
    .limit(1)
    .then((rows) => rows[0] as ParticipantRow | undefined);
}

export async function isParticipant(meetupId: string, userId: string): Promise<boolean> {
  const row = await findParticipant(meetupId, userId);
  return Boolean(row);
}

/** Row-locks the participant row for the duration of a seat-claim transaction. */
export function findParticipantForUpdate(
  tx: Tx,
  meetupId: string,
  userId: string,
): Promise<ParticipantRow | undefined> {
  return tx
    .select()
    .from(meetupParticipants)
    .where(and(eq(meetupParticipants.meetupId, meetupId), eq(meetupParticipants.userId, userId)))
    .for('update')
    .then((rows) => rows[0] as ParticipantRow | undefined);
}

export async function upsertParticipant(
  values: typeof meetupParticipants.$inferInsert,
  executor: Executor = db,
): Promise<ParticipantRow> {
  const [row] = await executor
    .insert(meetupParticipants)
    .values(values)
    .onConflictDoUpdate({
      target: [meetupParticipants.meetupId, meetupParticipants.userId],
      set: {
        status: values.status,
        tableId: values.tableId ?? null,
        waitlistedAt: values.waitlistedAt ?? null,
        respondedAt: values.respondedAt ?? null,
      },
    })
    .returning();
  return row as ParticipantRow;
}

/** Inserts the row only if it doesn't already exist — used by invite, which must never downgrade
 * an existing `going`/`maybe`/etc. participant back to `invited`. */
export async function insertParticipantIfAbsent(
  values: typeof meetupParticipants.$inferInsert,
  executor: Executor = db,
): Promise<boolean> {
  const rows = await executor
    .insert(meetupParticipants)
    .values(values)
    .onConflictDoNothing()
    .returning({ userId: meetupParticipants.userId });
  return rows.length > 0;
}

export async function updateParticipant(
  meetupId: string,
  userId: string,
  values: Partial<typeof meetupParticipants.$inferInsert>,
  executor: Executor = db,
): Promise<void> {
  await executor
    .update(meetupParticipants)
    .set(values)
    .where(and(eq(meetupParticipants.meetupId, meetupId), eq(meetupParticipants.userId, userId)));
}

export async function countGoing(
  meetupId: string,
  executor: Executor = db,
  excludeUserId?: string,
): Promise<number> {
  const conditions = [
    eq(meetupParticipants.meetupId, meetupId),
    eq(meetupParticipants.status, 'going'),
  ];
  if (excludeUserId) conditions.push(sql`${meetupParticipants.userId} <> ${excludeUserId}`);
  const [row] = await executor
    .select({ value: sql<number>`count(*)::int` })
    .from(meetupParticipants)
    .where(and(...conditions));
  return row?.value ?? 0;
}

/** FIFO: earliest `waitlistedAt`, tie-broken by `userId`. Row-locked within the caller's
 * transaction so two concurrent seat-frees can't promote the same person twice. */
export function nextWaitlisted(tx: Tx, meetupId: string): Promise<ParticipantRow | undefined> {
  return tx
    .select()
    .from(meetupParticipants)
    .where(
      and(eq(meetupParticipants.meetupId, meetupId), eq(meetupParticipants.status, 'waitlist')),
    )
    .orderBy(asc(meetupParticipants.waitlistedAt), asc(meetupParticipants.userId))
    .limit(1)
    .for('update')
    .then((rows) => rows[0] as ParticipantRow | undefined);
}

export interface ParticipantDetailRow {
  userId: string;
  status: ParticipantStatus;
  tableId: string | null;
}

export function listParticipants(meetupId: string): Promise<ParticipantDetailRow[]> {
  return db
    .select({
      userId: meetupParticipants.userId,
      status: meetupParticipants.status,
      tableId: meetupParticipants.tableId,
    })
    .from(meetupParticipants)
    .where(eq(meetupParticipants.meetupId, meetupId));
}

export async function countDistinctGoingByMeetupIds(
  meetupIds: string[],
): Promise<Map<string, number>> {
  if (meetupIds.length === 0) return new Map();
  const rows = await db
    .select({
      meetupId: meetupParticipants.meetupId,
      value: sql<number>`count(distinct ${meetupParticipants.userId})::int`,
    })
    .from(meetupParticipants)
    .where(
      and(inArray(meetupParticipants.meetupId, meetupIds), eq(meetupParticipants.status, 'going')),
    )
    .groupBy(meetupParticipants.meetupId);
  return new Map(rows.map((r) => [r.meetupId, r.value]));
}

// ---------------------------------------------------------------------------
// Brought-from-shelf validation
// ---------------------------------------------------------------------------

export async function userOwnsGame(userId: string, gameId: string): Promise<boolean> {
  const [row] = await db
    .select({ userId: userGames.userId })
    .from(userGames)
    .where(and(eq(userGames.userId, userId), eq(userGames.gameId, gameId)))
    .limit(1);
  return Boolean(row);
}

// ---------------------------------------------------------------------------
// Public user summary
// ---------------------------------------------------------------------------

export function findPublicUser(userId: string): Promise<RawPublicUser | undefined> {
  return db
    .select({ ...PUBLIC_USER_COLUMNS })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1)
    .then((rows) => rows[0]);
}

export async function findPublicUsersByIds(ids: string[]): Promise<Map<string, RawPublicUser>> {
  if (ids.length === 0) return new Map();
  const rows = await db
    .select({ ...PUBLIC_USER_COLUMNS })
    .from(users)
    .where(inArray(users.id, [...new Set(ids)]));
  return new Map(rows.map((r) => [r.id, r]));
}

// ---------------------------------------------------------------------------
// Calendar
// ---------------------------------------------------------------------------

export interface CalendarRow {
  date: string;
  players: number;
  tables: number;
  meetupIds: string[];
}

export async function calendarAggregate(
  viewerId: string | null,
  start: Date,
  end: Date,
): Promise<CalendarRow[]> {
  const dayExpr = sql<string>`to_char(${meetups.startsAt} at time zone 'Asia/Saigon', 'YYYY-MM-DD')`;
  const where = and(
    eq(meetups.status, 'scheduled'),
    gte(meetups.startsAt, start),
    lt(meetups.startsAt, end),
    visibleMeetupsWhere(viewerId),
  );
  const rows = await db
    .select({
      date: dayExpr,
      players: sql<number>`count(distinct ${meetupParticipants.userId}) filter (where ${meetupParticipants.status} = 'going')::int`,
      tables: sql<number>`count(distinct ${meetupTables.id})::int`,
      meetupIds: sql<string[]>`array_remove(array_agg(distinct ${meetups.id}), null)`,
    })
    .from(meetups)
    .leftJoin(meetupParticipants, eq(meetupParticipants.meetupId, meetups.id))
    .leftJoin(meetupTables, eq(meetupTables.meetupId, meetups.id))
    .where(where)
    .groupBy(dayExpr)
    .orderBy(asc(dayExpr));
  return rows;
}

// ---------------------------------------------------------------------------
// User deletion support
// ---------------------------------------------------------------------------

/** Meetup ids where `userId` currently sits with status `going` — captured before the row is
 * cascade-deleted so the freed seat(s) can be promoted from the waitlist afterwards. */
export async function goingMeetupIdsForUser(userId: string): Promise<string[]> {
  const rows = await db
    .select({ meetupId: meetupParticipants.meetupId })
    .from(meetupParticipants)
    .where(and(eq(meetupParticipants.userId, userId), eq(meetupParticipants.status, 'going')));
  return rows.map((r) => r.meetupId);
}
