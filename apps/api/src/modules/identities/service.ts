import { createHash, randomBytes } from 'node:crypto';
import type {
  ClaimLinkResponse,
  ClaimRedeemResponse,
  ClaimRequestCreateInput,
  ClaimRequestDto,
  ClaimRequestListResponse,
  GuestCreateInput,
  IdentityDto,
  IdentityListQuery,
  IdentityListResponse,
} from '@onboard/shared';
import { and, desc, eq, inArray, isNull, or } from 'drizzle-orm';
import { db } from '../../db/client.js';
import {
  identities,
  identityClaimRequests,
  identityClaimTokens,
  meetupTables,
  meetupTableIdentities,
  playEvents,
  playPlayers,
  users,
} from '../../db/schema/index.js';
import { env } from '../../lib/env.js';
import { ApiError } from '../../lib/errors.js';
import { canView } from '../../lib/visibility.js';
import { canViewMeetup } from '../events/service.js';
import * as eventRepo from '../events/repo.js';
import * as repo from './repo.js';
import type { IdentityViewRow, Tx } from './repo.js';

const ANONYMOUS_NAME = 'Người chơi ẩn danh';
const CLAIM_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const UNIQUE_VIOLATION = '23505';

const notFound = (message = 'Không tìm thấy'): never => {
  throw new ApiError('NOT_FOUND', 404, message);
};
const forbidden = (message = 'Bạn không có quyền thực hiện thao tác này'): never => {
  throw new ApiError('FORBIDDEN', 403, message);
};
const conflict = (message: string): never => {
  throw new ApiError('CONFLICT', 409, message);
};

const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');

function isUniqueViolation(err: unknown): boolean {
  const cause = err && typeof err === 'object' && 'cause' in err ? err.cause : err;
  return Boolean(
    cause && typeof cause === 'object' && 'code' in cause && cause.code === UNIQUE_VIOLATION,
  );
}

/** Member names follow each user's `profileVisibility`; `birthYear` is shown only to the guest,
 * their inviter and admins of the guest's club. */
export async function toIdentityDtos(
  rows: IdentityViewRow[],
  viewerId: string | null,
): Promise<IdentityDto[]> {
  const userIds = rows.flatMap((r) => (r.user && r.userId ? [r.userId] : []));
  const [relations, adminClubs] = await Promise.all([
    eventRepo.batchRelations(viewerId, userIds),
    viewerId ? repo.adminClubIds(viewerId) : Promise.resolve(new Set<string>()),
  ]);
  return rows.map((r) => {
    let displayName = r.displayName;
    let username: string | null = null;
    let image: string | null = null;
    if (r.user && r.userId && r.kind === 'member') {
      const relation = relations.get(r.userId) ?? { isFriend: false, blocked: false };
      const visible = canView(r.user.profileVisibility, {
        isSelf: r.userId === viewerId,
        isFriend: relation.isFriend,
        blocked: relation.blocked,
      });
      displayName = visible ? r.user.name : ANONYMOUS_NAME;
      username = visible ? r.user.username : null;
      image = visible ? r.user.image : null;
    }
    const canSeeBirthYear =
      r.kind === 'guest' &&
      viewerId !== null &&
      (r.userId === viewerId ||
        r.inviterUserId === viewerId ||
        (r.clubId !== null && adminClubs.has(r.clubId)));
    return {
      id: r.id,
      kind: r.kind,
      displayName,
      userId: r.kind === 'member' ? r.userId : null,
      username,
      image,
      clubId: r.clubId,
      invitedByIdentityId: r.invitedByIdentityId,
      ...(canSeeBirthYear ? { birthYear: r.birthYear } : {}),
    };
  });
}

export async function identityDtosByIds(
  ids: string[],
  viewerId: string | null,
): Promise<Map<string, IdentityDto>> {
  const rows = await repo.findIdentityViews([...new Set(ids)]);
  const dtos = await toIdentityDtos(rows, viewerId);
  return new Map(dtos.map((d) => [d.id, d]));
}

export async function listClubIdentitiesService(
  clubId: string,
  viewerId: string,
  query: IdentityListQuery,
): Promise<IdentityListResponse> {
  await repo.ensureClubMemberIdentities(clubId);
  const rows = await repo.listClubIdentities(clubId, query.q, query.limit);
  return { items: await toIdentityDtos(rows, viewerId) };
}

