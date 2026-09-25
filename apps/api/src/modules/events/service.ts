import { createHash, randomBytes } from 'node:crypto';
import type {
  MeetupCalendarDay,
  MeetupCreateInput,
  MeetupCreateResponseDto,
  MeetupDetailDto,
  MeetupFilter,
  MeetupInviteCodeResponse,
  MeetupInviteFriendsInput,
  MeetupListResponse,
  MeetupPublicUser,
  MeetupSummaryDto,
  MeetupTableCreateInput,
  MeetupTableDto,
  MeetupTableUpdateInput,
  MeetupUpdateInput,
  RsvpInput,
} from '@onboard/shared';
import { and, eq, gte } from 'drizzle-orm';
import { db } from '../../db/client.js';
import { meetups } from '../../db/schema/index.js';
import { env } from '../../lib/env.js';
import { ApiError } from '../../lib/errors.js';
import { areFriends, canView, isBlocked } from '../../lib/visibility.js';
import { isPubliclyVisibleCafe } from '../cafes/visibility.js';
import { slugify } from '../games/slug.js';
import * as repo from './repo.js';
import type { MeetupRow, RawPublicUser, Tx } from './repo.js';

const MAX_TABLES_PER_MEETUP = 30;
const UNIQUE_VIOLATION = '23505';
const PAST_SKEW_MS = 5 * 60 * 1000;
const HIDDEN_LOCATION_LABEL = 'Địa điểm đã ẩn';
const ANONYMOUS_USER: MeetupPublicUser = {
  id: '',
  username: null,
  displayUsername: null,
  name: 'Người chơi ẩn danh',
  image: null,
};

function notFound(): never {
  throw new ApiError('NOT_FOUND', 404, 'Không tìm thấy Kèo');
}

function forbidden(message = 'Bạn không có quyền thực hiện thao tác này'): never {
  throw new ApiError('FORBIDDEN', 403, message);
}

function conflict(message: string): never {
  throw new ApiError('CONFLICT', 409, message);
}

