import { createHash, randomBytes } from 'node:crypto';
import { and, eq } from 'drizzle-orm';
import { afterAll, afterEach, beforeEach, describe, expect, it } from 'vitest';
import { db, pool } from '../../db/client.js';
import { clubMembers, clubs, meetups, plays } from '../../db/schema/index.js';
import { createWorld, send, type World } from '../../test/play-world.js';

let w: World;
let extraClubId: string | undefined;
type Who = keyof World['users'];
const as = (who: Who | null) => w.appFor(who ? w.users[who] : null);
const uuid = () => crypto.randomUUID();

interface PlayJson {
  id: string;
  rev: number;
  status: string;
  canEdit: boolean;
  editableIdentityIds: string[];
  players: { identity: { id: string; userId: string | null } }[];
}

async function createTablePlay(extra: object = {}) {
  const id = uuid();
  const response = await send(as('host'), 'POST', `/api/tables/${w.tableId}/plays`, {
    id,
    ...extra,
  });
  return { id, response, play: (await response.json()) as PlayJson };
}

const patchValues = (who: Who, playId: string, identityId: string) =>
  send(as(who), 'PATCH', `/api/plays/${playId}/values`, {
    ops: [{ opId: uuid(), identityId, categoryKey: 'coins', value: 6 }],
  });

async function expectRevokedMemberAccess(
  who: Who,
  playId: string,
  identityId: string,
  rev: number,
) {
  const checks: [string, () => Response | Promise<Response>][] = [
    ['GET play', () => send(as(who), 'GET', `/api/plays/${playId}`)],
    ['current table play', () => send(as(who), 'GET', `/api/tables/${w.tableId}/plays/current`)],
    ['poll', () => send(as(who), 'GET', `/api/plays/${playId}?sinceRev=${rev}`)],
    ['SSE stream', () => send(as(who), 'GET', `/api/plays/${playId}/stream`)],
    ['PATCH values', () => patchValues(who, playId, identityId)],
    ['PATCH play', () => send(as(who), 'PATCH', `/api/plays/${playId}`, { setup: {} })],
    [
      'presence',
      () =>
        send(as(who), 'POST', `/api/plays/${playId}/presence`, { identityId, categoryKey: 'coins' }),
    ],
  ];

  for (const [route, request] of checks) {
    const response = await request();
    expect(response.status, `${who} after revocation: ${route}`).toBe(404);
    await response.body?.cancel();
  }
}

beforeEach(async () => {
  w = await createWorld('l5a');
  extraClubId = undefined;
});

afterEach(async () => {
  if (extraClubId) await db.delete(clubs).where(eq(clubs.id, extraClubId));
  await w.cleanup();
});

afterAll(async () => {
  await pool.end();
});

