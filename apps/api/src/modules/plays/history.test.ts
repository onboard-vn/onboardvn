import { createHash, randomUUID } from 'node:crypto';
import type { ClubPlaysResponse, MyPlaysResponse } from '@onboard/shared';
import { Hono } from 'hono';
import { eq, inArray } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { sessionMiddleware } from '../../auth/middleware.js';
import { db, pool } from '../../db/client.js';
import { meetupParticipants, meetupTables, meetups, plays, users } from '../../db/schema/index.js';
import { errorHandler } from '../../lib/error-handler.js';
import type { AppEnv, SessionUser } from '../../types.js';
import { fakeAuth } from '../../test/fake-auth.js';
import { createWorld, send, type World } from '../../test/play-world.js';
import { clubPlayHistoryRoutes } from './history-routes.js';

let world: World;
const uuid = () => randomUUID();

interface PlayJson {
  id: string;
  status: string;
  players: {
    identity: { id: string; userId: string | null; displayName: string };
    computed: { isWinner: boolean } | null;
  }[];
}

function historyAppFor(user: SessionUser | null) {
  return new Hono<AppEnv>()
    .use(sessionMiddleware(fakeAuth(user)))
    .route('/clubs', clubPlayHistoryRoutes)
    .onError(errorHandler);
}

function expectNoPrivateHistoryFields(value: unknown): void {
  if (Array.isArray(value)) {
    for (const item of value) expectNoPrivateHistoryFields(item);
    return;
  }
  if (value === null || typeof value !== 'object') return;
  for (const [key, child] of Object.entries(value)) {
    expect(key).not.toMatch(/^(userId|email)$/);
    expectNoPrivateHistoryFields(child);
  }
}

async function createPlay(tableId: string, user: SessionUser): Promise<PlayJson> {
  const response = await send(world.appFor(user), 'POST', `/api/tables/${tableId}/plays`, {
    id: uuid(),
  });
  expect(response.status).toBe(201);
  return (await response.json()) as PlayJson;
}

async function finalizePlay(
  tableId: string,
  host: SessionUser,
  winnerUserId: string,
): Promise<PlayJson> {
  const draft = await createPlay(tableId, host);
  const values = await send(world.appFor(host), 'PATCH', `/api/plays/${draft.id}/values`, {
    ops: draft.players.map((player) => ({
      opId: uuid(),
      identityId: player.identity.id,
      categoryKey: 'coins',
      value: player.identity.userId === winnerUserId ? 15 : 3,
    })),
  });
  expect(values.status).toBe(200);
  const response = await send(world.appFor(host), 'POST', `/api/plays/${draft.id}/finalize`);
  expect(response.status).toBe(200);
  return (await response.json()) as PlayJson;
}

async function createPrivateMeetupPlay(): Promise<string> {
  const [meetup] = await db
    .insert(meetups)
    .values({
      slug: `history-private-${world.stamp}`,
      title: 'Private history test',
      startsAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      addressLine: 'Test address',
      provinceCode: `pw-p-${world.stamp}`,
      visibility: 'private',
      clubId: world.clubId,
      inviteCodeHash: createHash('sha256').update(`history-private-${world.stamp}`).digest('hex'),
      createdBy: world.users.owner.id,
    })
    .returning({ id: meetups.id });
  if (!meetup) throw new Error('Expected the private test meetup to be created');
  const [table] = await db
    .insert(meetupTables)
    .values({
      meetupId: meetup.id,
      hostUserId: world.users.owner.id,
      gameId: world.gameId,
      seats: 2,
      position: 1,
    })
    .returning({ id: meetupTables.id });
  if (!table) throw new Error('Expected the private test table to be created');
  await db.insert(meetupParticipants).values({
    meetupId: meetup.id,
    userId: world.users.owner.id,
    status: 'going',
    tableId: table.id,
  });
  const play = await finalizePlay(table.id, world.users.owner, world.users.owner.id);
  return play.id;
}

beforeAll(async () => {
  world = await createWorld('history');
});

afterAll(async () => {
  if (world) await world.cleanup();
  await pool.end();
});

