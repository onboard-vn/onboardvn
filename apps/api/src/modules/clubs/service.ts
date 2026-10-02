import { createHash, randomBytes } from 'node:crypto';
import type {
  ClubAddMemberInput,
  ClubAdminListResponse,
  ClubCreateInput,
  ClubCreateResponse,
  ClubDetailDto,
  ClubExternalMembersResponse,
  ClubInviteCodeResponse,
  ClubJoinInput,
  ClubJoinResponse,
  ClubListResponse,
  ClubMemberDto,
  ClubRole,
  ClubUpdateInput,
} from '@onboard/shared';
import { db } from '../../db/client.js';
import { adminAuditLog } from '../../db/schema/index.js';
import { env } from '../../lib/env.js';
import { ApiError } from '../../lib/errors.js';
import { areFriends, canView, isBlocked } from '../../lib/visibility.js';
import { slugify } from '../games/slug.js';
import { batchRelations } from '../events/repo.js';
import * as repo from './repo.js';
import type { ClubRow, MemberUserRow, Tx } from './repo.js';

const UNIQUE_VIOLATION = '23505';
const ANONYMOUS_NAME = 'Người chơi ẩn danh';

function notFound(): never {
  throw new ApiError('NOT_FOUND', 404, 'Không tìm thấy club');
}

function forbidden(message = 'Bạn không có quyền thực hiện thao tác này'): never {
  throw new ApiError('FORBIDDEN', 403, message);
}

function validationFailed(message: string): never {
  throw new ApiError('VALIDATION_FAILED', 422, message);
}

function hashCode(code: string): string {
  return createHash('sha256').update(code).digest('hex');
}

function generateInviteCode(): string {
  return randomBytes(24).toString('base64url');
}

function inviteUrlFor(code: string): string {
  return `${env.WEB_ORIGIN}/clubs/join/${code}`;
}

function isUniqueViolation(err: unknown): boolean {
  const cause = err && typeof err === 'object' && 'cause' in err ? err.cause : err;
  return Boolean(
    cause && typeof cause === 'object' && 'code' in cause && cause.code === UNIQUE_VIOLATION,
  );
}

async function memberDtos(rows: MemberUserRow[], viewerId: string): Promise<ClubMemberDto[]> {
  const relations = await batchRelations(
    viewerId,
    rows.map((r) => r.userId),
  );
  return rows.map((r) => {
    const relation = relations.get(r.userId) ?? { isFriend: false, blocked: false };
    const visible = canView(r.profileVisibility, {
      isSelf: r.userId === viewerId,
      isFriend: relation.isFriend,
      blocked: relation.blocked,
    });
    return {
      user: visible
        ? {
            id: r.userId,
            username: r.username,
            displayUsername: r.displayUsername,
            name: r.name,
            image: r.image,
          }
        : {
            id: r.userId,
            username: null,
            displayUsername: null,
            name: ANONYMOUS_NAME,
            image: null,
          },
      role: r.role,
      joinedAt: r.joinedAt.toISOString(),
    };
  });
}

async function toDetailDto(club: ClubRow, viewerId: string | null): Promise<ClubDetailDto> {
  const member = viewerId ? await repo.findMember(club.id, viewerId) : undefined;
  const memberCount = await repo.countMembers(club.id);
  if (!member && club.visibility === 'private') {
    return {
      club: {
        slug: club.slug,
        name: club.name,
        visibility: club.visibility,
        description: null,
        provinceCode: null,
      },
      myRole: null,
      memberCount,
    };
  }
  const members = member ? await memberDtos(await repo.listMembers(club.id), viewerId!) : undefined;
  return {
    club: {
      id: club.id,
      slug: club.slug,
      name: club.name,
      visibility: club.visibility,
      description: club.description,
      provinceCode: club.provinceCode,
    },
    myRole: member?.role ?? null,
    memberCount,
    ...(members && { members }),
  };
}

async function requireClubById(id: string): Promise<ClubRow> {
  const club = await repo.findClubById(id);
  if (!club) notFound();
  return club;
}

