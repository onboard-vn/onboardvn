import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { eq, inArray } from 'drizzle-orm';
import { createApp } from '../app.js';
import { db, pool } from '../db/client.js';
import { users, verifications } from '../db/schema/index.js';
import { onMailSent, type MailMessage } from '../lib/mailer/index.js';
import { auth } from './better-auth.js';

const app = createApp({ auth, rateLimit: false });
const stamp = Date.now();
const email = `pw-${stamp}@example.test`;
const otherEmail = `pw2-${stamp}@example.test`;
const username = `tester_${stamp}`.slice(0, 30);
const password = 'correct horse 1';
const newPassword = 'battery staple 2';
const headers = { 'content-type': 'application/json', origin: 'http://localhost:3000' };

const post = (path: string, body: unknown, extra: Record<string, string> = {}) =>
  app.request(`/api/auth${path}`, {
    method: 'POST',
    headers: { ...headers, ...extra },
    body: JSON.stringify(body),
  });

const cookieOf = (res: Response) =>
  res.headers
    .getSetCookie()
    .map((c) => c.split(';')[0])
    .join('; ');

/** Mail is sent in the background, so wait for `expected` messages (or a quiet period for 0). */
async function captureMail(
  action: () => Response | Promise<Response>,
  expected = 1,
): Promise<[Response, MailMessage[]]> {
  const sent: MailMessage[] = [];
  const stop = onMailSent((m) => sent.push(m));
  try {
    const res = await action();
    if (expected > 0) await expect.poll(() => sent.length).toBeGreaterThanOrEqual(expected);
    else await new Promise((resolve) => setTimeout(resolve, 150));
    return [res, sent];
  } finally {
    stop();
  }
}

const linkIn = (mail: MailMessage) => new URL(mail.text.match(/https?:\/\/\S+/)![0]);

async function cleanup() {
  await db.delete(users).where(inArray(users.email, [email, otherEmail]));
}

beforeAll(cleanup);
afterAll(async () => {
  await cleanup();
  await pool.end();
});

describe('username + password auth', () => {
  it('signs up, normalizes the username and sends a verification email', async () => {
    const [res, sent] = await captureMail(() =>
      post('/sign-up/email', { email, password, name: 'Tester', username: username.toUpperCase() }),
    );
    expect(res.status).toBe(200);
    expect(sent).toHaveLength(1);
    expect(sent[0]!.to).toBe(email);
    expect(linkIn(sent[0]!).pathname).toBe('/api/auth/verify-email');
  });

  it('blocks sign-in before verification and resends the email', async () => {
    const [res, sent] = await captureMail(() => post('/sign-in/username', { username, password }));
    expect(res.status).toBe(403);
    expect(await res.json()).toMatchObject({ code: 'EMAIL_NOT_VERIFIED' });
    expect(sent.map((m) => m.to)).toEqual([email]);
  });

  it('verifies via the emailed link, then signs in with username or email', async () => {
    const [, sent] = await captureMail(() => post('/sign-in/email', { email, password }));
    const link = linkIn(sent[0]!);
    const verify = await app.request(`${link.pathname}${link.search}`);
    expect([200, 302]).toContain(verify.status);

    const byUsername = await post('/sign-in/username', { username, password });
    expect(byUsername.status).toBe(200);
    const byEmail = await post('/sign-in/email', { email, password });
    expect(byEmail.status).toBe(200);

    const me = await app.request('/api/me', { headers: { cookie: cookieOf(byEmail) } });
    expect(await me.json()).toMatchObject({ user: { email, username } });
  });

  it('does not reveal an existing email on sign-up', async () => {
    const [res, sent] = await captureMail(
      () => post('/sign-up/email', { email, password, name: 'Dup', username: `dup_${stamp}` }),
      0,
    );
    expect(res.status).toBe(200);
    expect(sent).toHaveLength(0);
  });

  it('does not reveal an unknown email on password reset', async () => {
    const [res, sent] = await captureMail(
      () =>
        post('/request-password-reset', {
          email: `nobody-${stamp}@example.test`,
          redirectTo: 'http://localhost:3000/dat-lai-mat-khau',
        }),
      0,
    );
    expect(res.status).toBe(200);
    expect(sent).toHaveLength(0);
  });

  it('signs in with a mixed-case username', async () => {
    const res = await post('/sign-in/username', { username: username.toUpperCase(), password });
    expect(res.status).toBe(200);
  });

  it('rejects a wrong password', async () => {
    const res = await post('/sign-in/username', { username, password: 'wrong password' });
    expect(res.status).toBe(401);
  });

  it('rejects taken, reserved and malformed usernames with a specific code', async () => {
    const base = { email: otherEmail, password, name: 'Other' };
    const cases: [string, string][] = [
      [username, 'USERNAME_IS_ALREADY_TAKEN'],
      ['admin', 'INVALID_USERNAME'],
      ['bad name!', 'INVALID_USERNAME'],
      ['ab', 'USERNAME_TOO_SHORT'],
    ];
    for (const [value, code] of cases) {
      const res = await post('/sign-up/email', { ...base, username: value });
      expect(res.status, value).toBe(400);
      expect(await res.json(), value).toMatchObject({ code });
    }
  });

  it('resets the password via a single-use link and revokes old sessions', async () => {
    const oldSession = cookieOf(await post('/sign-in/email', { email, password }));

    const [res, sent] = await captureMail(() =>
      post('/request-password-reset', {
        email,
        redirectTo: 'http://localhost:3000/dat-lai-mat-khau',
      }),
    );
    expect(res.status).toBe(200);
    const token = linkIn(sent[0]!).pathname.split('/').pop()!;

    expect((await post('/reset-password', { token, newPassword })).status).toBe(200);
    expect((await post('/reset-password', { token, newPassword: 'another pass 3' })).status).toBe(
      400,
    );

    expect((await app.request('/api/me', { headers: { cookie: oldSession } })).status).toBe(401);
    expect((await post('/sign-in/email', { email, password })).status).toBe(401);
    expect((await post('/sign-in/username', { username, password: newPassword })).status).toBe(200);
  });

  it('rejects an expired reset token', async () => {
    const [, sent] = await captureMail(() =>
      post('/request-password-reset', {
        email,
        redirectTo: 'http://localhost:3000/dat-lai-mat-khau',
      }),
    );
    const token = linkIn(sent[0]!).pathname.split('/').pop()!;
    await db
      .update(verifications)
      .set({ expiresAt: new Date(Date.now() - 1000) })
      .where(eq(verifications.identifier, `reset-password:${token}`));

    expect((await post('/reset-password', { token, newPassword: 'expired pass 4' })).status).toBe(
      400,
    );
  });
});
