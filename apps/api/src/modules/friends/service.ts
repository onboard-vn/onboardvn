import { randomBytes } from 'node:crypto';
import type { FriendCodeDto, FriendsListResult, FriendSummary } from '@onboard/shared';
import { db } from '../../db/client.js';
import { env } from '../../lib/env.js';
import { ApiError } from '../../lib/errors.js';
import { logger } from '../../lib/logger.js';
import { friendRequestEmail, mailer } from '../../lib/mailer/index.js';
import { areFriends, canView, isBlocked, loadViewerRelation } from '../../lib/visibility.js';
import * as repo from './repo.js';

const MAX_OUTGOING_PENDING = 50;
const DECLINE_COOLDOWN_DAYS = 7;
const DECLINE_COOLDOWN_MS = DECLINE_COOLDOWN_DAYS * 24 * 60 * 60 * 1000;

function notFound(): never {
  throw new ApiError('NOT_FOUND', 404, 'Không tìm thấy người dùng');
}

async function requireUserById(userId: string) {
  const row = await repo.getUserPrivacy(userId);
  if (!row) notFound();
  return row;
}

async function requireUserByUsername(username: string) {
  const row = await repo.findUserByUsername(username.toLowerCase());
  if (!row) notFound();
  return row;
}

async function assertNotBlocked(actorId: string, otherId: string): Promise<void> {
  if (await isBlocked(actorId, otherId)) {
    throw new ApiError('FORBIDDEN', 403, 'Không thể thực hiện thao tác với người dùng này');
  }
}

export async function getFriendCodeService(userId: string): Promise<FriendCodeDto> {
  const row = await requireUserById(userId);
  return { code: row.friendCode };
}

export async function rotateFriendCodeService(userId: string): Promise<FriendCodeDto> {
  const code = randomBytes(12).toString('base64url');
  await repo.rotateFriendCode(userId, code);
  return { code };
}

export async function previewInviteService(code: string): Promise<FriendSummary> {
  const row = await repo.findUserByFriendCode(code);
  if (!row) notFound();
  return row;
}

export async function confirmInviteService(
  actorId: string,
  code: string,
): Promise<{ status: 'friends' }> {
  const target = await repo.findUserByFriendCode(code);
  if (!target) notFound();
  if (target.id === actorId) {
    throw new ApiError('VALIDATION_FAILED', 422, 'Không thể tự kết bạn với chính mình');
  }
  await assertNotBlocked(actorId, target.id);

  await db.transaction(async (tx) => {
    await repo.insertFriendship(actorId, target.id, tx);
    await repo.deleteRequestsBetween(actorId, target.id, tx);
  });
  return { status: 'friends' };
}

export interface SendFriendRequestResult {
  status: 'pending' | 'accepted';
}

export async function sendFriendRequestService(
  actorId: string,
  username: string,
): Promise<SendFriendRequestResult> {
  const actor = await requireUserById(actorId);
  const targetRef = await requireUserByUsername(username);
  const target = await requireUserById(targetRef.id);
  if (target.id === actorId) {
    throw new ApiError('VALIDATION_FAILED', 422, 'Không thể tự gửi lời mời cho chính mình');
  }
  await assertNotBlocked(actorId, target.id);

  const result = await db.transaction(async (tx) => {
    await repo.lockPair(tx, actorId, target.id);

    if (await areFriends(actorId, target.id, tx)) return { status: 'accepted' as const };

    const reverse = await repo.findRequest(target.id, actorId, tx);
    if (reverse?.status === 'pending') {
      await repo.insertFriendship(actorId, target.id, tx);
      await repo.deleteRequestsBetween(actorId, target.id, tx);
      return { status: 'accepted' as const };
    }

    const forward = await repo.findRequest(actorId, target.id, tx);
    if (forward?.status === 'pending') return { status: 'pending' as const };

    if (forward?.status === 'declined' && forward.respondedAt) {
      const cooldownStart = new Date(Date.now() - DECLINE_COOLDOWN_MS);
      if (forward.respondedAt > cooldownStart) {
        throw new ApiError('CONFLICT', 409, 'Lời mời đã bị từ chối gần đây, thử lại sau vài ngày');
      }
      await repo.deleteRequest(actorId, target.id, tx);
    }

    const outgoingPending = await repo.countOutgoingPending(actorId, tx);
    if (outgoingPending >= MAX_OUTGOING_PENDING) {
      throw new ApiError('CONFLICT', 409, 'Bạn đang có quá nhiều lời mời đang chờ');
    }

    await repo.insertRequest(actorId, target.id, tx);
    return { status: 'pending' as const };
  });

  if (result.status === 'pending' && target.emailOnFriendRequest) {
    mailer
      .send({ to: target.email, ...friendRequestEmail(actor.name, `${env.WEB_ORIGIN}/ban-be`) })
      .catch((err: unknown) => logger.error({ err }, 'friend request email failed'));
  }

  return result;
}