function validationFailed(message: string): never {
  throw new ApiError('VALIDATION_FAILED', 422, message);
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function generateInviteToken(): string {
  return randomBytes(24).toString('base64url');
}

function inviteUrlFor(slug: string, token: string): string {
  return `${env.WEB_ORIGIN}/events/join/${token}?slug=${slug}`;
}

function isUniqueViolation(err: unknown): boolean {
  const cause = err && typeof err === 'object' && 'cause' in err ? err.cause : err;
  return Boolean(
    cause && typeof cause === 'object' && 'code' in cause && cause.code === UNIQUE_VIOLATION,
  );
}

// ---------------------------------------------------------------------------
// Visibility
// ---------------------------------------------------------------------------

/** The single per-meetup predicate: creator + any participant (incl. `invited`) always see it;
 * `public` is open; `friends` requires friendship with the creator; `private` requires the
 * detail-only `?code=` to match the stored hash. A block in either direction always hides it. */
export async function canViewMeetup(
  meetup: Pick<MeetupRow, 'id' | 'createdBy' | 'visibility' | 'inviteCodeHash'>,
  viewerId: string | null,
  code?: string,
): Promise<boolean> {
  if (viewerId === meetup.createdBy) return true;
  if (viewerId && (await isBlocked(viewerId, meetup.createdBy))) return false;
  if (viewerId && (await repo.isParticipant(meetup.id, viewerId))) return true;
  if (meetup.visibility === 'public') return true;
  if (meetup.visibility === 'friends') {
    return viewerId ? areFriends(viewerId, meetup.createdBy) : false;
  }
  if (code) return hashToken(code) === meetup.inviteCodeHash;
  return false;
}

// ---------------------------------------------------------------------------
// DTO assembly — participant/host/brought-by/creator names follow each user's own
// `profileVisibility` via `canView(profileVisibility, relation(viewer, user))`; a hidden user
// is rendered as "Người chơi ẩn danh" with no username so no profile link can be built.
// ---------------------------------------------------------------------------

type Relations = Map<string, { isFriend: boolean; blocked: boolean }>;

function maskUser(
  row: RawPublicUser | undefined,
  viewerId: string | null,
  relations: Relations,
): MeetupPublicUser {
  if (!row) return ANONYMOUS_USER;
  const isSelf = viewerId === row.id;
  const relation = relations.get(row.id) ?? { isFriend: false, blocked: false };
  if (
    !canView(row.profileVisibility, {
      isSelf,
      isFriend: relation.isFriend,
      blocked: relation.blocked,
    })
  ) {
    return { ...ANONYMOUS_USER, id: row.id };
  }
  return {
    id: row.id,
    username: row.username,
    displayUsername: row.displayUsername,
    name: row.name,
    image: row.image,
  };
}

async function batchRelationsFor(
  viewerId: string | null,
  users: (RawPublicUser | undefined)[],
): Promise<Relations> {
  const ids = users.filter((u): u is RawPublicUser => Boolean(u)).map((u) => u.id);
  return repo.batchRelations(viewerId, ids);
}

interface CafeLocation {
  cafe: { id: string; slug: string; name: string } | null;
  locationLabel: string;
}

async function resolveCafeLocation(row: MeetupRow): Promise<CafeLocation> {
  if (!row.cafeId) return { cafe: null, locationLabel: row.addressLine ?? HIDDEN_LOCATION_LABEL };
  const cafe = await repo.findCafeRef(row.cafeId);
  if (!cafe || !isPubliclyVisibleCafe(cafe.consentStatus)) {
    return { cafe: null, locationLabel: row.addressLine ?? HIDDEN_LOCATION_LABEL };
  }
  return { cafe: { id: cafe.id, slug: cafe.slug, name: cafe.name }, locationLabel: cafe.name };
}

function summaryFromParts(
  row: MeetupRow,
  goingCount: number,
  location: CafeLocation,
  creator: MeetupPublicUser,
): MeetupSummaryDto {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    startsAt: row.startsAt.toISOString(),
    endsAt: row.endsAt ? row.endsAt.toISOString() : null,
    cafe: location.cafe,
    locationLabel: location.locationLabel,
    addressLine: row.addressLine,
    provinceCode: row.provinceCode,
    wardCode: row.wardCode,
    capacity: row.capacity,
    goingCount,
    visibility: row.visibility,
    status: row.status,
    createdBy: creator,
  };
}

async function toDetailDto(row: MeetupRow, viewerId: string | null): Promise<MeetupDetailDto> {
  const [goingCount, location, tables, seatedByTable, viewerParticipant, creatorRow] =
    await Promise.all([
      repo.countGoing(row.id),
      resolveCafeLocation(row),
      repo.listTablesByMeetup(row.id),
      repo.listSeatedUsersByTable(row.id),
      viewerId ? repo.findParticipant(row.id, viewerId) : Promise.resolve(undefined),
      repo.findPublicUser(row.createdBy),
    ]);

  const allUsers = [
    creatorRow,
    ...tables.map((t) => t.host),
    ...tables.map((t) => t.broughtBy ?? undefined),
    ...[...seatedByTable.values()].flat(),
  ];
  const relations = await batchRelationsFor(viewerId, allUsers);
  const mask = (u: RawPublicUser | undefined) => maskUser(u, viewerId, relations);

  const tableDtos: MeetupTableDto[] = tables.map((t) => ({
    id: t.id,
    host: mask(t.host),
    game: t.game,
    seats: t.seats,
    broughtBy: t.broughtBy ? mask(t.broughtBy) : null,
    note: t.note,
    position: t.position,
    seatedUsers: (seatedByTable.get(t.id) ?? []).map(mask),
  }));

  return {
    ...summaryFromParts(row, goingCount, location, mask(creatorRow)),
    description: row.description,
    tables: tableDtos,
    viewerStatus: viewerParticipant?.status ?? null,
  };
}

// ---------------------------------------------------------------------------
// Create / read / update / cancel
// ---------------------------------------------------------------------------