// ---------------------------------------------------------------------------
// Guests
// ---------------------------------------------------------------------------

async function loadTableForViewer(tableId: string, viewerId: string) {
  const table = await repo.findTableContext(tableId);
  if (!table) return notFound('Không tìm thấy bàn');
  const meetup = await eventRepo.findMeetupById(table.meetupId);
  if (!meetup || !(await canViewMeetup(meetup, viewerId))) return notFound('Không tìm thấy bàn');
  return { table, meetup };
}

export async function addGuestService(
  tableId: string,
  actor: { id: string; name: string },
  input: GuestCreateInput,
): Promise<IdentityDto> {
  const { table, meetup } = await loadTableForViewer(tableId, actor.id);
  if (meetup.status === 'cancelled') conflict('Kèo đã bị hủy');
  const allowed =
    table.hostUserId === actor.id ||
    (await repo.isSeatedUser(tableId, actor.id)) ||
    (await repo.isClubAdmin(table.clubId, actor.id));
  if (!allowed) forbidden();

  const id = await db.transaction(async (tx) => {
    const locked = await eventRepo.findTableByIdForUpdate(tx, tableId);
    if (!locked) return notFound('Không tìm thấy bàn');
    if (locked.seats !== null && (await repo.countSeats(tableId, tx)) >= locked.seats) {
      conflict('Bàn đã đầy chỗ');
    }
    const inviter = await repo.getOrCreateMemberIdentity(actor.id, tx);
    const [guest] = await tx
      .insert(identities)
      .values({
        kind: 'guest',
        clubId: table.clubId,
        displayName: input.displayName ?? `Bạn của ${actor.name}`,
        birthYear: input.birthYear ?? null,
        invitedByIdentityId: inviter.id,
      })
      .returning({ id: identities.id });
    await tx.insert(meetupTableIdentities).values({ tableId, identityId: guest!.id });
    return guest!.id;
  });
  return (await identityDtosByIds([id], actor.id)).get(id)!;
}

async function canManageGuest(
  identity: repo.IdentityRow & { inviterUserId: string | null },
  userId: string,
): Promise<boolean> {
  if (identity.inviterUserId === userId) return true;
  if (await repo.isClubAdmin(identity.clubId, userId)) return true;
  const [hosted] = await db
    .select({ tableId: meetupTableIdentities.tableId })
    .from(meetupTableIdentities)
    .innerJoin(meetupTables, eq(meetupTables.id, meetupTableIdentities.tableId))
    .where(
      and(eq(meetupTableIdentities.identityId, identity.id), eq(meetupTables.hostUserId, userId)),
    )
    .limit(1);
  return Boolean(hosted);
}

export async function removeGuestService(
  tableId: string,
  identityId: string,
  userId: string,
): Promise<void> {
  await loadTableForViewer(tableId, userId);
  const [row] = await repo.findIdentityViews([identityId]);
  const [seat] = await db
    .select()
    .from(meetupTableIdentities)
    .where(
      and(
        eq(meetupTableIdentities.tableId, tableId),
        eq(meetupTableIdentities.identityId, identityId),
      ),
    )
    .limit(1);
  if (!row || row.kind !== 'guest' || !seat) return notFound('Không tìm thấy khách');
  if (!(await canManageGuest(row, userId))) forbidden();

  await db.transaction(async (tx) => {
    await tx
      .delete(meetupTableIdentities)
      .where(
        and(
          eq(meetupTableIdentities.tableId, tableId),
          eq(meetupTableIdentities.identityId, identityId),
        ),
      );
    const [otherSeat] = await tx
      .select({ t: meetupTableIdentities.tableId })
      .from(meetupTableIdentities)
      .where(eq(meetupTableIdentities.identityId, identityId))
      .limit(1);
    const [played] = await tx
      .select({ p: playPlayers.playId })
      .from(playPlayers)
      .where(eq(playPlayers.identityId, identityId))
      .limit(1);
    if (!otherSeat && !played) await tx.delete(identities).where(eq(identities.id, identityId));
  });
}