export function listFriendRequestsService(userId: string, dir: 'in' | 'out') {
  return repo.listRequests(userId, dir);
}

export function countIncomingRequestsService(userId: string): Promise<number> {
  return repo.countIncomingPending(userId);
}

export async function acceptFriendRequestService(
  actorId: string,
  fromUserId: string,
): Promise<void> {
  const request = await repo.findRequest(fromUserId, actorId);
  if (!request || request.status !== 'pending') notFound();
  await db.transaction(async (tx) => {
    await repo.insertFriendship(actorId, fromUserId, tx);
    await repo.deleteRequestsBetween(actorId, fromUserId, tx);
  });
}

export async function declineFriendRequestService(
  actorId: string,
  fromUserId: string,
): Promise<void> {
  const request = await repo.findRequest(fromUserId, actorId);
  if (!request || request.status !== 'pending') notFound();
  await repo.markRequestDeclined(fromUserId, actorId);
}

export async function cancelFriendRequestService(actorId: string, toUserId: string): Promise<void> {
  const deleted = await repo.deleteRequest(actorId, toUserId);
  if (!deleted) notFound();
}

export function listFriendsService(userId: string): Promise<FriendSummary[]> {
  return repo.listFriends(userId);
}

export async function unfriendService(actorId: string, otherUserId: string): Promise<void> {
  const deleted = await repo.deleteFriendship(actorId, otherUserId);
  if (!deleted) notFound();
}

export async function getFriendsForProfileService(
  viewerId: string | null,
  username: string,
): Promise<FriendsListResult> {
  const target = await requireUserByUsername(username);
  const privacy = await repo.getUserPrivacy(target.id);
  if (!privacy) notFound();
  const relation = await loadViewerRelation(viewerId, target.id);
  if (!canView(privacy.friendsVisibility, relation)) return { hidden: true };
  return { items: await repo.listFriends(target.id) };
}

export async function blockUserService(actorId: string, targetUserId: string): Promise<void> {
  if (targetUserId === actorId) {
    throw new ApiError('VALIDATION_FAILED', 422, 'Không thể tự chặn chính mình');
  }
  await requireUserById(targetUserId);
  await db.transaction(async (tx) => {
    await repo.insertBlock(actorId, targetUserId, tx);
    await repo.deleteFriendship(actorId, targetUserId, tx);
    await repo.deleteRequestsBetween(actorId, targetUserId, tx);
  });
}

export async function unblockUserService(actorId: string, targetUserId: string): Promise<void> {
  await repo.deleteBlock(actorId, targetUserId);
}

export function listBlocksService(actorId: string): Promise<FriendSummary[]> {
  return repo.listBlocks(actorId);
}

export async function updatePrivacyService(
  actorId: string,
  input: Parameters<typeof repo.updatePrivacy>[1],
): Promise<void> {
  await repo.updatePrivacy(actorId, input);
}
