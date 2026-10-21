import { createHash } from 'node:crypto';
import { eq, inArray } from 'drizzle-orm';
import { afterAll, describe, expect, it } from 'vitest';
import { db, pool } from '../../db/client.js';
import { clubLinkAttempts } from '../../db/schema/index.js';
import {
  LINK_ATTEMPT_LIMIT,
  LINK_ATTEMPT_LOCK_MS,
  LINK_ATTEMPT_WINDOW_MS,
  linkAttemptScopeKeys,
  runClubLinkAttempt,
  type LinkAttemptInput,
} from './link-lockout.js';
import type { Tx } from './repo.js';

const stamp = Date.now();
const createdScopeKeys = new Set<string>();

function input(tag: string, overrides: Partial<LinkAttemptInput> = {}): LinkAttemptInput {
  return {
    inviteCodeHash: createHash('sha256').update(`link-${tag}-${stamp}`).digest('hex'),
    clientIp: `192.0.2.${(tag.length % 200) + 1}`,
    userId: `link-lockout-${tag}-${stamp}`,
    ...overrides,
  };
}

async function run(
  scopes: LinkAttemptInput,
  success: boolean,
  now: Date,
): Promise<boolean> {
  let called = false;
  const result = await trackedAttempt(
    scopes,
    async () => {
      called = true;
      return { success, value: true };
    },
    now,
  );
  return result.status === 'complete' && called;
}

async function trackedAttempt<T>(
  scopes: LinkAttemptInput,
  attempt: (tx: Tx) => Promise<{ success: boolean; value: T }>,
  now?: Date,
) {
  for (const key of Object.values(linkAttemptScopeKeys(scopes))) createdScopeKeys.add(key);
  return runClubLinkAttempt(scopes, attempt, now);
}

async function rowsFor(keys: string[]) {
  return db
    .select()
    .from(clubLinkAttempts)
    .where(inArray(clubLinkAttempts.scopeKey, keys));
}

afterAll(async () => {
  const scopeKeys = [...createdScopeKeys];
  if (scopeKeys.length > 0) {
    await db.delete(clubLinkAttempts).where(inArray(clubLinkAttempts.scopeKey, scopeKeys));
  }
  await pool.end();
});

