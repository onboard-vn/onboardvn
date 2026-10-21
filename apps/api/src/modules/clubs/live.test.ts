import { createHash } from 'node:crypto';
import { Hono } from 'hono';
import { requestId } from 'hono/request-id';
import { eq, inArray } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type {
  ClubLiveDayData,
  ClubLiveGamesData,
  ClubLiveHistoryDatesData,
  ClubLiveMembersData,
} from '@onboard/shared';
import type { LiveReader, LiveResult } from '../../integrations/external-club/live-types.js';
import { db, pool } from '../../db/client.js';
import { clubMembers, clubs, users } from '../../db/schema/index.js';
import { sessionMiddleware } from '../../auth/middleware.js';
import { errorHandler, notFoundHandler } from '../../lib/error-handler.js';
import { fakeAuth, fakeUser } from '../../test/fake-auth.js';
import type { SessionUser } from '../../types.js';
import { createClubLiveRoutes } from './live-routes.js';

const stamp = Date.now();
const member = {
  ...fakeUser('user'),
  id: `u-club-live-member-${stamp}`,
  email: `club-live-member-${stamp}@example.test`,
  username: `club_live_member_${stamp}`,
};
const rateLimitMember = {
  ...fakeUser('user'),
  id: `u-club-live-rate-${stamp}`,
  email: `club-live-rate-${stamp}@example.test`,
  username: `club_live_rate_${stamp}`,
};
const independentRateLimitMember = {
  ...fakeUser('user'),
  id: `u-club-live-rate-independent-${stamp}`,
  email: `club-live-rate-independent-${stamp}@example.test`,
  username: `club_live_rate_independent_${stamp}`,
};
const outsider = {
  ...fakeUser('user'),
  id: `u-club-live-outsider-${stamp}`,
  email: `club-live-outsider-${stamp}@example.test`,
  username: `club_live_outsider_${stamp}`,
};
const testUsers = [member, rateLimitMember, independentRateLimitMember, outsider];
const forbiddenKeyFragments = ['loginid', 'secretid', 'digest', 'email', 'realname'];
const lastSuccessAt = '2026-10-21T07:00:00.000Z';
let clubId = '';

type ReaderOverrides = Partial<{
  readDay: LiveReader['readDay'];
  readMembers: LiveReader['readMembers'];
  readGames: LiveReader['readGames'];
  readHistoryDates: LiveReader['readHistoryDates'];
}>;

function withPrivateFields<T extends object>(value: T): T {
  return Object.assign(value, {
    loginId: 'private-login-value',
    secretId: 'private-secret-value',
    digest: 'private-digest-value',
    email: 'private@example.test',
    realName: 'Private Name',
  });
}

function result<T>(data: T, stale = false): LiveResult<T> {
  return withPrivateFields({ data, stale, lastSuccessAt: stale ? lastSuccessAt : null });
}

function dayData(date: string): ClubLiveDayData {
  const memberSeat = withPrivateFields({
    kind: 'member' as const,
    externalMemberId: 'member-1',
    displayName: 'Player One',
  });
  const guestSeat = withPrivateFields({
    kind: 'guest' as const,
    externalId: 'guest-1',
    invitedByExternalMemberId: 'member-1',
    displayName: 'Guest One',
  });
  const table = withPrivateFields({
    tableId: '00000000-0000-4000-8000-000000000001',
    externalId: 'table-1',
    hostName: 'Host One',
    hasOpenPlay: true,
    gameExternalId: 'game-1',
    gameName: 'Board game',
    note: null,
    startsAt: null,
    endsAt: null,
    minPlayers: 2,
    maxPlayers: 4,
    seats: [memberSeat, guestSeat],
    status: 'confirmed' as const,
  });
  return withPrivateFields({
    date,
    venue: 'Community hall',
    note: null,
    tables: [table],
    externalUrl: 'https://untrusted.example/day/source',
  });
}