async function findAvailableSlug(title: string): Promise<string> {
  const base = slugify(title) || 'keo';
  return `${base}-${randomBytes(3).toString('hex')}`;
}

interface LocationInput {
  cafeId?: string | null;
  addressLine?: string | null;
  provinceCode?: string;
  wardCode?: string | null;
}

interface ResolvedLocation {
  cafeId: string | null;
  addressLine: string | null;
  provinceCode: string;
  wardCode: string | null;
}

/** Shared by create and update. Café-based meetups always derive `provinceCode`/`wardCode` from
 * the café — any client-supplied values for those two fields are ignored, on both create and
 * update, for consistency. `current` supplies the fallback for fields omitted from a PATCH. */
async function resolveLocation(
  input: LocationInput,
  current?: MeetupRow,
): Promise<ResolvedLocation> {
  const cafeId = input.cafeId !== undefined ? input.cafeId : (current?.cafeId ?? null);
  if (cafeId) {
    const cafe = await repo.findCafeRef(cafeId);
    if (!cafe || cafe.consentStatus === 'pending' || cafe.consentStatus === 'declined') {
      validationFailed('Quán không hợp lệ');
    }
    return { cafeId, addressLine: null, provinceCode: cafe.provinceCode, wardCode: cafe.wardCode };
  }
  const addressLine =
    input.addressLine !== undefined ? input.addressLine : (current?.addressLine ?? null);
  const provinceCode =
    input.provinceCode !== undefined ? input.provinceCode : current?.provinceCode;
  const wardCode = input.wardCode !== undefined ? input.wardCode : (current?.wardCode ?? null);
  if (!addressLine) validationFailed('Cần chọn quán hoặc nhập địa chỉ');
  if (!provinceCode) validationFailed('Cần chọn tỉnh/thành');
  return { cafeId: null, addressLine, provinceCode, wardCode };
}

export async function createMeetupService(
  userId: string,
  input: MeetupCreateInput,
): Promise<MeetupCreateResponseDto> {
  const location = await resolveLocation(input);
  const token = generateInviteToken();
  const inviteCodeHash = hashToken(token);

  let meetupId: string | undefined;
  for (let attempt = 0; attempt < 3 && !meetupId; attempt++) {
    const slug = await findAvailableSlug(input.title);
    try {
      meetupId = await db.transaction(async (tx) => {
        const meetup = await repo.insertMeetup(
          {
            slug,
            title: input.title,
            description: input.description ?? null,
            startsAt: new Date(input.startsAt),
            endsAt: input.endsAt ? new Date(input.endsAt) : null,
            cafeId: location.cafeId,
            addressLine: location.addressLine,
            provinceCode: location.provinceCode,
            wardCode: location.wardCode,
            capacity: input.capacity ?? null,
            visibility: input.visibility,
            inviteCodeHash,
            createdBy: userId,
          },
          tx,
        );
        if (input.table) await insertTableTx(tx, meetup, userId, input.table);
        return meetup.id;
      });
    } catch (err) {
      if (!isUniqueViolation(err) || attempt === 2) throw err;
    }
  }
  if (!meetupId) throw new ApiError('INTERNAL', 500, 'Không tạo được Kèo, thử lại');

  const row = await repo.findMeetupById(meetupId);
  const detail = await toDetailDto(row!, userId);
  return { ...detail, inviteUrl: inviteUrlFor(row!.slug, token) };
}

export async function getMeetupBySlugService(
  slug: string,
  viewerId: string | null,
  code: string | undefined,
): Promise<MeetupDetailDto> {
  const row = await repo.findMeetupBySlug(slug);
  if (!row) notFound();
  if (!(await canViewMeetup(row, viewerId, code))) notFound();
  return toDetailDto(row, viewerId);
}

async function requireOwnedMeetup(meetupId: string, userId: string): Promise<MeetupRow> {
  const row = await repo.findMeetupById(meetupId);
  if (!row) notFound();
  if (row.createdBy !== userId) forbidden();
  return row;
}

