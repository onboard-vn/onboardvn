import { createHash, randomBytes } from 'node:crypto';
import type {
  CafeConsentDecisionInput,
  CafeMemberDto,
  CafeMembershipDto,
  CafeOwnerInviteCreatedDto,
  CafeOwnerInviteDto,
  CafeOwnerInvitePreviewDto,
  InventoryImportApplyInput,
  InventoryImportApplyResponse,
  InventoryImportDryRunResponse,
} from '@onboard/shared';
import { db } from '../../db/client.js';
import { env } from '../../lib/env.js';
import { ApiError } from '../../lib/errors.js';
import { logger } from '../../lib/logger.js';
import { cafeConsentDeclinedEmail, mailer } from '../../lib/mailer/index.js';
import { matchInventoryRows, MAX_IMPORT_ROWS, parseInventoryCsv } from './inventory-import.js';
import * as repo from './repo.js';

const INVITE_TTL_MS = 30 * 24 * 60 * 60 * 1000;

function notFound(): never {
  throw new ApiError('NOT_FOUND', 404, 'Không tìm thấy quán');
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export async function createOwnerInviteService(
  cafeId: string,
  actorId: string,
): Promise<CafeOwnerInviteCreatedDto> {
  const cafe = await repo.findCafeMinimal(cafeId);
  if (!cafe) notFound();

  const token = randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + INVITE_TTL_MS);

  await db.transaction(async (tx) => {
    await repo.lockCafeRow(cafeId, tx);
    await repo.revokeActiveInvites(cafeId, tx);
    await repo.insertInvite(
      { tokenHash: hashToken(token), cafeId, createdBy: actorId, expiresAt },
      tx,
    );
  });

  return { url: `${env.WEB_ORIGIN}/my-cafes/invite/${token}`, expiresAt: expiresAt.toISOString() };
}

export async function listOwnerInvitesService(cafeId: string): Promise<CafeOwnerInviteDto[]> {
  const rows = await repo.listInvites(cafeId);
  return rows.map((row) => ({
    id: row.id,
    cafeId: row.cafeId,
    createdBy: row.createdBy,
    createdAt: row.createdAt.toISOString(),
    expiresAt: row.expiresAt.toISOString(),
    usedAt: row.usedAt ? row.usedAt.toISOString() : null,
    usedBy: row.usedBy,
    revokedAt: row.revokedAt ? row.revokedAt.toISOString() : null,
  }));
}

export async function revokeOwnerInviteService(cafeId: string, inviteId: string): Promise<void> {
  const revoked = await repo.revokeInvite(cafeId, inviteId);
  if (!revoked) throw new ApiError('NOT_FOUND', 404, 'Không tìm thấy link mời còn hiệu lực');
}

export async function previewOwnerInviteService(token: string): Promise<CafeOwnerInvitePreviewDto> {
  const invite = await repo.findInviteByTokenHash(hashToken(token));
  if (!invite) notFound();

  const status = invite.usedAt
    ? 'used'
    : invite.revokedAt
      ? 'revoked'
      : invite.expiresAt < new Date()
        ? 'expired'
        : 'valid';

  return { cafeName: invite.cafe.name, status };
}

export interface AcceptOwnerInviteResult {
  cafeId: string;
  cafeSlug: string;
}

export async function acceptOwnerInviteService(
  actorId: string,
  token: string,
): Promise<AcceptOwnerInviteResult> {
  const tokenHash = hashToken(token);

  return db.transaction(async (tx) => {
    const invite = await repo.findInviteByTokenHashForUpdate(tx, tokenHash);
    if (!invite) notFound();
    if (invite.usedAt || invite.revokedAt || invite.expiresAt < new Date()) {
      throw new ApiError('CONFLICT', 410, 'Link mời đã hết hạn hoặc không còn hiệu lực');
    }

    await repo.markInviteUsed(invite.id, actorId, tx);
    await repo.upsertCafeMemberAsOwner(invite.cafeId, actorId, tx);

    const cafe = await repo.findCafeMinimal(invite.cafeId, tx);
    if (!cafe) notFound();
    return { cafeId: cafe.id, cafeSlug: cafe.slug };
  });
}

async function requireOwner(cafeId: string, actorId: string): Promise<void> {
  const member = await repo.findCafeMember(cafeId, actorId);
  if (!member || member.role !== 'owner') {
    throw new ApiError('FORBIDDEN', 403, 'Chỉ chủ quán mới thực hiện được thao tác này');
  }
}