function membersData(): ClubLiveMembersData {
  const item = withPrivateFields({ externalId: 'member-1', nickname: 'Player One' });
  return withPrivateFields({ items: [item] });
}

function gamesData(): ClubLiveGamesData {
  const owner = withPrivateFields({ externalMemberId: 'member-1' });
  const expansion = withPrivateFields({ externalId: 'expansion-1', name: 'Expansion' });
  const game = withPrivateFields({
    externalId: 'game-1',
    name: 'Board game',
    year: 2020,
    minPlayers: 2,
    maxPlayers: 4,
    playMinutes: 60,
    bggId: 12345,
    owners: [owner],
    expansions: [expansion],
  });
  return withPrivateFields({ items: [game] });
}

function historyDatesData(): ClubLiveHistoryDatesData {
  return withPrivateFields({ dates: ['2026-10-20', '2026-10-21'] });
}

function fakeLiveReader(overrides: ReaderOverrides = {}) {
  const calls = { day: 0, members: 0, games: 0, history: 0 };
  const reader: LiveReader = {
    readDay: async (id, date) => {
      calls.day++;
      return overrides.readDay ? overrides.readDay(id, date) : result(dayData(date));
    },
    readMembers: async (id) => {
      calls.members++;
      return overrides.readMembers ? overrides.readMembers(id) : result(membersData());
    },
    readGames: async (id) => {
      calls.games++;
      return overrides.readGames ? overrides.readGames(id) : result(gamesData());
    },
    readHistoryDates: async (id) => {
      calls.history++;
      return overrides.readHistoryDates
        ? overrides.readHistoryDates(id)
        : result(historyDatesData());
    },
  };
  return { calls, reader };
}

function appFor(
  user: SessionUser | null,
  reader: LiveReader,
  options: { externalBaseUrl?: string | null } = {},
) {
  return new Hono()
    .use('*', requestId())
    .use('*', sessionMiddleware(fakeAuth(user)))
    .route('/clubs', createClubLiveRoutes(reader, options))
    .onError(errorHandler)
    .notFound(notFoundHandler);
}