export async function updateMeetupService(
  meetupId: string,
  userId: string,
  input: MeetupUpdateInput,
): Promise<MeetupDetailDto> {
  const current = await requireOwnedMeetup(meetupId, userId);
  const location =
    input.cafeId !== undefined ||
    input.addressLine !== undefined ||
    input.provinceCode !== undefined ||
    input.wardCode !== undefined
      ? await resolveLocation(input, current)
      : undefined;

  if (input.capacity !== undefined && input.capacity !== null) {
    const going = await repo.countGoing(meetupId);
    if (input.capacity < going) {
      validationFailed('Sức chứa không thể nhỏ hơn số người đã tham gia');
    }
  }

  // A PATCH touching only one of startsAt/endsAt must still be checked against the other's
  // stored value — mirrors the pair check `meetupCreateSchema` does at create time.
  const effectiveStartsAt =
    input.startsAt !== undefined ? new Date(input.startsAt) : current.startsAt;
  const effectiveEndsAt =
    input.endsAt !== undefined ? (input.endsAt ? new Date(input.endsAt) : null) : current.endsAt;
  if (input.startsAt !== undefined && effectiveStartsAt.getTime() < Date.now() - PAST_SKEW_MS) {
    validationFailed('Thời gian bắt đầu không được ở quá khứ');
  }
  if (effectiveEndsAt && effectiveEndsAt <= effectiveStartsAt) {
    validationFailed('Giờ kết thúc phải sau giờ bắt đầu');
  }

  await db.transaction(async (tx) => {
    await repo.updateMeetup(
      meetupId,
      {
        ...(input.title !== undefined && { title: input.title }),
        ...(input.description !== undefined && { description: input.description }),
        ...(input.startsAt !== undefined && { startsAt: new Date(input.startsAt) }),
        ...(input.endsAt !== undefined && { endsAt: input.endsAt ? new Date(input.endsAt) : null }),
        ...(location !== undefined && {
          cafeId: location.cafeId,
          addressLine: location.addressLine,
          provinceCode: location.provinceCode,
          wardCode: location.wardCode,
        }),
        ...(input.capacity !== undefined && { capacity: input.capacity }),
        ...(input.visibility !== undefined && { visibility: input.visibility }),
      },
      tx,
    );
    if (input.capacity !== undefined) {
      await promoteWaitlistLoop(tx, meetupId, input.capacity);
    }
  });

  const row = await repo.findMeetupById(meetupId);
  return toDetailDto(row!, userId);
}

export async function cancelMeetupService(meetupId: string, userId: string): Promise<void> {
  await requireOwnedMeetup(meetupId, userId);
  await repo.updateMeetup(meetupId, { status: 'cancelled' });
}

export async function rotateInviteCodeService(
  meetupId: string,
  userId: string,
): Promise<MeetupInviteCodeResponse> {
  const meetup = await requireOwnedMeetup(meetupId, userId);
  const token = generateInviteToken();
  await repo.updateMeetup(meetupId, { inviteCodeHash: hashToken(token) });
  return { inviteUrl: inviteUrlFor(meetup.slug, token) };
}

export async function inviteFriendsService(
  meetupId: string,
  userId: string,
  input: MeetupInviteFriendsInput,
): Promise<void> {
  await requireOwnedMeetup(meetupId, userId);
  for (const targetId of input.userIds) {
    if (targetId === userId) continue;
    if (!(await areFriends(userId, targetId))) {
      validationFailed('Chỉ có thể mời bạn bè');
    }
  }
  for (const targetId of input.userIds) {
    if (targetId === userId) continue;
    await repo.insertParticipantIfAbsent({ meetupId, userId: targetId, status: 'invited' });
  }
}

// ---------------------------------------------------------------------------
// List / calendar / /me/events
// ---------------------------------------------------------------------------