export async function setCafeConsentService(
  cafeId: string,
  actorId: string,
  input: CafeConsentDecisionInput,
): Promise<void> {
  await requireOwner(cafeId, actorId);
  const cafe = await repo.findCafeMinimal(cafeId);
  if (!cafe) notFound();

  if (input.decision === 'granted') {
    // Clears any lingering decline reason from a previous cycle unless a fresh note is given.
    await repo.updateConsent(cafeId, {
      consentStatus: 'granted',
      verifiedAt: new Date(),
      consentNote: input.reason ?? null,
    });
    return;
  }

  await repo.updateConsent(cafeId, {
    consentStatus: 'declined',
    consentNote: input.reason ?? null,
  });

  const admins = await repo.findAdminEmails();
  for (const email of admins) {
    mailer
      .send({ to: email, ...cafeConsentDeclinedEmail(cafe.name, input.reason) })
      .catch((err: unknown) => logger.error({ err }, 'cafe consent declined email failed'));
  }
}

export async function addCafeStaffService(
  cafeId: string,
  actorId: string,
  username: string,
): Promise<void> {
  await requireOwner(cafeId, actorId);
  const targetId = await repo.findUserIdByUsername(username);
  if (!targetId) throw new ApiError('NOT_FOUND', 404, 'Không tìm thấy người dùng');
  await repo.insertCafeMember(cafeId, targetId, 'staff');
}

export async function listCafeMembersService(cafeId: string): Promise<CafeMemberDto[]> {
  const rows = await repo.listCafeMembers(cafeId);
  return rows.map((row) => ({
    userId: row.userId,
    role: row.role as CafeMemberDto['role'],
    username: row.username,
    name: row.name,
    createdAt: row.createdAt.toISOString(),
  }));
}

export async function removeCafeMemberService(cafeId: string, userId: string): Promise<void> {
  const removed = await repo.deleteCafeMember(cafeId, userId);
  if (!removed) throw new ApiError('NOT_FOUND', 404, 'Không tìm thấy thành viên');
}

export function countMyMembershipsService(userId: string): Promise<number> {
  return repo.countMembershipsForUser(userId);
}

export async function listMyMembershipsService(userId: string): Promise<CafeMembershipDto[]> {
  const rows = await repo.listMembershipsForUser(userId);
  return rows.map((row) => ({
    cafeId: row.cafeId,
    cafeSlug: row.cafeSlug,
    cafeName: row.cafeName,
    role: row.role as CafeMembershipDto['role'],
    consentStatus: row.consentStatus,
  }));
}

export async function dryRunInventoryImportService(
  cafeId: string,
  csvContent: string,
): Promise<InventoryImportDryRunResponse> {
  const cafe = await repo.findCafeMinimal(cafeId);
  if (!cafe) notFound();

  let parsed: ReturnType<typeof parseInventoryCsv>;
  try {
    parsed = parseInventoryCsv(csvContent);
  } catch {
    throw new ApiError('VALIDATION_FAILED', 422, 'File CSV không hợp lệ');
  }
  if (parsed.tooManyRows) {
    throw new ApiError('VALIDATION_FAILED', 422, `Tối đa ${MAX_IMPORT_ROWS} dòng`);
  }

  const rows = await matchInventoryRows(parsed.rows);
  return { rows };
}

export async function applyInventoryImportService(
  cafeId: string,
  actorId: string,
  input: InventoryImportApplyInput,
): Promise<InventoryImportApplyResponse> {
  const cafe = await repo.findCafeMinimal(cafeId);
  if (!cafe) notFound();

  // Dedupe by gameId: later rows in the payload win over earlier ones for the same game.
  const byGameId = new Map<string, number>();
  for (const row of input.rows) {
    if (row.gameId) byGameId.set(row.gameId, row.copies);
  }
  const items = [...byGameId.entries()].map(([gameId, copies]) => ({ gameId, copies }));
  if (items.length === 0) {
    throw new ApiError('VALIDATION_FAILED', 422, 'Không có dòng nào được chọn để áp dụng');
  }

  const existingIds = await repo.findExistingGameIds(items.map((i) => i.gameId));
  const missing = items.filter((i) => !existingIds.has(i.gameId));
  if (missing.length > 0) {
    throw new ApiError('VALIDATION_FAILED', 422, 'Có game không tồn tại trong danh mục');
  }

  await db.transaction(async (tx) => {
    await repo.upsertCafeGamesTx(tx, cafeId, items, actorId);
    await repo.insertInventoryImportAudit(tx, cafeId, actorId, items.length);
  });

  return { rowsApplied: items.length };
}