function todayInClubTimeZone(offsetDays = 0): string {
  const parts = new Intl.DateTimeFormat('en', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)?.value;
  const date = new Date(`${part('year')}-${part('month')}-${part('day')}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + offsetDays);
  return date.toISOString().slice(0, 10);
}

async function json(response: Response): Promise<unknown> {
  return response.json();
}

function expectPrivateNoStore(response: Response): void {
  expect(response.headers.get('Cache-Control')).toBe('private, no-store');
}

function expectNoSensitiveKeys(value: unknown): void {
  if (Array.isArray(value)) {
    value.forEach(expectNoSensitiveKeys);
    return;
  }
  if (!value || typeof value !== 'object') return;

  for (const key of Object.keys(value)) {
    expect(forbiddenKeyFragments.some((fragment) => key.toLowerCase().includes(fragment))).toBe(
      false,
    );
  }
  Object.values(value).forEach(expectNoSensitiveKeys);
}

beforeAll(async () => {
  await db.insert(users).values(testUsers).onConflictDoNothing({ target: users.id });
  const [club] = await db
    .insert(clubs)
    .values({
      slug: `club-live-${stamp}`,
      name: 'Club live test',
      inviteCodeHash: createHash('sha256').update(`club-live-${stamp}`).digest('hex'),
      createdBy: member.id,
    })
    .returning({ id: clubs.id });
  if (!club) throw new Error('Expected the live test club to be created');
  clubId = club.id;
  await db.insert(clubMembers).values([
    { clubId, userId: member.id, role: 'owner' },
    { clubId, userId: rateLimitMember.id, role: 'member' },
    { clubId, userId: independentRateLimitMember.id, role: 'member' },
  ]);
});

afterAll(async () => {
  if (clubId) await db.delete(clubs).where(eq(clubs.id, clubId));
  await db.delete(users).where(inArray(users.id, testUsers.map((user) => user.id)));
  await pool.end();
});

describe('club live routes', () => {
  it('returns the same 404 to anonymous and non-member users without reading upstream', async () => {
    const { calls, reader } = fakeLiveReader();
    const outsiderResponse = await appFor(outsider, reader).request(
      `/clubs/${clubId}/days/not-a-date`,
    );
    const anonymousResponse = await appFor(null, reader).request(
      `/clubs/${clubId}/days/not-a-date`,
    );
    const outsiderBody = await json(outsiderResponse);
    const anonymousBody = await json(anonymousResponse);

    expect(outsiderResponse.status).toBe(404);
    expect(anonymousResponse.status).toBe(404);
    expectPrivateNoStore(outsiderResponse);
    expectPrivateNoStore(anonymousResponse);
    expect(outsiderBody).toEqual(anonymousBody);
    expectNoSensitiveKeys(outsiderBody);

    const malformedIdOutsider = await appFor(outsider, reader).request(
      '/clubs/not-a-uuid/days/not-a-date',
    );
    const malformedIdAnonymous = await appFor(null, reader).request(
      '/clubs/not-a-uuid/days/not-a-date',
    );
    const malformedIdBody = await json(malformedIdOutsider);

    expect(malformedIdOutsider.status).toBe(404);
    expect(malformedIdAnonymous.status).toBe(404);
    expectPrivateNoStore(malformedIdOutsider);
    expectPrivateNoStore(malformedIdAnonymous);
    expect(malformedIdBody).toEqual(await json(malformedIdAnonymous));
    expectNoSensitiveKeys(malformedIdBody);
    expect(calls).toEqual({ day: 0, members: 0, games: 0, history: 0 });
  });

  it('rejects malformed and out-of-window dates before calling the reader', async () => {
    const { calls, reader } = fakeLiveReader();
    const app = appFor(member, reader);
    const responses = await Promise.all([
      app.request(`/clubs/${clubId}/days/2026-02-30`),
      app.request(`/clubs/${clubId}/days/1900-01-01`),
      app.request(`/clubs/${clubId}/days/${todayInClubTimeZone(31)}`),
    ]);

    expect(responses.map((response) => response.status)).toEqual([400, 400, 400]);
    responses.forEach(expectPrivateNoStore);
    for (const response of responses) expectNoSensitiveKeys(await json(response));
    expect(calls.day).toBe(0);
  });

  it('returns mapped private no-store data and builds the day URL only for a member', async () => {
    const { calls, reader } = fakeLiveReader();
    const app = appFor(member, reader, { externalBaseUrl: 'https://club.example.test/' });
    const date = todayInClubTimeZone();
    const response = await app.request(`/clubs/${clubId}/days/${date}`);
    const body = (await json(response)) as {
      data: { date: string; externalUrl: string | null; tables: unknown[] };
      stale: boolean;
      lastSuccessAt: string | null;
    };

    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe('private, no-store');
    expect(body.data.externalUrl).toBe(`https://club.example.test/day/${date}`);
    expect(body.data.tables).toHaveLength(1);
    expect(body.data.tables[0]).toMatchObject({
      tableId: '00000000-0000-4000-8000-000000000001',
      hostName: 'Host One',
      hasOpenPlay: true,
      seats: [
        { displayName: 'Player One' },
        { displayName: 'Guest One' },
      ],
    });
    expect(body.stale).toBe(false);
    expectNoSensitiveKeys(body);

    const privateResponse = await appFor(member, reader, { externalBaseUrl: null }).request(
      `/clubs/${clubId}/days/${date}`,
    );
    const privateBody = (await json(privateResponse)) as { data: { externalUrl: string | null } };
    expect(privateBody.data.externalUrl).toBeNull();

    const outsiderResponse = await appFor(outsider, reader).request(
      `/clubs/${clubId}/days/${date}`,
    );
    expect(outsiderResponse.status).toBe(404);
    expectPrivateNoStore(outsiderResponse);
    expectNoSensitiveKeys(await json(outsiderResponse));
    expect(calls.day).toBe(2);
  });

  it('returns live member, game, and history DTOs after explicit field picks', async () => {
    const { calls, reader } = fakeLiveReader();
    const app = appFor(member, reader);
    const paths = ['members-live', 'games-live', 'history-live'];
    const responses = await Promise.all(
      paths.map((path) => app.request(`/clubs/${clubId}/${path}`)),
    );
    const bodies = await Promise.all(responses.map(json));

    expect(responses.map((response) => response.status)).toEqual([200, 200, 200]);
    expect(responses.map((response) => response.headers.get('Cache-Control'))).toEqual([
      'private, no-store',
      'private, no-store',
      'private, no-store',
    ]);
    bodies.forEach(expectNoSensitiveKeys);
    expect(calls).toEqual({ day: 0, members: 1, games: 1, history: 1 });
  });

  it('returns stale data and its last successful time', async () => {
    const { reader } = fakeLiveReader({
      readDay: async (_clubId, date) => result(dayData(date), true),
    });
    const response = await appFor(member, reader).request(
      `/clubs/${clubId}/days/${todayInClubTimeZone()}`,
    );
    const body = (await json(response)) as { stale: boolean; lastSuccessAt: string | null };

    expect(response.status).toBe(200);
    expect(body.stale).toBe(true);
    expect(body.lastSuccessAt).toBe(lastSuccessAt);
    expectNoSensitiveKeys(body);
  });

  it('returns the standard 503 error body when the reader has no data', async () => {
    const { reader } = fakeLiveReader({
      readDay: async () => {
        throw new Error('failed with private-login-value and private-secret-value');
      },
    });
    const response = await appFor(member, reader).request(
      `/clubs/${clubId}/days/${todayInClubTimeZone()}`,
    );
    const body = await json(response);

    expect(response.status).toBe(503);
    expectPrivateNoStore(response);
    expect(body).toEqual({
      error: { code: 'INTERNAL', message: 'Dữ liệu club tạm thời không khả dụng' },
    });
    expectNoSensitiveKeys(body);
  });

  it('shares the 30-request per-minute quota across live routes per user', async () => {
    const { calls, reader } = fakeLiveReader();
    const firstUserApp = appFor(rateLimitMember, reader);
    const secondUserApp = appFor(independentRateLimitMember, reader);
    const paths = [
      `/clubs/${clubId}/days/${todayInClubTimeZone()}`,
      `/clubs/${clubId}/members-live`,
      `/clubs/${clubId}/games-live`,
      `/clubs/${clubId}/history-live`,
    ];
    const firstUserResponses: Response[] = [];

    for (let request = 0; request < 31; request++) {
      firstUserResponses.push(await firstUserApp.request(paths[request % paths.length]!));
    }

    expect(firstUserResponses.slice(0, 30).every((response) => response.status === 200)).toBe(
      true,
    );
    expect(firstUserResponses[30]?.status).toBe(429);
    expectPrivateNoStore(firstUserResponses[30]!);
    expectNoSensitiveKeys(await json(firstUserResponses[30]!));

    const secondUserResponses: Response[] = [];
    for (let request = 0; request < 31; request++) {
      secondUserResponses.push(await secondUserApp.request(paths[request % paths.length]!));
    }

    expect(secondUserResponses.slice(0, 30).every((response) => response.status === 200)).toBe(
      true,
    );
    expect(secondUserResponses[30]?.status).toBe(429);
    expectPrivateNoStore(secondUserResponses[30]!);
    expectNoSensitiveKeys(await json(secondUserResponses[30]!));
    expect(Object.values(calls).reduce((total, count) => total + count, 0)).toBe(60);
  });
});