export async function listMyClubsService(userId: string): Promise<ClubListResponse> {
  const rows = await repo.listClubsForUser(userId);
  const counts = await repo.memberCountsByClubIds(rows.map((r) => r.id));
  return { items: rows.map((r) => ({ ...r, memberCount: counts.get(r.id) ?? 0 })) };
}

export async function createClubService(
  userId: string,
  input: ClubCreateInput,
): Promise<ClubCreateResponse> {
  const code = generateInviteCode();
  const base = slugify(input.name) || 'club';

  let club: ClubRow | undefined;
  for (let attempt = 0; attempt < 3 && !club; attempt++) {
    const slug = attempt === 0 ? base : `${base}-${randomBytes(2).toString('hex')}`;
    try {
      club = await db.transaction(async (tx) => {
        const created = await repo.insertClub(
          {
            slug,
            name: input.name,
            description: input.description ?? null,
            provinceCode: input.provinceCode ?? null,
            visibility: 'private',
            inviteCodeHash: hashCode(code),
            createdBy: userId,
          },
          tx,
        );
        await repo.insertMember({ clubId: created.id, userId, role: 'owner' }, tx);
        return created;
      });
    } catch (err) {
      if (!isUniqueViolation(err) || attempt === 2) throw err;
    }
  }
  if (!club) throw new ApiError('INTERNAL', 500, 'Không tạo được club, thử lại');
  return { ...(await toDetailDto(club, userId)), inviteUrl: inviteUrlFor(code) };
}

export async function getClubBySlugService(
  slug: string,
  viewerId: string | null,
): Promise<ClubDetailDto> {
  const club = await repo.findClubBySlug(slug);
  if (!club) notFound();
  return toDetailDto(club, viewerId);
}

export async function updateClubService(
  clubId: string,
  userId: string,
  input: ClubUpdateInput,
): Promise<ClubDetailDto> {
  const row = await repo.updateClub(clubId, {
    ...(input.name !== undefined && { name: input.name }),
    ...(input.description !== undefined && { description: input.description }),
    ...(input.provinceCode !== undefined && { provinceCode: input.provinceCode }),
  });
  if (!row) notFound();
  return toDetailDto(row, userId);
}

export async function deleteClubService(clubId: string): Promise<void> {
  await db.transaction((tx) => repo.deleteClub(tx, clubId));
}

export async function rotateInviteCodeService(clubId: string): Promise<ClubInviteCodeResponse> {
  const code = generateInviteCode();
  const row = await repo.updateClub(clubId, { inviteCodeHash: hashCode(code) });
  if (!row) notFound();
  return { inviteUrl: inviteUrlFor(code) };
}

/** Matches `input` against an unclaimed external member (external id or login id) and links it
 * to `userId`. Ambiguous or unknown input returns false without saying which. */
async function matchExternalMember(
  tx: Tx,
  clubId: string,
  userId: string,
  input: string,
): Promise<boolean> {
  const matches = await repo.findExternalMatches(tx, clubId, input);
  const [only] = matches;
  if (matches.length !== 1 || !only) return false;
  if (only.userId) return only.userId === userId;
  return repo.claimExternalMember(tx, only.id, userId);
}

async function tryMatchExternal(clubId: string, userId: string, input: string): Promise<boolean> {
  try {
    return await db.transaction((tx) => matchExternalMember(tx, clubId, userId, input));
  } catch (err) {
    if (isUniqueViolation(err)) return false;
    throw err;
  }
}

export async function joinByCodeService(
  userId: string,
  code: string,
  input: ClubJoinInput,
): Promise<ClubJoinResponse> {
  const club = await repo.findClubByInviteHash(hashCode(code));
  if (!club) notFound();
  await repo.insertMember({ clubId: club.id, userId, role: 'member' });
  const member = await repo.findMember(club.id, userId);
  const externalMatched = input.externalId
    ? await tryMatchExternal(club.id, userId, input.externalId)
    : false;
  return { slug: club.slug, role: member?.role ?? 'member', externalMatched };
}