// ---------------------------------------------------------------------------
// Claim: merge a guest identity into a user
// ---------------------------------------------------------------------------

/** Moves every seat, play and invite reference of `guestId` onto the user's member identity and
 * leaves the guest row as a hidden tombstone (`claimedAt`). */
export async function mergeGuestIntoUser(
  tx: Tx,
  guestId: string,
  userId: string,
): Promise<repo.IdentityRow> {
  const guest = await repo.lockIdentity(tx, guestId);
  if (!guest || guest.kind !== 'guest') return notFound('Không tìm thấy khách');
  if (guest.claimedAt) conflict('Khách này đã được nhận');
  const target = await repo.getOrCreateMemberIdentity(userId, tx);

  const targetSeats = tx
    .select({ t: meetupTableIdentities.tableId })
    .from(meetupTableIdentities)
    .where(eq(meetupTableIdentities.identityId, target.id));
  await tx
    .delete(meetupTableIdentities)
    .where(
      and(
        eq(meetupTableIdentities.identityId, guestId),
        inArray(meetupTableIdentities.tableId, targetSeats),
      ),
    );
  await tx
    .update(meetupTableIdentities)
    .set({ identityId: target.id })
    .where(eq(meetupTableIdentities.identityId, guestId));

  const targetPlays = tx
    .select({ p: playPlayers.playId })
    .from(playPlayers)
    .where(eq(playPlayers.identityId, target.id));
  await tx
    .delete(playPlayers)
    .where(and(eq(playPlayers.identityId, guestId), inArray(playPlayers.playId, targetPlays)));
  await tx
    .update(playPlayers)
    .set({ identityId: target.id })
    .where(eq(playPlayers.identityId, guestId));
  await tx
    .update(playEvents)
    .set({ identityId: target.id })
    .where(eq(playEvents.identityId, guestId));
  await tx
    .update(identities)
    .set({ invitedByIdentityId: target.id })
    .where(eq(identities.invitedByIdentityId, guestId));
  await tx
    .update(identityClaimRequests)
    .set({ status: 'rejected', decidedAt: new Date() })
    .where(
      and(
        eq(identityClaimRequests.identityId, guestId),
        eq(identityClaimRequests.status, 'pending'),
      ),
    );
  await tx
    .update(identities)
    .set({ userId, claimedAt: new Date() })
    .where(eq(identities.id, guestId));
  return target;
}

export async function createClaimLinkService(
  identityId: string,
  userId: string,
): Promise<ClaimLinkResponse> {
  const [row] = await repo.findIdentityViews([identityId]);
  if (!row || row.kind !== 'guest' || row.claimedAt || !(await canManageGuest(row, userId))) {
    return notFound('Không tìm thấy khách');
  }
  const token = randomBytes(24).toString('base64url');
  const expiresAt = new Date(Date.now() + CLAIM_TTL_MS);
  await db.insert(identityClaimTokens).values({
    identityId,
    tokenHash: hashToken(token),
    createdBy: userId,
    expiresAt,
  });
  return { token, url: `${env.WEB_ORIGIN}/claim/${token}`, expiresAt: expiresAt.toISOString() };
}

export async function redeemClaimService(
  userId: string,
  token: string,
): Promise<ClaimRedeemResponse> {
  const targetId = await db.transaction(async (tx) => {
    const [row] = await tx
      .select()
      .from(identityClaimTokens)
      .where(eq(identityClaimTokens.tokenHash, hashToken(token)))
      .for('update');
    if (!row || row.usedAt || row.expiresAt.getTime() < Date.now()) {
      return notFound('Link không hợp lệ hoặc đã hết hạn');
    }
    const target = await mergeGuestIntoUser(tx, row.identityId, userId);
    await tx
      .update(identityClaimTokens)
      .set({ usedAt: new Date() })
      .where(eq(identityClaimTokens.id, row.id));
    return target.id;
  });
  return { identity: (await identityDtosByIds([targetId], userId)).get(targetId)! };
}

