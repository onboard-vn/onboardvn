import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { createApp } from './app.js';
import { auth } from './auth/better-auth.js';
import { onOtpSent, type OtpMessage } from './auth/otp-mailer.js';
import { db, pool } from './db/client.js';
import { users } from './db/schema/index.js';

const app = createApp({ auth, rateLimit: false });
const email = `otp-${Date.now()}@example.test`;

beforeAll(async () => {
  await db.delete(users).where(eq(users.email, email));
});
afterAll(async () => {
  await db.delete(users).where(eq(users.email, email));
  await pool.end();
});

describe('app', () => {
  it('GET /health', async () => {
    const res = await app.request('/health');
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: 'ok' });
  });

  it('returns JSON 404 for unknown routes', async () => {
    const res = await app.request('/api/nope');
    expect(res.status).toBe(404);
    expect(await res.json()).toMatchObject({ error: { code: 'NOT_FOUND' } });
  });

  it('GET /api/me is 401 without a session', async () => {
    const res = await app.request('/api/me');
    expect(res.status).toBe(401);
  });

  it('signs in with email OTP and returns the user with default role', async () => {
    const sent: OtpMessage[] = [];
    const stop = onOtpSent((m) => sent.push(m));
    const json = { 'content-type': 'application/json', origin: 'http://localhost:3000' };

    const sendRes = await app.request('/api/auth/email-otp/send-verification-otp', {
      method: 'POST',
      headers: json,
      body: JSON.stringify({ email, type: 'sign-in' }),
    });
    expect(sendRes.status).toBe(200);
    await expect.poll(() => sent.length).toBe(1);
    stop();

    const signIn = await app.request('/api/auth/sign-in/email-otp', {
      method: 'POST',
      headers: json,
      body: JSON.stringify({ email, otp: sent[0]!.otp }),
    });
    expect(signIn.status).toBe(200);
    const cookie = signIn.headers
      .getSetCookie()
      .map((c) => c.split(';')[0])
      .join('; ');

    const me = await app.request('/api/me', { headers: { cookie } });
    expect(me.status).toBe(200);
    expect(await me.json()).toMatchObject({ user: { email, role: 'user' } });
  });
});