export async function matchExternalService(
  clubId: string,
  userId: string,
  externalId: string,
): Promise<{ matched: boolean }> {
  return { matched: await tryMatchExternal(clubId, userId, externalId) };
}

export async function listExternalMembersService(
  clubId: string,
): Promise<ClubExternalMembersResponse> {
  return { items: await repo.listExternalMembers(clubId) };
}

export async function unlinkExternalMemberService(clubId: string, memberId: string): Promise<void> {
  if (!(await repo.unlinkExternalMember(clubId, memberId))) notFound();
}

export async function addMemberService(
  clubId: string,
  actorId: string,
  input: ClubAddMemberInput,
): Promise<void> {
  if (input.userId === actorId) validationFailed('Bạn đã là thành viên');
  if (!(await areFriends(actorId, input.userId)) || (await isBlocked(actorId, input.userId))) {
    validationFailed('Chỉ có thể thêm bạn bè');
  }
  await repo.insertMember({ clubId, userId: input.userId, role: 'member' });
}

export async function leaveClubService(clubId: string, userId: string): Promise<void> {
  await db.transaction(async (tx) => {
    if (!(await repo.lockClub(tx, clubId))) notFound();
    const member = await repo.findMember(clubId, userId, tx);
    if (!member) notFound();
    if (member.role === 'owner') {
      validationFailed('Owner cần chuyển quyền trước khi rời club');
    }
    await repo.deleteMember(clubId, userId, tx);
  });
}

export async function removeMemberService(
  clubId: string,
  actorRole: ClubRole,
  actorId: string,
  targetId: string,
): Promise<void> {
  if (targetId === actorId) validationFailed('Dùng chức năng rời club');
  await db.transaction(async (tx) => {
    if (!(await repo.lockClub(tx, clubId))) notFound();
    const target = await repo.findMember(clubId, targetId, tx);
    if (!target) notFound();
    if (target.role === 'owner') forbidden();
    if (target.role === 'admin' && actorRole !== 'owner') forbidden();
    await repo.deleteMember(clubId, targetId, tx);
  });
}

export async function changeMemberRoleService(
  clubId: string,
  ownerId: string,
  targetId: string,
  role: ClubRole,
): Promise<void> {
  if (targetId === ownerId) validationFailed('Không thể đổi vai trò của chính bạn');
  await db.transaction(async (tx) => {
    if (!(await repo.lockClub(tx, clubId))) notFound();
    const target = await repo.findMember(clubId, targetId, tx);
    if (!target) notFound();
    await repo.updateMemberRole(clubId, targetId, role, tx);
    if (role === 'owner') await repo.updateMemberRole(clubId, ownerId, 'admin', tx);
  });
}

export async function adminListClubsService(): Promise<ClubAdminListResponse> {
  const rows = await repo.listAllClubs();
  return { items: rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() })) };
}

export async function adminDeleteClubService(clubId: string, actorUserId: string): Promise<void> {
  await requireClubById(clubId);
  await db.transaction(async (tx) => {
    await repo.deleteClub(tx, clubId);
    await tx.insert(adminAuditLog).values({
      actorUserId,
      action: 'club.delete',
      targetType: 'club',
      targetId: clubId,
    });
  });
}

/** Runs before the user row is deleted: hands each owned club to its longest-standing admin,
 * else longest-standing member; a club left with nobody is deleted. */
export async function handOverClubsBeforeUserDelete(userId: string): Promise<void> {
  for (const clubId of await repo.ownedClubIds(userId)) {
    await db.transaction(async (tx) => {
      if (!(await repo.lockClub(tx, clubId))) return;
      const owner = await repo.findMember(clubId, userId, tx);
      if (owner?.role !== 'owner') return;
      const successor = await repo.findSuccessor(tx, clubId, userId);
      if (successor) await repo.updateMemberRole(clubId, successor, 'owner', tx);
      else await repo.deleteClub(tx, clubId);
    });
  }
}