describe('club member link lockout', () => {
  it('locks after five failures in the window and expires after an hour', async () => {
    const scopes = input('threshold');
    const start = new Date();

    for (let failure = 0; failure < LINK_ATTEMPT_LIMIT; failure++) {
      const result = await run(
        scopes,
        false,
        new Date(start.getTime() + failure * 60_000),
      );
      expect(result).toBe(true);
    }

    const keys = linkAttemptScopeKeys(scopes);
    const rows = await rowsFor(Object.values(keys));
    expect(rows).toHaveLength(3);
    expect(rows.every((row) => row.failures === LINK_ATTEMPT_LIMIT)).toBe(true);
    expect(rows.every((row) => row.lockedUntil !== null)).toBe(true);
    expect(rows.every((row) => row.lockedUntil!.getTime() === start.getTime() + 4 * 60_000 + LINK_ATTEMPT_LOCK_MS)).toBe(
      true,
    );

    const blockedAt = new Date(start.getTime() + 5 * 60_000);
    const blocked = await trackedAttempt(
      scopes,
      async () => ({ success: true, value: true }),
      blockedAt,
    );
    expect(blocked).toEqual({ status: 'locked' });

    const allowedAt = new Date(start.getTime() + 4 * 60_000 + LINK_ATTEMPT_LOCK_MS + 1);
    const allowed = await trackedAttempt(
      scopes,
      async () => ({ success: true, value: true }),
      allowedAt,
    );
    expect(allowed).toEqual({ status: 'complete', value: true });
  });

  it('serializes concurrent failures at the threshold without extending the lock window', async () => {
    const scopes = input('concurrent-threshold', { clientIp: '203.0.113.240' });
    const now = new Date();
    let matchQueries = 0;

    const results = await Promise.all(
      Array.from({ length: LINK_ATTEMPT_LIMIT + 3 }, () =>
        trackedAttempt(
          scopes,
          async () => {
            matchQueries++;
            return { success: false, value: true };
          },
          now,
        ),
      ),
    );

    expect(results.filter((result) => result.status === 'complete')).toHaveLength(LINK_ATTEMPT_LIMIT);
    expect(results.filter((result) => result.status === 'locked')).toHaveLength(3);
    expect(matchQueries).toBe(LINK_ATTEMPT_LIMIT);

    const keys = linkAttemptScopeKeys(scopes);
    const lockedUntil = new Date(now.getTime() + LINK_ATTEMPT_LOCK_MS);
    const rows = await rowsFor(Object.values(keys));
    expect(rows).toHaveLength(3);
    expect(rows.every((row) => row.failures === LINK_ATTEMPT_LIMIT)).toBe(true);
    expect(rows.every((row) => row.lockedUntil?.getTime() === lockedUntil.getTime())).toBe(true);

    const subsequent = await trackedAttempt(
      scopes,
      async () => {
        matchQueries++;
        return { success: false, value: true };
      },
      new Date(now.getTime() + 1000),
    );
    expect(subsequent).toEqual({ status: 'locked' });
    expect(matchQueries).toBe(LINK_ATTEMPT_LIMIT);

    const rowsAfterBlockedAttempt = await rowsFor(Object.values(keys));
    expect(rowsAfterBlockedAttempt.every((row) => row.failures === LINK_ATTEMPT_LIMIT)).toBe(true);
    expect(rowsAfterBlockedAttempt.every((row) => row.lockedUntil?.getTime() === lockedUntil.getTime())).toBe(
      true,
    );
  });

  it('keeps link, IP, and user scopes independent', async () => {
    const sharedLink = input('shared-link');
    for (let attempt = 0; attempt < LINK_ATTEMPT_LIMIT; attempt++) {
      expect(
        await run(
          {
            ...sharedLink,
            clientIp: `198.51.100.${attempt + 1}`,
            userId: `link-scope-user-${attempt}-${stamp}`,
          },
          false,
          new Date(),
        ),
      ).toBe(true);
    }

    const linkLocked = await trackedAttempt(
      { ...sharedLink, clientIp: '198.51.100.99', userId: `link-scope-final-${stamp}` },
      async () => ({ success: true, value: true }),
    );
    expect(linkLocked).toEqual({ status: 'locked' });

    const differentLink = await trackedAttempt(
      {
        ...input('different-link', { clientIp: '198.51.100.99' }),
        userId: `link-scope-final-${stamp}`,
      },
      async () => ({ success: true, value: true }),
    );
    expect(differentLink.status).toBe('complete');

    const sharedIp = '203.0.113.200';
    const attemptedLinks: LinkAttemptInput[] = [];
    for (let attempt = 0; attempt < LINK_ATTEMPT_LIMIT; attempt++) {
      const attemptInput = input(`ip-scope-${attempt}`, {
        clientIp: sharedIp,
        userId: `ip-scope-user-${attempt}-${stamp}`,
      });
      attemptedLinks.push(attemptInput);
      expect(await run(attemptInput, false, new Date())).toBe(true);
    }

    const ipLocked = await trackedAttempt(
      input('ip-scope-final', { clientIp: sharedIp, userId: `ip-scope-final-${stamp}` }),
      async () => ({ success: true, value: true }),
    );
    expect(ipLocked).toEqual({ status: 'locked' });

    const differentIp = await trackedAttempt(
      { ...attemptedLinks[0]!, clientIp: '203.0.113.201', userId: `ip-scope-final-${stamp}` },
      async () => ({ success: true, value: true }),
    );
    expect(differentIp.status).toBe('complete');

    const sharedUserId = `user-scope-${stamp}`;
    for (let attempt = 0; attempt < LINK_ATTEMPT_LIMIT; attempt++) {
      expect(
        await run(
          input(`user-scope-${attempt}`, {
            clientIp: `192.0.2.${attempt + 20}`,
            userId: sharedUserId,
          }),
          false,
          new Date(),
        ),
      ).toBe(true);
    }

    const lockedUserScopes = input('user-scope-locked', {
      clientIp: '192.0.2.99',
      userId: sharedUserId,
    });
    const userLocked = await trackedAttempt(
      lockedUserScopes,
      async () => ({ success: true, value: true }),
    );
    expect(userLocked).toEqual({ status: 'locked' });

    const differentUser = await trackedAttempt(
      { ...lockedUserScopes, userId: `user-scope-other-${stamp}` },
      async () => ({ success: true, value: true }),
    );
    expect(differentUser.status).toBe('complete');
  });

  it('resets only the user scope after a successful bind and stores only keyed scopes', async () => {
    const scopes = input('success-reset');
    const start = new Date();
    expect(await run(scopes, false, start)).toBe(true);
    expect(await run(scopes, true, new Date(start.getTime() + 1000))).toBe(true);

    const keys = linkAttemptScopeKeys(scopes);
    const rows = await rowsFor(Object.values(keys));
    const byKey = new Map(rows.map((row) => [row.scopeKey, row]));
    expect(byKey.get(keys.link)?.failures).toBe(1);
    expect(byKey.get(keys.ip)?.failures).toBe(1);
    expect(byKey.get(keys.user)?.failures).toBe(0);
    expect(Object.values(keys).every((key) => /^[a-f0-9]{64}$/.test(key))).toBe(true);
    expect(JSON.stringify(rows)).not.toContain(scopes.inviteCodeHash);
    expect(JSON.stringify(rows)).not.toContain(scopes.clientIp);
    expect(JSON.stringify(rows)).not.toContain(scopes.userId);

    const userRows = await db
      .select()
      .from(clubLinkAttempts)
      .where(eq(clubLinkAttempts.scopeKey, keys.user));
    expect(userRows[0]?.lockedUntil).toBeNull();
  });

  it('starts a new failure window after fifteen minutes', async () => {
    const scopes = input('window-reset');
    const start = new Date();
    for (let failure = 0; failure < LINK_ATTEMPT_LIMIT - 1; failure++) {
      expect(await run(scopes, false, start)).toBe(true);
    }

    const nextWindow = new Date(start.getTime() + LINK_ATTEMPT_WINDOW_MS + 1);
    expect(await run(scopes, false, nextWindow)).toBe(true);
    const keys = linkAttemptScopeKeys(scopes);
    const rows = await rowsFor(Object.values(keys));
    expect(rows.every((row) => row.failures === 1)).toBe(true);
    expect(rows.every((row) => row.lockedUntil === null)).toBe(true);
  });
});
