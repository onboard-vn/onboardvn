import type { GameAliasDto } from '@onboard/shared';
import { sql } from 'drizzle-orm';
import { db } from '../../db/client.js';
import { ApiError } from '../../lib/errors.js';
import type { Tx } from './repo.js';

export function normalizeAliasName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[đĐ]/g, 'd')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

export function dedupeAliases(aliases: GameAliasDto[]): GameAliasDto[] {
  const names = new Set<string>();
  return aliases.filter((alias) => {
    const key = normalizeAliasName(alias.name);
    if (names.has(key)) return false;
    names.add(key);
    return true;
  });
}

/** Serialize identity changes with merge and prevent a concurrent edit creating a variant cycle. */
export async function withGameIdentityLock<T>(fn: (tx: Tx) => Promise<T>): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`set local lock_timeout = '5s'`);
    await tx.execute(sql`lock table games in share row exclusive mode`);
    return fn(tx);
  });
}

export async function validateVariant(
  tx: Tx,
  id: string | null,
  parentId: string | null | undefined,
): Promise<void> {
  if (!parentId) return;
  const rows = await tx.execute<{
    id: string;
    canonical_id: string | null;
    variant_of_id: string | null;
  }>(sql`select id, canonical_id, variant_of_id from games`);
  const byId = new Map(rows.rows.map((row) => [row.id, row]));
  let current: string | null = parentId;
  const seen = new Set<string>(id ? [id] : []);
  while (current) {
    if (seen.has(current)) throw new ApiError('CONFLICT', 409, 'Quan hệ phiên bản tạo vòng lặp');
    seen.add(current);
    const row = byId.get(current);
    if (!row || row.canonical_id)
      throw new ApiError('VALIDATION_FAILED', 422, 'Game gốc không hợp lệ; chọn game chuẩn');
    current = row.variant_of_id;
  }
}