async function toSummaryDtos(
  rows: MeetupRow[],
  viewerId: string | null,
): Promise<MeetupSummaryDto[]> {
  const cafeIds = rows.flatMap((r) => (r.cafeId ? [r.cafeId] : []));
  const [creatorsById, cafesById, goingCounts] = await Promise.all([
    repo.findPublicUsersByIds(rows.map((r) => r.createdBy)),
    repo.findCafeRefsByIds(cafeIds),
    repo.countDistinctGoingByMeetupIds(rows.map((r) => r.id)),
  ]);
  const relations = await batchRelationsFor(viewerId, [...creatorsById.values()]);
  return rows.map((row) => {
    const cafe = row.cafeId ? cafesById.get(row.cafeId) : undefined;
    const location: CafeLocation =
      cafe && isPubliclyVisibleCafe(cafe.consentStatus)
        ? { cafe: { id: cafe.id, slug: cafe.slug, name: cafe.name }, locationLabel: cafe.name }
        : { cafe: null, locationLabel: row.addressLine ?? HIDDEN_LOCATION_LABEL };
    return summaryFromParts(
      row,
      goingCounts.get(row.id) ?? 0,
      location,
      maskUser(creatorsById.get(row.createdBy), viewerId, relations),
    );
  });
}

export async function listMeetupsService(
  viewerId: string | null,
  filter: MeetupFilter,
): Promise<MeetupListResponse> {
  const clauses = [eq(meetups.status, 'scheduled' as const), repo.visibleMeetupsWhere(viewerId)];
  if (filter.provinceCode) clauses.push(eq(meetups.provinceCode, filter.provinceCode));
  if (filter.wardCode) clauses.push(eq(meetups.wardCode, filter.wardCode));
  if (filter.cafeId) clauses.push(eq(meetups.cafeId, filter.cafeId));
  clauses.push(gte(meetups.startsAt, filter.from ? new Date(filter.from) : new Date()));
  const where = and(...clauses)!;

  const { ids, total } = await repo.listMeetupIds({
    where,
    page: filter.page,
    pageSize: filter.pageSize,
  });
  const rowsById = await repo.findMeetupsByIds(ids);
  const rows = ids.flatMap((id) => (rowsById.has(id) ? [rowsById.get(id)!] : []));
  const items = await toSummaryDtos(rows, viewerId);
  return { items, page: filter.page, pageSize: filter.pageSize, total };
}

export async function getMyEventsService(userId: string): Promise<MeetupListResponse> {
  const where = repo.myMeetupsWhere(userId);
  const { ids, total } = await repo.listMeetupIds({
    where,
    page: 1,
    pageSize: 200,
    upcomingFirst: true,
  });
  const rowsById = await repo.findMeetupsByIds(ids);
  const rows = ids.flatMap((id) => (rowsById.has(id) ? [rowsById.get(id)!] : []));
  const items = await toSummaryDtos(rows, userId);
  return { items, page: 1, pageSize: items.length, total };
}

export async function getCalendarService(
  viewerId: string | null,
  month: string,
): Promise<MeetupCalendarDay[]> {
  const [y, m] = month.split('-').map(Number);
  const start = new Date(Date.UTC(y!, m! - 1, 1, -7, 0, 0));
  const end = new Date(Date.UTC(y!, m!, 1, -7, 0, 0));
  const rows = await repo.calendarAggregate(viewerId, start, end);
  return rows.map((r) => ({
    date: r.date,
    players: r.players,
    tables: r.tables,
    meetupIds: r.meetupIds,
  }));
}

// ---------------------------------------------------------------------------
// Waitlist promotion
// ---------------------------------------------------------------------------

/** Promotes FIFO-waitlisted participants to `going` while there's room; loops so a capacity
 * increase can free more than one seat. `null` capacity is unlimited and still drains the
 * waitlist (e.g. right after capacity is raised to unlimited). */