export async function createClaimRequestService(
  identityId: string,
  userId: string,
  input: ClaimRequestCreateInput,
): Promise<ClaimRequestDto> {
  await loadTableForViewer(input.tableId, userId);
  const [row] = await repo.findIdentityViews([identityId]);
  if (!row || row.kind !== 'guest' || row.claimedAt) return notFound('Không tìm thấy khách');
  const [seat] = await db
    .select()
    .from(meetupTableIdentities)
    .where(
      and(
        eq(meetupTableIdentities.tableId, input.tableId),
        eq(meetupTableIdentities.identityId, identityId),
      ),
    )
    .limit(1);
  if (!seat) return notFound('Không tìm thấy khách');
  if (row.inviterUserId === userId) conflict('Bạn là người mời, hãy tạo link nhận');
  try {
    const [created] = await db
      .insert(identityClaimRequests)
      .values({
        identityId,
        requesterUserId: userId,
        tableId: input.tableId,
        note: input.note ?? null,
      })
      .returning({ id: identityClaimRequests.id });
    return (await loadRequestDtos([created!.id]))[0]!;
  } catch (err) {
    if (isUniqueViolation(err)) conflict('Bạn đã gửi yêu cầu cho khách này');
    throw err;
  }
}

async function loadRequestDtos(ids: string[]): Promise<ClaimRequestDto[]> {
  if (ids.length === 0) return [];
  const rows = await db
    .select({
      id: identityClaimRequests.id,
      status: identityClaimRequests.status,
      identityId: identityClaimRequests.identityId,
      identityName: identities.displayName,
      requesterId: users.id,
      requesterName: users.name,
      requesterUsername: users.username,
      tableId: identityClaimRequests.tableId,
      note: identityClaimRequests.note,
      createdAt: identityClaimRequests.createdAt,
    })
    .from(identityClaimRequests)
    .innerJoin(identities, eq(identities.id, identityClaimRequests.identityId))
    .innerJoin(users, eq(users.id, identityClaimRequests.requesterUserId))
    .where(inArray(identityClaimRequests.id, ids))
    .orderBy(desc(identityClaimRequests.createdAt));
  return rows.map((r) => ({
    id: r.id,
    status: r.status,
    identity: { id: r.identityId, displayName: r.identityName },
    requester: { id: r.requesterId, name: r.requesterName, username: r.requesterUsername },
    tableId: r.tableId,
    note: r.note,
    createdAt: r.createdAt.toISOString(),
  }));
}

export async function listMyClaimRequestsService(
  userId: string,
): Promise<ClaimRequestListResponse> {
  const adminClubs = [...(await repo.adminClubIds(userId))];
  const inviterIdentity = await repo.getOrCreateMemberIdentity(userId);
  const rows = await db
    .select({ id: identityClaimRequests.id })
    .from(identityClaimRequests)
    .innerJoin(identities, eq(identities.id, identityClaimRequests.identityId))
    .where(
      and(
        eq(identityClaimRequests.status, 'pending'),
        isNull(identities.claimedAt),
        or(
          eq(identities.invitedByIdentityId, inviterIdentity.id),
          adminClubs.length ? inArray(identities.clubId, adminClubs) : undefined,
        ),
      ),
    );
  return { items: await loadRequestDtos(rows.map((r) => r.id)) };
}

export async function decideClaimRequestService(
  requestId: string,
  userId: string,
  approve: boolean,
): Promise<ClaimRequestDto> {
  await db.transaction(async (tx) => {
    const [req] = await tx
      .select()
      .from(identityClaimRequests)
      .where(eq(identityClaimRequests.id, requestId))
      .for('update');
    if (!req) return notFound('Không tìm thấy yêu cầu');
    const [identity] = await repo.findIdentityViews([req.identityId], tx);
    if (!identity || !(await canManageGuest(identity, userId)))
      return notFound('Không tìm thấy yêu cầu');
    if (req.status !== 'pending') conflict('Yêu cầu đã được xử lý');
    if (approve) await mergeGuestIntoUser(tx, req.identityId, req.requesterUserId);
    await tx
      .update(identityClaimRequests)
      .set({ status: approve ? 'approved' : 'rejected', decidedBy: userId, decidedAt: new Date() })
      .where(eq(identityClaimRequests.id, requestId));
  });
  return (await loadRequestDtos([requestId]))[0]!;
}
