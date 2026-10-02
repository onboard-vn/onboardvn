import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../app.js';
import { db, pool } from '../db/client.js';
import { accounts, users } from '../db/schema/index.js';
import { auth } from './better-auth.js';

const app = createApp({ auth, rateLimit: false });
const stamp = Date.now();
const email = `bearer-${stamp}@example.test`;
const password = 'correct horse 1';
const userId = `u-bearer-${stamp}`;
const origin = { origin: 'http://localhost:3000' };

beforeAll(async () => {
  await db.insert(users).values({
    id: userId,
    name: 'Bearer',
    email,
    emailVerified: true,
    username: `bearer_${stamp}`,
  });
  const ctx = await auth.$context;
  await db.insert(accounts).values({
    id: randomUUID(),
    accountId: userId,
    providerId: 'credential',
    userId,
    password: await ctx.password.hash(password),
  });
});
afterAll(async () => {
  await db.delete(users).where(eq(users.id, userId));
  await pool.end();
});

describe('bearer auth for mobile clients', () => {
  it('returns a token on sign-in that authenticates API calls without a cookie', async () => {
    const signIn = await app.request('/api/auth/sign-in/email', {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...origin },
      body: JSON.stringify({ email, password }),
    });
    expect(signIn.status).toBe(200);
    const token = signIn.headers.get('set-auth-token');
    expect(token).toBeTruthy();

    const me = await app.request('/api/me', { headers: { authorization: `Bearer ${token}` } });
    expect(await me.json()).toMatchObject({ user: { email } });
    const plays = await app.request('/api/me/plays', {
      headers: { authorization: `Bearer ${token}` },
    });
    expect(plays.status).toBe(200);
  });

  it('rejects a bogus bearer token', async () => {
    const res = await app.request('/api/me/plays', {
      headers: { authorization: 'Bearer not-a-real-token' },
    });
    expect(res.status).toBe(401);
  });

  it('does not emit CORS headers outside development', async () => {
    const res = await app.request('/api/me', {
      method: 'OPTIONS',
      headers: { origin: 'http://localhost:8081', 'access-control-request-method': 'GET' },
    });
    expect(res.headers.get('access-control-allow-origin')).toBeNull();
  });
});
