import { createHmac } from 'node:crypto';
import { db } from '../../db/client.js';
import * as repo from './repo.js';
import type { Tx } from './repo.js';

export const LINK_ATTEMPT_LIMIT = 5;
export const LINK_ATTEMPT_WINDOW_MS = 15 * 60 * 1000;
export const LINK_ATTEMPT_LOCK_MS = 60 * 60 * 1000;

export interface LinkAttemptInput {
  inviteCodeHash: string;
  clientIp: string;
  userId: string;
}

export interface LinkAttemptScopeKeys {
  link: string;
  ip: string;
  user: string;
}

export type LinkAttemptResult<T> =
  | { status: 'locked' }
  | { status: 'complete'; value: T };

function digestScope(prefix: keyof LinkAttemptScopeKeys, value: string): string {
  const key = process.env.CLUB_LOGIN_HMAC_KEY;
  if (!key || key.length < 32) throw new Error('Club link scope key is not configured');
  return createHmac('sha256', key).update(`${prefix}:${value}`).digest('hex');
}

export function linkAttemptScopeKeys(input: LinkAttemptInput): LinkAttemptScopeKeys {
  return {
    link: digestScope('link', input.inviteCodeHash),
    ip: digestScope('ip', input.clientIp),
    user: digestScope('user', input.userId),
  };
}

export async function runClubLinkAttempt<T>(
  input: LinkAttemptInput,
  attempt: (tx: Tx) => Promise<{ success: boolean; value: T }>,
  now: Date = new Date(),
): Promise<LinkAttemptResult<T>> {
  const scopes = linkAttemptScopeKeys(input);
  return db.transaction(async (tx) => {
    const rows = await repo.lockLinkAttemptScopes(tx, Object.values(scopes), now);
    if (rows.some((row) => row.lockedUntil && row.lockedUntil > now)) {
      return { status: 'locked' };
    }

    const result = await attempt(tx);
    if (result.success) {
      await repo.updateLinkAttemptScope(tx, scopes.user, {
        failures: 0,
        windowStartedAt: now,
        lockedUntil: null,
        updatedAt: now,
      });
    } else {
      for (const scopeKey of Object.values(scopes)) {
        const row = rows.find((candidate) => candidate.scopeKey === scopeKey);
        if (!row) throw new Error('Club link attempt scope was not initialized');
        const expired = now.getTime() - row.windowStartedAt.getTime() >= LINK_ATTEMPT_WINDOW_MS;
        const failures = expired ? 1 : row.failures + 1;
        await repo.updateLinkAttemptScope(tx, scopeKey, {
          failures,
          windowStartedAt: expired ? now : row.windowStartedAt,
          lockedUntil:
            failures >= LINK_ATTEMPT_LIMIT ? new Date(now.getTime() + LINK_ATTEMPT_LOCK_MS) : null,
          updatedAt: now,
        });
      }
    }
    return { status: 'complete', value: result.value };
  });
}