describe('club play history', () => {
  it('returns finished visible plays with cursor paging and identity-safe, profile-aware winners', async () => {
    const first = await finalizePlay(world.tableId, world.users.host, world.users.host.id);
    const second = await finalizePlay(world.tableId, world.users.host, world.users.seated.id);
    const privatePlayId = await createPrivateMeetupPlay();
    const draft = await createPlay(world.tableId, world.users.host);
    await db.update(users).set({ profileVisibility: 'private' }).where(eq(users.id, world.users.seated.id));

    const app = historyAppFor(world.users.other);
    const firstPageResponse = await app.request(`/clubs/${world.clubId}/plays?limit=1`);
    expect(firstPageResponse.status).toBe(200);
    const firstPage = (await firstPageResponse.json()) as ClubPlaysResponse;
    expect(firstPage.items).toHaveLength(1);
    expect(firstPage.items[0]).toMatchObject({ id: second.id, status: 'final' });
    expect(firstPage.items[0]!.winners).toEqual([
      {
        identityId: second.players.find((player) => player.computed?.isWinner)!.identity.id,
        displayName: 'Người chơi ẩn danh',
        isGuest: false,
      },
    ]);
    expectNoPrivateHistoryFields(firstPage);
    expect(firstPage.nextCursor).not.toBeNull();

    const secondPageResponse = await app.request(
      `/clubs/${world.clubId}/plays?limit=1&cursor=${encodeURIComponent(firstPage.nextCursor!)}`,
    );
    expect(secondPageResponse.status).toBe(200);
    const secondPage = (await secondPageResponse.json()) as ClubPlaysResponse;
    expect(secondPage.items).toHaveLength(1);
    expect(secondPage.items[0]).toMatchObject({ id: first.id, status: 'final' });
    expect(secondPage.items[0]!.winners).toEqual([
      {
        identityId: first.players.find((player) => player.computed?.isWinner)!.identity.id,
        displayName: world.users.host.name,
        isGuest: false,
      },
    ]);
    expectNoPrivateHistoryFields(secondPage);
    expect(secondPage.nextCursor).toBeNull();
    const returnedIds = [firstPage, secondPage].flatMap((page) => page.items.map((item) => item.id));
    expect(returnedIds).toEqual([second.id, first.id]);
    expect(returnedIds).not.toContain(privatePlayId);
    expect(returnedIds).not.toContain(draft.id);

    const personalResponse = await send(world.appFor(world.users.seated), 'GET', '/api/me/plays?limit=50');
    expect(personalResponse.status).toBe(200);
    const personal = (await personalResponse.json()) as MyPlaysResponse;
    expectNoPrivateHistoryFields(personal);
    const personalWinner = personal.items.find((item) => item.id === second.id)?.winners[0];
    expect(personalWinner).toEqual({
      identityId: second.players.find((player) => player.computed?.isWinner)!.identity.id,
      displayName: world.users.seated.name,
      isGuest: false,
    });
    expect(personal.items.find((item) => item.id === draft.id)?.status).toBe('draft');

    const finishedResponse = await send(
      world.appFor(world.users.seated),
      'GET',
      '/api/me/plays?limit=50&status=finished',
    );
    expect(finishedResponse.status).toBe(200);
    const finished = (await finishedResponse.json()) as MyPlaysResponse;
    expectNoPrivateHistoryFields(finished);
    expect(finished.items.every((item) => item.status === 'final')).toBe(true);
    expect(finished.items.map((item) => item.id)).not.toContain(draft.id);
    expect(finished.items.find((item) => item.id === second.id)?.winners[0]).toEqual(personalWinner);
  });

  it('rejects an unknown personal play status with 400', async () => {
    const response = await send(world.appFor(world.users.seated), 'GET', '/api/me/plays?status=draft');

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ error: { code: 'BAD_REQUEST' } });
  });

  it('excludes a finished play from a different club', async () => {
    const otherWorld = await createWorld('history-other');
    try {
      const otherClubPlay = await finalizePlay(
        otherWorld.tableId,
        otherWorld.users.host,
        otherWorld.users.host.id,
      );
      const response = await historyAppFor(world.users.other).request(
        `/clubs/${world.clubId}/plays?limit=50`,
      );

      expect(response.status).toBe(200);
      const history = (await response.json()) as ClubPlaysResponse;
      expect(history.items.map((item) => item.id)).not.toContain(otherClubPlay.id);
      expect(history.items.every((item) => item.clubId === world.clubId)).toBe(true);
    } finally {
      await otherWorld.cleanup();
    }
  });

  it('pages equal-timestamp plays without gaps or duplicates and rejects a crafted cursor', async () => {
    const tiedAt = new Date('2030-01-02T03:04:05.000Z');
    const tiedPlays = [
      await finalizePlay(world.tableId, world.users.host, world.users.host.id),
      await finalizePlay(world.tableId, world.users.host, world.users.seated.id),
    ];
    const tiedIds = tiedPlays.map((play) => play.id);
    await db.update(plays).set({ startedAt: tiedAt }).where(inArray(plays.id, tiedIds));

    const app = historyAppFor(world.users.other);
    const returnedIds: string[] = [];
    let cursor: string | null = null;
    for (let pageNumber = 0; pageNumber < 2; pageNumber++) {
      const query = new URLSearchParams({ limit: '1' });
      if (cursor) query.set('cursor', cursor);
      const response = await app.request(`/clubs/${world.clubId}/plays?${query.toString()}`);
      expect(response.status).toBe(200);
      const page = (await response.json()) as ClubPlaysResponse;
      expect(page.items).toHaveLength(1);
      returnedIds.push(page.items[0]!.id);
      cursor = page.nextCursor;
    }

    expect(returnedIds).toEqual([...tiedIds].sort().reverse());
    expect(new Set(returnedIds).size).toBe(returnedIds.length);

    const craftedCursor = Buffer.from(`${tiedAt.toISOString()}|${tiedIds[0]} OR 1=1`).toString(
      'base64url',
    );
    const invalidResponse = await app.request(
      `/clubs/${world.clubId}/plays?cursor=${encodeURIComponent(craftedCursor)}`,
    );
    expect(invalidResponse.status).toBe(400);
    const errorBody = await invalidResponse.json();
    expect(errorBody).toMatchObject({ error: { code: 'BAD_REQUEST' } });
    expectNoPrivateHistoryFields(errorBody);
  });

  it('returns identical 404 responses for non-members and anonymous users before querying history', async () => {
    const selectSpy = vi.spyOn(db, 'select');
    try {
      const nonMemberResponse = await historyAppFor(world.users.outsider).request(
        `/clubs/${world.clubId}/plays`,
      );
      const anonymousResponse = await historyAppFor(null).request(`/clubs/${world.clubId}/plays`);

      expect(nonMemberResponse.status).toBe(404);
      expect(anonymousResponse.status).toBe(404);
      expect(await nonMemberResponse.json()).toEqual(await anonymousResponse.json());
      expect(selectSpy).toHaveBeenCalledTimes(1);
    } finally {
      selectSpy.mockRestore();
    }
  });
});