async function promoteWaitlistLoop(
  tx: Tx,
  meetupId: string,
  capacity: number | null,
): Promise<void> {
  for (;;) {
    if (capacity !== null) {
      const going = await repo.countGoing(meetupId, tx);
      if (going >= capacity) return;
    }
    const next = await repo.nextWaitlisted(tx, meetupId);
    if (!next) return;
    await repo.updateParticipant(
      meetupId,
      next.userId,
      { status: 'going', waitlistedAt: null, respondedAt: new Date() },
      tx,
    );
  }
}

// ---------------------------------------------------------------------------
// RSVP — a table host can't RSVP away from `going` or move to another table; they must delete
// their table first (transfer-to-another-host is out of scope).
// ---------------------------------------------------------------------------

export async function rsvpService(
  meetupId: string,
  userId: string,
  input: RsvpInput,
): Promise<MeetupDetailDto> {
  await db.transaction(async (tx) => {
    const meetup = await repo.findMeetupByIdForUpdate(tx, meetupId);
    if (!meetup) notFound();
    if (!(await canViewMeetup(meetup, userId, input.code))) notFound();
    if (meetup.status === 'cancelled') conflict('Kèo đã bị hủy');

    const existing = await repo.findParticipant(meetupId, userId, tx);
    const wasGoing = existing?.status === 'going';
    const hosting = await repo.isHost(meetupId, userId, tx);

    if (input.status !== 'going') {
      if (hosting) conflict('Bạn đang là host của một bàn — hãy xóa bàn trước khi đổi trạng thái');
      await repo.upsertParticipant(
        {
          meetupId,
          userId,
          status: input.status,
          tableId: null,
          waitlistedAt: null,
          respondedAt: new Date(),
        },
        tx,
      );
      if (wasGoing) await promoteWaitlistLoop(tx, meetupId, meetup.capacity);
      return;
    }

    if (hosting && input.tableId !== undefined && input.tableId !== existing?.tableId) {
      conflict('Host không thể chuyển bàn — hãy xóa bàn trước');
    }

    let finalStatus: 'going' | 'waitlist' = 'going';
    if (!wasGoing && meetup.capacity !== null) {
      const going = await repo.countGoing(meetupId, tx, userId);
      if (going >= meetup.capacity) finalStatus = 'waitlist';
    }

    // `tableId` omitted => keep the existing seat (if any); `null` explicitly clears it;
    // a uuid explicitly claims that table (capacity/seats validated below).
    let tableId: string | null =
      input.tableId === undefined ? (existing?.tableId ?? null) : input.tableId;
    if (finalStatus === 'going' && tableId && tableId !== existing?.tableId) {
      const table = await repo.findTableByIdForUpdate(tx, tableId);
      if (!table || table.meetupId !== meetupId) validationFailed('Bàn không hợp lệ');
      const seated = await repo.countSeated(tableId, tx);
      if (table.seats !== null && seated >= table.seats) conflict('Bàn đã đầy chỗ');
    }
    if (finalStatus !== 'going') tableId = null;

    await repo.upsertParticipant(
      {
        meetupId,
        userId,
        status: finalStatus,
        tableId,
        waitlistedAt: finalStatus === 'waitlist' ? (existing?.waitlistedAt ?? new Date()) : null,
        respondedAt: new Date(),
      },
      tx,
    );
  });

  const row = await repo.findMeetupById(meetupId);
  return toDetailDto(row!, userId);
}

// ---------------------------------------------------------------------------
// Tables
// ---------------------------------------------------------------------------

