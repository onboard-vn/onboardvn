import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { inArray } from 'drizzle-orm';
import { createApp } from '../../app.js';
import { auth } from '../../auth/better-auth.js';
import { db, pool } from '../../db/client.js';
import { users } from '../../db/schema/index.js';

const app = createApp({ auth, rateLimit: false });
const stamp = Date.now();
const password = 'profile pass 1';
const alice = { email: `alice-${stamp}@example.test`, username: `alice_${stamp}`.slice(0, 30) };
const bob = { email: `bob-${stamp}@example.test`, username: `bob_${stamp}`.slice(0, 30) };
const bgg = `Alice BGG ${stamp}`.slice(0, 50);
const headers = { 'content-type': 'application/json', origin: 'http://localhost:3000' };

const post = (path: string, body: unknown, cookie?: string) =>
  app.request(`/api/auth${path}`, {
    method: 'POST',
    headers: { ...headers, ...(cookie && { cookie }) },
    body: JSON.stringify(body),
  });

async function signUpVerified(account: { email: string; username: string }): Promise<string> {
  await post('/sign-up/email', { ...account, password, name: account.username });
  await db
    .update(users)
    .set({ emailVerified: true })
    .where(inArray(users.email, [account.email]));
  const res = await post('/sign-in/email', { email: account.email, password });
  return res.headers
    .getSetCookie()
    .map((c) => c.split(';')[0])
    .join('; ');
}

let aliceCookie: string;
let bobCookie: string;

const cleanup = () => db.delete(users).where(inArray(users.email, [alice.email, bob.email]));

beforeAll(async () => {
  await cleanup();
  aliceCookie = await signUpVerified(alice);
  bobCookie = await signUpVerified(bob);
});
afterAll(async () => {
  await cleanup();
  await pool.end();
});

describe('profile + BGG link', () => {
  it('updates display name and BGG username, exposed via /api/me', async () => {
    const res = await post('/update-user', { name: 'Alice Nguyễn', bggUsername: bgg }, aliceCookie);
    expect(res.status).toBe(200);
    const me = await app.request('/api/me', { headers: { cookie: aliceCookie } });
    expect(await me.json()).toMatchObject({ user: { name: 'Alice Nguyễn', bggUsername: bgg } });
  });

  it('rejects a malformed BGG username', async () => {
    const res = await post('/update-user', { bggUsername: 'x!' }, bobCookie);
    expect(res.status).toBe(400);
  });

  it('rejects a BGG username already linked to another account', async () => {
    const res = await post('/update-user', { bggUsername: bgg }, bobCookie);
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ code: 'BGG_USERNAME_IS_ALREADY_TAKEN' });
  });

  it('treats BGG usernames case-insensitively when checking duplicates', async () => {
    const res = await post('/update-user', { bggUsername: bgg.toUpperCase() }, bobCookie);
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ code: 'BGG_USERNAME_IS_ALREADY_TAKEN' });
  });

  it('rejects impersonating another handle via displayUsername', async () => {
    const res = await post('/update-user', { displayUsername: alice.username }, bobCookie);
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ code: 'INVALID_DISPLAY_USERNAME' });
  });

  it('rejects a blank or too long name and a self-set avatar URL', async () => {
    expect((await post('/update-user', { name: '  ' }, bobCookie)).status).toBe(400);
    expect((await post('/update-user', { name: 'x'.repeat(101) }, bobCookie)).status).toBe(400);
    const image = await post('/update-user', { image: 'https://evil.test/p.gif' }, bobCookie);
    expect(await image.json()).toMatchObject({ code: 'IMAGE_NOT_ALLOWED' });
  });

  it('renames username together with its display casing', async () => {
    const renamed = `bob2_${stamp}`.slice(0, 30);
    const display = renamed.toUpperCase();
    const res = await post(
      '/update-user',
      { username: display, displayUsername: display },
      bobCookie,
    );
    expect(res.status).toBe(200);
    const profile = await (await app.request(`/api/users/${renamed}`)).json();
    expect(profile).toMatchObject({ username: renamed, displayUsername: display });
  });

  it('rejects changing to a taken or reserved username', async () => {
    expect((await post('/update-user', { username: alice.username }, bobCookie)).status).toBe(400);
    expect((await post('/update-user', { username: 'admin' }, bobCookie)).status).toBe(400);
    expect((await post('/update-user', { displayUsername: 'Admin' }, bobCookie)).status).toBe(400);
  });

  it('serves a public profile without email, case-insensitively', async () => {
    const res = await app.request(`/api/users/${alice.username.toUpperCase()}`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({
      username: alice.username,
      displayUsername: alice.username,
      name: 'Alice Nguyễn',
      image: null,
      bggUsername: bgg,
      bggUrl: `https://boardgamegeek.com/user/${encodeURIComponent(bgg)}`,
    });
    expect(JSON.stringify(body)).not.toContain('@');
  });

  it('returns 404 for an unknown username', async () => {
    const res = await app.request(`/api/users/nobody_${stamp}`);
    expect(res.status).toBe(404);
  });
});
