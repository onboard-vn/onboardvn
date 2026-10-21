import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { assertExternalClubBootConfig, createApp } from './app.js';
import { auth } from './auth/better-auth.js';
import { onOtpSent, type OtpMessage } from './auth/otp-mailer.js';
import { db, pool } from './db/client.js';
import { clubMembers, clubs, users } from './db/schema/index.js';
import { createLiveReader } from './integrations/external-club/live-fetch.js';
import type { ExternalClubSource } from './integrations/external-club/types.js';
import { fakeAuth, fakeUser } from './test/fake-auth.js';

const { loadExternalClubSourceMock } = vi.hoisted(() => ({
  loadExternalClubSourceMock: vi.fn(),
}));

vi.mock('./integrations/external-club/loader.js', () => ({
  loadExternalClubSource: loadExternalClubSourceMock,
}));

const app = createApp({ auth, rateLimit: false });
const email = `otp-${Date.now()}@example.test`;
const liveStamp = Date.now();
const liveSourceId = `app-live-${liveStamp}`;
const liveMember = {
  ...fakeUser('user'),
  id: `u-app-live-member-${liveStamp}`,
  email: `app-live-member-${liveStamp}@example.test`,
  username: `app_live_member_${liveStamp}`,
};
const liveOutsider = {
  ...fakeUser('user'),
  id: `u-app-live-outsider-${liveStamp}`,
  email: `app-live-outsider-${liveStamp}@example.test`,
  username: `app_live_outsider_${liveStamp}`,
};
let liveClubId = '';

function todayInClubTimeZone(): string {
  const parts = new Intl.DateTimeFormat('en', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)?.value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}

beforeAll(async () => {
  await db.delete(users).where(eq(users.email, email));
  await db.insert(users).values([liveMember, liveOutsider]).onConflictDoNothing({ target: users.id });
  const [club] = await db
    .insert(clubs)
    .values({
      slug: `app-live-${liveStamp}`,
      name: 'App live route test',
      inviteCodeHash: `hash-app-live-${liveStamp}`,
      externalSource: liveSourceId,
      createdBy: liveMember.id,
    })
    .returning({ id: clubs.id });
  if (!club) throw new Error('Expected the app live test club to be created');
  liveClubId = club.id;
  await db.insert(clubMembers).values({ clubId: liveClubId, userId: liveMember.id, role: 'owner' });
});
afterAll(async () => {
  if (liveClubId) await db.delete(clubs).where(eq(clubs.id, liveClubId));
  await db.delete(users).where(eq(users.id, liveMember.id));
  await db.delete(users).where(eq(users.id, liveOutsider.id));
  await db.delete(users).where(eq(users.email, email));
  await pool.end();
});

describe('app', () => {
  it('rejects a configured external club plugin without its login HMAC key outside test mode', () => {
    expect(() =>
      assertExternalClubBootConfig({
        NODE_ENV: 'development',
        EXTERNAL_CLUB_PLUGIN: '/plugin.mjs',
        EXTERNAL_CLUB_BASE_URL: 'https://example.test',
        CLUB_LOGIN_HMAC_KEY: undefined,
      }),
    ).toThrow(/CLUB_LOGIN_HMAC_KEY/);
  });

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

  it('mounts the live day route behind club membership and disables caching', async () => {
    let upstreamCalls = 0;
    const source: ExternalClubSource = {
      source: liveSourceId,
      listGames: async () => [],
      listMembers: async () => [],
      listDays: async () => [],
      fetchDay: async () => {
        upstreamCalls++;
        return null;
      },
    };
    const reader = createLiveReader({ source });
    const memberApp = createApp({
      auth: fakeAuth(liveMember),
      rateLimit: false,
      clubLiveReader: reader,
    });
    const outsiderApp = createApp({
      auth: fakeAuth(liveOutsider),
      rateLimit: false,
      clubLiveReader: reader,
    });
    const date = todayInClubTimeZone();
    const path = `/api/clubs/${liveClubId}/days/${date}`;

    const outsiderResponse = await outsiderApp.request(path);
    expect(outsiderResponse.status).toBe(404);
    expect(outsiderResponse.headers.get('Cache-Control')).toBe('private, no-store');
    expect(upstreamCalls).toBe(0);

    const memberResponse = await memberApp.request(path);
    expect(memberResponse.status).toBe(200);
    expect(memberResponse.headers.get('Cache-Control')).toBe('private, no-store');
    expect(await memberResponse.json()).toMatchObject({
      data: { date, tables: [] },
      stale: false,
    });
    expect(upstreamCalls).toBe(1);
  });

  it('retries loading the default live reader after the plugin fails to load', async () => {
    const source: ExternalClubSource = {
      source: liveSourceId,
      listGames: async () => [],
      listMembers: async () => [],
      listDays: async () => [],
      fetchDay: async () => null,
    };
    loadExternalClubSourceMock
      .mockReset()
      .mockRejectedValueOnce(new Error('plugin source load failed'))
      .mockResolvedValueOnce(source);

    const defaultReaderApp = createApp({ auth: fakeAuth(liveMember), rateLimit: false });
    const date = todayInClubTimeZone();
    const path = `/api/clubs/${liveClubId}/days/${date}`;

    const unavailable = await defaultReaderApp.request(path);
    expect(unavailable.status).toBe(503);
    expect(await unavailable.json()).toEqual({
      error: { code: 'INTERNAL', message: 'Dữ liệu club tạm thời không khả dụng' },
    });
    expect(loadExternalClubSourceMock).toHaveBeenCalledTimes(1);

    const recovered = await defaultReaderApp.request(path);
    expect(recovered.status).toBe(200);
    expect(await recovered.json()).toMatchObject({
      data: { date, tables: [] },
      stale: false,
    });
    expect(loadExternalClubSourceMock).toHaveBeenCalledTimes(2);
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