/** Shared by `createMeetupService`'s optional first table and `createTableService`. */
async function insertTableTx(
  tx: Tx,
  meetup: Pick<MeetupRow, 'id' | 'capacity'>,
  hostUserId: string,
  input: MeetupTableCreateInput,
): Promise<repo.MeetupTableRow> {
  const tableCount = await repo.countTables(meetup.id, tx);
  if (tableCount >= MAX_TABLES_PER_MEETUP) conflict('Đã đạt giới hạn 30 bàn/Kèo');

  await validateBroughtBy(input.gameId, input.broughtByUserId);

  const existing = await repo.findParticipant(meetup.id, hostUserId, tx);
  if (existing?.status !== 'going' && meetup.capacity !== null) {
    const going = await repo.countGoing(meetup.id, tx, hostUserId);
    if (going >= meetup.capacity) conflict('Kèo đã đủ người, không thể tạo bàn mới');
  }

  const position = await repo.nextTablePosition(meetup.id, tx);
  const table = await repo.insertTable(
    {
      meetupId: meetup.id,
      hostUserId,
      gameId: input.gameId ?? null,
      seats: input.seats ?? null,
      broughtByUserId: input.broughtByUserId ?? null,
      note: input.note ?? null,
      position,
    },
    tx,
  );
  await repo.upsertParticipant(
    {
      meetupId: meetup.id,
      userId: hostUserId,
      status: 'going',
      tableId: table.id,
      waitlistedAt: null,
      respondedAt: new Date(),
    },
    tx,
  );
  return table;
}

async function validateBroughtBy(
  gameId: string | null | undefined,
  broughtByUserId: string | null | undefined,
): Promise<void> {
  if (!broughtByUserId) return;
  if (!gameId) validationFailed('Cần chọn game để gán người mang');
  if (!(await repo.userOwnsGame(broughtByUserId, gameId!))) {
    validationFailed('Game này không có trong tủ của người được chọn');
  }
}

export async function createTableService(
  meetupId: string,
  userId: string,
  input: MeetupTableCreateInput,
): Promise<MeetupTableDto> {
  const table = await db.transaction(async (tx) => {
    const meetup = await repo.findMeetupByIdForUpdate(tx, meetupId);
    if (!meetup) notFound();
    if (meetup.status === 'cancelled') conflict('Kèo đã bị hủy, không thể tạo bàn');
    const isCreator = meetup.createdBy === userId;
    const participant = await repo.findParticipant(meetupId, userId, tx);
    if (!isCreator && participant?.status !== 'going')
      forbidden('Chỉ người tạo hoặc người đang tham gia mới tạo được bàn');
    if (input.broughtByUserId && input.broughtByUserId !== userId) {
      forbidden('Chỉ chính bạn mới được gán người mang game khi tạo bàn');
    }
    return insertTableTx(tx, meetup, userId, input);
  });
  const row = await repo.findMeetupById(meetupId);
  const detail = await toDetailDto(row!, userId);
  return detail.tables.find((t) => t.id === table.id)!;
}

async function requireTableAccess(
  meetupId: string,
  tableId: string,
  userId: string,
): Promise<{ meetup: MeetupRow; table: repo.MeetupTableRow }> {
  const meetup = await repo.findMeetupById(meetupId);
  if (!meetup) notFound();
  const table = await repo.findTableById(tableId);
  if (!table || table.meetupId !== meetupId) notFound();
  if (meetup.createdBy !== userId && table.hostUserId !== userId) forbidden();
  return { meetup, table };
}

export async function updateTableService(
  meetupId: string,
  tableId: string,
  userId: string,
  input: MeetupTableUpdateInput,
): Promise<MeetupTableDto> {
  await requireTableAccess(meetupId, tableId, userId);
  await db.transaction(async (tx) => {
    const table = await repo.findTableByIdForUpdate(tx, tableId);
    if (!table) notFound();

    if (input.seats !== undefined && input.seats !== null) {
      const seated = await repo.countSeated(tableId, tx);
      if (input.seats < seated)
        validationFailed('Không thể giảm số ghế xuống dưới số người đã ngồi');
    }

    // Snapshot rule: only re-validate brought-by when this PATCH actually touches `gameId` or
    // `broughtByUserId` — editing e.g. `note` must not re-check a game since removed from shelf.
    if (input.gameId !== undefined || input.broughtByUserId !== undefined) {
      const effectiveGameId = input.gameId !== undefined ? input.gameId : table.gameId;
      const effectiveBroughtBy =
        input.broughtByUserId !== undefined ? input.broughtByUserId : table.broughtByUserId;
      if (effectiveBroughtBy) {
        if (effectiveBroughtBy !== userId && effectiveBroughtBy !== table.hostUserId) {
          const seated = await repo.listSeatedUsersByTable(table.meetupId);
          const isSeated = (seated.get(table.id) ?? []).some((u) => u.id === effectiveBroughtBy);
          if (!isSeated) validationFailed('Người mang game phải đang ngồi bàn này');
        }
        await validateBroughtBy(effectiveGameId, effectiveBroughtBy);
      }
    }

    await repo.updateTable(
      tableId,
      {
        ...(input.gameId !== undefined && { gameId: input.gameId }),
        ...(input.seats !== undefined && { seats: input.seats }),
        ...(input.broughtByUserId !== undefined && { broughtByUserId: input.broughtByUserId }),
        ...(input.note !== undefined && { note: input.note }),
      },
      tx,
    );
  });
  const row = await repo.findMeetupById(meetupId);
  const detail = await toDetailDto(row!, userId);
  return detail.tables.find((t) => t.id === tableId)!;
}

