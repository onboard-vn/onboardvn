import type { GameUpcCandidate } from '@onboard/shared';
import { eq } from 'drizzle-orm';
import { db } from '../../db/client.js';
import { barcodeLookups } from '../../db/schema/index.js';

interface CachedLookupResult {
  items: GameUpcCandidate[];
}

export const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
export const ONE_DAY_MS = 24 * 60 * 60 * 1000;

export async function findCachedLookup(code: string): Promise<GameUpcCandidate[] | null> {
  const [row] = await db
    .select()
    .from(barcodeLookups)
    .where(eq(barcodeLookups.code, code))
    .limit(1);
  if (!row || row.expiresAt.getTime() < Date.now()) return null;
  return (row.result as CachedLookupResult).items;
}

export async function upsertCachedLookup(
  code: string,
  provider: string,
  items: GameUpcCandidate[],
  ttlMs: number,
): Promise<void> {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + ttlMs);
  const values = {
    code,
    provider,
    result: { items } satisfies CachedLookupResult,
    fetchedAt: now,
    expiresAt,
  };
  await db
    .insert(barcodeLookups)
    .values(values)
    .onConflictDoUpdate({ target: barcodeLookups.code, set: values });
}