describe('read-only club member access to table plays', () => {
  it('lets a non-seated member read the current play and initial SSE state without edit access', async () => {
    const beforePlay = await send(
      as('other'),
      'GET',
      `/api/tables/${w.tableId}/plays/current`,
    );
    expect(beforePlay.status).toBe(200);
    expect(await beforePlay.json()).toMatchObject({
      play: null,
      canManage: false,
      editableIdentityIds: [],
    });

    const { id, response, play } = await createTablePlay();
    expect(response.status).toBe(201);
    await db.update(plays).set({ clubId: null }).where(eq(plays.id, id));
    const memberPlayResponse = await send(as('other'), 'GET', `/api/plays/${id}`);
    expect(memberPlayResponse.status).toBe(200);
    expect(await memberPlayResponse.json()).toMatchObject({
      id,
      canEdit: false,
      editableIdentityIds: [],
    });

    const current = await send(as('other'), 'GET', `/api/tables/${w.tableId}/plays/current`);
    expect(current.status).toBe(200);
    expect(await current.json()).toMatchObject({
      canManage: false,
      editableIdentityIds: [],
      play: { id, canEdit: false, editableIdentityIds: [] },
    });

    const stream = await send(as('other'), 'GET', `/api/plays/${id}/stream`);
    expect(stream.status).toBe(200);
    const reader = stream.body!.getReader();
    const decoder = new TextDecoder();
    let initial = '';
    try {
      while (!initial.includes('\n\n')) {
        const { value, done } = await reader.read();
        if (done) break;
        initial += decoder.decode(value);
      }
    } finally {
      await reader.cancel();
    }
    expect(initial).toContain('event: play');
    expect(initial).toContain('"canEdit":false');
    expect(initial).toContain('"editableIdentityIds":[]');

    const identityId = play.players[0]!.identity.id;
    expect((await patchValues('other', id, identityId)).status).toBe(403);
    expect((await send(as('other'), 'PATCH', `/api/plays/${id}`, { setup: {} })).status).toBe(403);
    expect(
      (
        await send(as('other'), 'POST', `/api/plays/${id}/presence`, {
          identityId,
          categoryKey: 'coins',
        })
      ).status,
    ).toBe(403);
  });

  it('hides a club table play from outsiders and members of another club', async () => {
    const { id } = await createTablePlay();
    expect((await send(as('outsider'), 'GET', `/api/plays/${id}`)).status).toBe(404);
    expect(
      (await send(as('outsider'), 'GET', `/api/tables/${w.tableId}/plays/current`)).status,
    ).toBe(404);

    const [club] = await db
      .insert(clubs)
      .values({
        slug: `l5a-other-${w.stamp}`,
        name: 'Other test club',
        inviteCodeHash: createHash('sha256').update(randomBytes(8)).digest('hex'),
        createdBy: w.users.outsider.id,
      })
      .returning({ id: clubs.id });
    extraClubId = club!.id;
    await db.insert(clubMembers).values({ clubId: extraClubId, userId: w.users.outsider.id });

    expect((await send(as('outsider'), 'GET', `/api/plays/${id}`)).status).toBe(404);
    expect(
      (await send(as('outsider'), 'GET', `/api/tables/${w.tableId}/plays/current`)).status,
    ).toBe(404);
  });

  it('applies the meetup visibility check to current club members', async () => {
    const { id } = await createTablePlay();
    await db.update(meetups).set({ visibility: 'private' }).where(eq(meetups.id, w.meetupId));

    expect((await send(as('other'), 'GET', `/api/plays/${id}`)).status).toBe(404);
    expect(
      (await send(as('other'), 'GET', `/api/tables/${w.tableId}/plays/current`)).status,
    ).toBe(404);
  });

  it('preserves host and seated-player row editing for a non-club table', async () => {
    await db
      .update(meetups)
      .set({ clubId: null, visibility: 'public' })
      .where(eq(meetups.id, w.meetupId));
    try {
      const { id, play } = await createTablePlay();
      const hostIdentity = play.players.find((player) => player.identity.userId === w.users.host.id)!
        .identity.id;
      const seatedIdentity = play.players.find(
        (player) => player.identity.userId === w.users.seated.id,
      )!.identity.id;

      expect((await patchValues('host', id, hostIdentity)).status).toBe(200);
      expect((await patchValues('host', id, seatedIdentity)).status).toBe(200);
      expect((await patchValues('seated', id, seatedIdentity)).status).toBe(200);
      expect((await patchValues('seated', id, hostIdentity)).status).toBe(403);
      expect((await send(as('other'), 'GET', `/api/plays/${id}`)).status).toBe(404);
      expect(
        (await send(as('other'), 'GET', `/api/tables/${w.tableId}/plays/current`)).status,
      ).toBe(404);
      expect((await patchValues('other', id, hostIdentity)).status).toBe(404);
    } finally {
      await db
        .update(meetups)
        .set({ clubId: w.clubId, visibility: 'club' })
        .where(eq(meetups.id, w.meetupId));
    }
  });

  it('denies former seated players and hosts after club membership ends', async () => {
    const { id, play } = await createTablePlay();
    const hostIdentity = play.players.find((player) => player.identity.userId === w.users.host.id)!
      .identity.id;
    const seatedIdentity = play.players.find(
      (player) => player.identity.userId === w.users.seated.id,
    )!.identity.id;

    await db
      .delete(clubMembers)
      .where(and(eq(clubMembers.clubId, w.clubId), eq(clubMembers.userId, w.users.host.id)));
    await expectRevokedMemberAccess('host', id, hostIdentity, play.rev);

    await db
      .delete(clubMembers)
      .where(and(eq(clubMembers.clubId, w.clubId), eq(clubMembers.userId, w.users.seated.id)));
    await expectRevokedMemberAccess('seated', id, seatedIdentity, play.rev);
  });

  it('keeps row editing restricted to the seated player and table host', async () => {
    const { id, play } = await createTablePlay();
    const hostIdentity = play.players.find((player) => player.identity.userId === w.users.host.id)!
      .identity.id;
    const seatedIdentity = play.players.find(
      (player) => player.identity.userId === w.users.seated.id,
    )!.identity.id;

    expect((await patchValues('seated', id, seatedIdentity)).status).toBe(200);
    expect((await patchValues('seated', id, hostIdentity)).status).toBe(403);
    expect((await patchValues('host', id, seatedIdentity)).status).toBe(200);
    expect((await patchValues('host', id, hostIdentity)).status).toBe(200);
  });

  it('leaves a play with no players in draft when finalization is rejected', async () => {
    const { id, play } = await createTablePlay();
    const remove = await send(as('host'), 'PATCH', `/api/plays/${id}`, {
      removePlayers: play.players.map((player) => player.identity.id),
    });
    expect(remove.status).toBe(200);
    expect((await send(as('host'), 'POST', `/api/plays/${id}/finalize`)).status).toBe(422);
    const current = await send(as('host'), 'GET', `/api/plays/${id}`);
    expect(current.status).toBe(200);
    expect(await current.json()).toMatchObject({ id, status: 'draft', players: [] });
  });
});