export async function deleteTableService(
  meetupId: string,
  tableId: string,
  userId: string,
): Promise<void> {
  await requireTableAccess(meetupId, tableId, userId);
  const deleted = await repo.deleteTable(tableId);
  if (!deleted) notFound();
}

// ---------------------------------------------------------------------------
// Seats — a table host always occupies their own table's seat and can't move elsewhere; they
// must delete the table to free themselves (host transfer is out of scope).
// ---------------------------------------------------------------------------

export async function seatAtTableService(
  meetupId: string,
  tableId: string,
  userId: string,
): Promise<void> {
  await db.transaction(async (tx) => {
    const meetup = await repo.findMeetupById(meetupId);
    if (!meetup) notFound();
    if (meetup.status === 'cancelled') conflict('Kèo đã bị hủy');
    if (await repo.isHost(meetupId, userId, tx)) {
      conflict('Host không thể ngồi bàn khác — hãy xóa bàn trước');
    }
    const table = await repo.findTableByIdForUpdate(tx, tableId);
    if (!table || table.meetupId !== meetupId) notFound();
    const participant = await repo.findParticipantForUpdate(tx, meetupId, userId);
    if (participant?.status !== 'going') validationFailed('Bạn cần ở trạng thái going để ngồi bàn');
    const seated = await repo.countSeated(tableId, tx);
    if (table.seats !== null && seated >= table.seats && participant.tableId !== tableId) {
      conflict('Bàn đã đầy chỗ');
    }
    await repo.updateParticipant(meetupId, userId, { tableId }, tx);
  });
}

export async function leaveTableService(
  meetupId: string,
  tableId: string,
  userId: string,
): Promise<void> {
  await db.transaction(async (tx) => {
    const participant = await repo.findParticipantForUpdate(tx, meetupId, userId);
    if (!participant || participant.tableId !== tableId) notFound();
    const table = await repo.findTableById(tableId, tx);
    if (table?.hostUserId === userId)
      conflict('Host không thể rời bàn của mình — hãy xóa bàn thay vào đó');
    await repo.updateParticipant(meetupId, userId, { tableId: null }, tx);
  });
}

// ---------------------------------------------------------------------------
// User deletion support (called from the Better Auth `user.delete` hooks)
// ---------------------------------------------------------------------------

export function goingMeetupIdsForUser(userId: string): Promise<string[]> {
  return repo.goingMeetupIdsForUser(userId);
}

/** Runs after the user row (and cascaded `meetup_participants` rows) is gone. Locks each meetup
 * before promoting so it can't race a concurrent RSVP/capacity change. */
export async function promoteWaitlistForMeetups(meetupIds: string[]): Promise<void> {
  for (const meetupId of meetupIds) {
    await db.transaction(async (tx) => {
      const meetup = await repo.findMeetupByIdForUpdate(tx, meetupId);
      if (!meetup || meetup.status === 'cancelled') return;
      await promoteWaitlistLoop(tx, meetupId, meetup.capacity);
    });
  }
}
