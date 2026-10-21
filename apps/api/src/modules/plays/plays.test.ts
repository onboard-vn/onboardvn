import { and, eq, inArray } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { db, pool } from '../../db/client.js';
import {
  games,
  meetupParticipants,
  meetupTables,
  playEvents,
  playPlayers,
  plays,
  scoreTemplates,
} from '../../db/schema/index.js';
import { createWorld, send, type World } from '../../test/play-world.js';
import { scoreTemplateFixture } from '../../test/score-template-fixture.js';

let w: World;
let nextTablePosition = 2;
const extraGameIds: string[] = [];
type Who = keyof World['users'];
const as = (who: Who | null) => w.appFor(who ? w.users[who] : null);
const uuid = () => crypto.randomUUID();

interface PlayJson {
  id: string;
  rev: number;
  status: string;
  clubId: string | null;
  editedAfterFinal: boolean;
  canEdit: boolean;
  canManage: boolean;
  editableIdentityIds: string[];
  setup: Record<string, unknown> | null;
  warnings?: string[];
  template: { id: string; version?: number; needsReview: boolean; definition?: unknown } | null;
  game: { id: string };
  players: {
    identity: { id: string; userId: string | null; displayName: string };
    computed: { total: number; rank: number | null; isWinner: boolean } | null;
    values: Record<string, unknown>;
    rounds: Record<string, number[]> | null;
  }[];
}

async function createTestTable(gameId = w.gameId) {
  const [table] = await db
    .insert(meetupTables)
    .values({
      meetupId: w.meetupId,
      hostUserId: w.users.host.id,
      gameId,
      seats: 6,
      position: nextTablePosition++,
    })
    .returning();
  await db
    .update(meetupParticipants)
    .set({ tableId: table!.id })
    .where(
      and(
        eq(meetupParticipants.meetupId, w.meetupId),
        inArray(meetupParticipants.userId, [w.users.host.id, w.users.seated.id]),
      ),
    );
  return table!.id;
}

async function createFromTable(who: Who = 'host', extra: object = {}, tableId?: string) {
  const currentTableId = tableId ?? (await createTestTable());
  const id = uuid();
  const res = await send(as(who), 'POST', `/api/tables/${currentTableId}/plays`, { id, ...extra });
  return { id, tableId: currentTableId, res, json: (await res.json()) as PlayJson };
}

const op = (identityId: string, categoryKey: string, value: unknown, extra: object = {}) => ({
  opId: uuid(),
  identityId,
  categoryKey,
  value,
  ...extra,
});

const patchValues = (who: Who, id: string, ops: object[]) =>
  send(as(who), 'PATCH', `/api/plays/${id}/values`, { ops });

beforeAll(async () => {
  w = await createWorld('ply');
});
afterAll(async () => {
  if (extraGameIds.length) {
    await db.delete(plays).where(inArray(plays.gameId, extraGameIds));
    await db.delete(games).where(inArray(games.id, extraGameIds));
  }
  await w.cleanup();
  await pool.end();
});

describe('create', () => {
  it('returns table/game setup before a play exists and hides it from unauthenticated callers', async () => {
    const tableId = await createTestTable();
    const current = (await (
      await send(as('host'), 'GET', `/api/tables/${tableId}/plays/current`)
    ).json()) as {
      table: { game: { id: string } | null };
      play: PlayJson | null;
      canManage: boolean;
      editableIdentityIds: string[];
      template: { id: string; definition: unknown } | null;
    };
    expect(current).toMatchObject({
      play: null,
      canManage: true,
      table: { game: { id: w.gameId } },
    });
    expect(current.editableIdentityIds).toHaveLength(2);
    expect(current.template).toMatchObject({ id: w.templateId });
    expect((await send(as(null), 'GET', `/api/tables/${tableId}/plays/current`)).status).toBe(401);
  });

  it('prefills game, club, template and players from the table seats', async () => {
    const { res, json, tableId } = await createFromTable();
    expect(res.status).toBe(201);
    expect(json.clubId).toBe(w.clubId);
    expect(json.game.id).toBe(w.gameId);
    expect(json.template?.id).toBe(w.templateId);
    expect(json.players.map((p) => p.identity.userId).sort()).toEqual(
      [w.users.host.id, w.users.seated.id].sort(),
    );
    expect(json.canManage).toBe(true);
    const current = (await (
      await send(as('host'), 'GET', `/api/tables/${tableId}/plays/current`)
    ).json()) as { play: PlayJson; canManage: boolean; template: { definition: unknown } | null };
    expect(current).toMatchObject({ canManage: true, play: { id: json.id } });
    expect(current.template?.definition).toBeDefined();
  });

  it('is idempotent for the creator and conflicts for anyone else', async () => {
    const { id, json, tableId } = await createFromTable();
    const again = await send(as('host'), 'POST', '/api/plays', { id, meetupTableId: tableId });
    expect(again.status).toBe(201);
    expect(((await again.json()) as PlayJson).rev).toBe(json.rev);
    const stolen = await send(as('seated'), 'POST', '/api/plays', { id, meetupTableId: tableId });
    expect(stolen.status).toBe(403);
    const anotherId = uuid();
    const canonical = await send(as('host'), 'POST', `/api/tables/${tableId}/plays`, {
      id: anotherId,
    });
    expect(canonical.status).toBe(201);
    expect(((await canonical.json()) as PlayJson).id).toBe(id);
  });

  it('lets only the table host create a shared play', async () => {
    const tableId = await createTestTable();
    expect(
      (await send(as('seated'), 'POST', `/api/tables/${tableId}/plays`, { id: uuid() })).status,
    ).toBe(403);
  });

  it('serializes concurrent table creates into one active draft', async () => {
    const tableId = await createTestTable();
    const responses = await Promise.all(
      Array.from({ length: 4 }, () =>
        send(as('host'), 'POST', `/api/tables/${tableId}/plays`, { id: uuid() }),
      ),
    );
    expect(responses.map((response) => response.status)).toEqual([201, 201, 201, 201]);
    const plays = await Promise.all(
      responses.map((response) => response.json() as Promise<PlayJson>),
    );
    expect(new Set(plays.map((play) => play.id)).size).toBe(1);
    expect(plays[0]?.status).toBe('draft');
  });

  it('allows the host to start another draft after finalizing the current play', async () => {
    const { id, tableId } = await createFromTable();
    expect((await send(as('host'), 'POST', `/api/plays/${id}/finalize`)).status).toBe(200);
    const lastFinal = (await (
      await send(as('host'), 'GET', `/api/tables/${tableId}/plays/current`)
    ).json()) as { play: PlayJson };
    expect(lastFinal.play.id).toBe(id);
    const created = await send(as('host'), 'POST', `/api/tables/${tableId}/plays`, { id: uuid() });
    expect(created.status).toBe(201);
    const next = (await created.json()) as PlayJson;
    expect(next.id).not.toBe(id);
    const current = (await (
      await send(as('host'), 'GET', `/api/tables/${tableId}/plays/current`)
    ).json()) as { play: PlayJson };
    expect(current.play.id).toBe(next.id);
  });

  it('rejects a club that differs from the Kèo club', async () => {
    const { res } = await createFromTable('host', { clubId: uuid() });
    expect(res.status).toBe(422);
  });

  it('hides club tables from outsiders and needs club membership for club plays', async () => {
    const { res } = await createFromTable('outsider');
    expect(res.status).toBe(404);
    const standalone = await send(as('outsider'), 'POST', '/api/plays', {
      id: uuid(),
      gameId: w.gameId,
      clubId: w.clubId,
    });
    expect(standalone.status).toBe(403);
  });

  it('rejects players the creator cannot use', async () => {
    const outsiderIdentity = await send(as('outsider'), 'POST', '/api/plays', {
      id: uuid(),
      gameId: w.gameId,
    });
    const outsiderId = ((await outsiderIdentity.json()) as PlayJson).players[0]!.identity.id;
    const res = await send(as('host'), 'POST', '/api/plays', {
      id: uuid(),
      gameId: w.gameId,
      playerIdentityIds: [outsiderId],
    });
    expect(res.status).toBe(422);
  });

  it('plays without a template when scoreTemplateId is null', async () => {
    const { json } = await createFromTable('host', { scoreTemplateId: null });
    expect(json.template).toBeNull();
  });
});

describe('server-side scoring', () => {
  it('recomputes from raw inputs and ignores client-sent results', async () => {
    const { id, json } = await createFromTable();
    const [a, b] = json.players.map((p) => p.identity.id) as [string, string];
    const res = await send(as('host'), 'PATCH', `/api/plays/${id}/values`, {
      ops: [op(a, 'coins', 9), op(b, 'coins', 3), op(a, 'rounds', 4, { roundIndex: 1 })],
      computed: { [a]: { total: 999 } },
      total: 999,
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { rev: number; play: PlayJson };
    const byId = new Map(body.play.players.map((p) => [p.identity.id, p]));
    expect(byId.get(a)?.computed).toMatchObject({ total: 7, rank: 1, isWinner: true });
    expect(byId.get(a)?.rounds).toEqual({ rounds: [0, 4] });
    expect(byId.get(b)?.computed).toMatchObject({ total: 1, rank: 2, isWinner: false });
  });

  it('rejects unknown categories and bad round ops', async () => {
    const { id, json } = await createFromTable();
    const a = json.players[0]!.identity.id;
    expect((await patchValues('host', id, [op(a, 'nope', 1)])).status).toBe(422);
    expect((await patchValues('host', id, [op(a, 'coins', 1, { roundIndex: 0 })])).status).toBe(
      422,
    );
    expect((await patchValues('host', id, [op(uuid(), 'coins', 1)])).status).toBe(422);
  });

  it('keeps pinned template version when a newer one is published', async () => {
    const { id, json } = await createFromTable();
    await db.insert(scoreTemplates).values({
      gameId: w.gameId,
      version: 2,
      status: 'approved',
      definition: scoreTemplateFixture({ templateVersion: 2 }),
      confidence: 'high',
      needsReview: false,
      sources: [],
    });
    const got = (await (await send(as('host'), 'GET', `/api/plays/${id}`)).json()) as PlayJson;
    expect(got.template?.id).toBe(json.template?.id);
    const [row] = await db.select().from(plays).where(eq(plays.id, id));
    expect(row!.templateVersion).toBe(1);
  });

  it('free scoring works without a template', async () => {
    const { id, json } = await createFromTable('host', { scoreTemplateId: null });
    const [a, b] = json.players.map((p) => p.identity.id) as [string, string];
    const res = await patchValues('host', id, [op(a, 'total', 5), op(b, 'total', 8)]);
    const play = ((await res.json()) as { play: PlayJson }).play;
    const winners = play.players.filter((p) => p.computed?.isWinner).map((p) => p.identity.id);
    expect(winners).toEqual([b]);
  });
});

describe('field ops', () => {
  it('applies each opId once and bumps the revision once per batch', async () => {
    const { id, json } = await createFromTable();
    const a = json.players[0]!.identity.id;
    const first = op(a, 'coins', 6);
    const r1 = (await (await patchValues('host', id, [first])).json()) as { rev: number };
    const r2 = (await (await patchValues('host', id, [first])).json()) as { rev: number };
    expect(r2.rev).toBe(r1.rev);
    const events = await db.select().from(playEvents).where(eq(playEvents.playId, id));
    expect(events.filter((e) => e.clientOpId === first.opId)).toHaveLength(1);
  });

  it('is last-write-wins per field without clobbering other fields', async () => {
    const { id, json } = await createFromTable();
    const seatedId = json.players.find((p) => p.identity.userId === w.users.seated.id)!.identity.id;
    const hostId = json.players.find((p) => p.identity.userId === w.users.host.id)!.identity.id;
    await patchValues('host', id, [op(seatedId, 'coins', 3), op(hostId, 'coins', 3)]);
    await patchValues('seated', id, [op(seatedId, 'coins', 12)]);
    await patchValues('host', id, [op(seatedId, 'coins', 6)]);
    const got = (await (await send(as('host'), 'GET', `/api/plays/${id}`)).json()) as PlayJson;
    const byId = new Map(got.players.map((p) => [p.identity.id, p]));
    expect(byId.get(seatedId)?.values.coins).toBe(6);
    expect(byId.get(hostId)?.values.coins).toBe(3);
    const sets = await db
      .select()
      .from(playEvents)
      .where(eq(playEvents.playId, id))
      .orderBy(playEvents.rev);
    const last = sets.filter((e) => e.identityId === seatedId && e.action === 'set_value').at(-1);
    expect(last).toMatchObject({ oldValue: 12, newValue: 6, actorUserId: w.users.host.id });
  });

  it('clears a field with null', async () => {
    const { id, json } = await createFromTable();
    const a = json.players[0]!.identity.id;
    await patchValues('host', id, [op(a, 'coins', 6)]);
    const res = await patchValues('host', id, [op(a, 'coins', null)]);
    const play = ((await res.json()) as { play: PlayJson }).play;
    expect(play.players.find((p) => p.identity.id === a)?.values).toEqual({});
  });

  it('validates Critter Kitchen setup and merges independent meal inputs', async () => {
    const existing = await db
      .select({ id: games.id })
      .from(games)
      .where(eq(games.slug, 'critter-kitchen'))
      .limit(1);
    let gameId = existing[0]?.id;
    if (!gameId) {
      const [game] = await db
        .insert(games)
        .values({ slug: 'critter-kitchen', nameEn: 'Critter Kitchen' })
        .returning({ id: games.id });
      gameId = game!.id;
      extraGameIds.push(gameId);
    }
    const existingMealTemplate = await db
      .select({ id: scoreTemplates.id })
      .from(scoreTemplates)
      .where(and(eq(scoreTemplates.gameId, gameId), eq(scoreTemplates.version, 3)))
      .limit(1);
    if (!existingMealTemplate[0]) {
      await db.insert(scoreTemplates).values({
        gameId,
        variant: 'final-meal',
        version: 3,
        status: 'pending',
        definition: scoreTemplateFixture({
          slug: 'critter-kitchen',
          name: 'Critter Kitchen shared meal',
          templateVersion: 3,
          variant: 'final-meal',
          playerCount: { min: 2, max: 7 },
          categories: [
            {
              key: 'meal',
              label: 'Final meal inputs',
              scope: 'player',
              input: 'number',
              formula: { type: 'sum' },
              countsToTotal: false,
            },
          ],
          notes: 'The Critter Kitchen engine computes the result from the meal record.',
          sources: [
            {
              url: 'https://cardboardalchemy.com/downloads/CritterKitchen_Rulebook.pdf',
              title: 'Critter Kitchen Rulebook',
              type: 'official-rulebook',
            },
          ],
          confidence: 'high',
          needsReview: true,
        }),
        confidence: 'high',
        needsReview: true,
        sources: [
          {
            url: 'https://cardboardalchemy.com/downloads/CritterKitchen_Rulebook.pdf',
            title: 'Critter Kitchen Rulebook',
            type: 'official-rulebook',
          },
        ],
      });
    }
    const tableId = await createTestTable(gameId);
    const beforePlay = (await (
      await send(as('host'), 'GET', `/api/tables/${tableId}/plays/current`)
    ).json()) as { template: { version: number } | null };
    expect(beforePlay.template?.version).toBe(3);
    const { id, json, res } = await createFromTable('host', {}, tableId);
    expect(res.status).toBe(201);
    expect(json.template?.version).toBe(3);

    const identityId = json.players[0]!.identity.id;
    expect(
      (await patchValues('host', id, [op(identityId, 'meal', 1, { inputKey: 'unknownInput' })]))
        .status,
    ).toBe(422);
    expect(
      (await patchValues('host', id, [op(identityId, 'meal', { unknownInput: 1 })])).status,
    ).toBe(422);
    const updates = await Promise.all([
      patchValues('host', id, [op(identityId, 'meal', 2, { inputKey: 'previousStars' })]),
      patchValues('host', id, [op(identityId, 'meal', 1, { inputKey: 'soupCount' })]),
    ]);
    expect(updates.map((response) => response.status)).toEqual([200, 200]);
    const persisted = (await (
      await send(as('host'), 'GET', `/api/plays/${id}`)
    ).json()) as PlayJson;
    expect(persisted.players[0]?.values.meal).toMatchObject({ previousStars: 2, soupCount: 1 });

    expect(
      (
        await send(as('host'), 'PATCH', `/api/plays/${id}`, {
          setup: { criticId: 'the-mouse', rumorIds: [], cartIds: [], sixSevenPlayerMode: false },
        })
      ).status,
    ).toBe(422);
    expect(
      (
        await send(as('host'), 'PATCH', `/api/plays/${id}`, {
          setup: {
            criticId: 'unknown-critic',
            rumorIds: ['bread-fanatic', 'carrot-fanatic', 'cheese-fanatic'],
            cartIds: [],
            sixSevenPlayerMode: false,
          },
        })
      ).status,
    ).toBe(422);
    const setup = {
      criticId: 'the-mouse',
      rumorIds: ['bread-fanatic', 'carrot-fanatic', 'cheese-fanatic'],
      additionalRumorIds: [],
      cartIds: [],
      sixSevenPlayerMode: false,
    };
    const configured = await send(as('host'), 'PATCH', `/api/plays/${id}`, { setup });
    expect(configured.status).toBe(200);
    expect(((await configured.json()) as PlayJson).warnings?.length).toBeGreaterThan(0);
    expect((await send(as('host'), 'POST', `/api/plays/${id}/finalize`)).status).toBe(422);

    const legacyTemplate = await db
      .select({ id: scoreTemplates.id })
      .from(scoreTemplates)
      .where(and(eq(scoreTemplates.gameId, gameId), eq(scoreTemplates.version, 1)))
      .limit(1);
    let legacyTemplateId = legacyTemplate[0]?.id;
    if (!legacyTemplateId) {
      const [template] = await db
        .insert(scoreTemplates)
        .values({
          gameId,
          variant: 'legacy',
          version: 1,
          status: 'approved',
          definition: scoreTemplateFixture({ slug: 'critter-kitchen' }),
          confidence: 'high',
          needsReview: false,
          sources: [{ url: 'https://example.com', title: 'Legacy test', type: 'other' }],
        })
        .returning({ id: scoreTemplates.id });
      legacyTemplateId = template!.id;
    }
    const legacy = (await (
      await send(as('host'), 'POST', '/api/plays', {
        id: uuid(),
        gameId,
        scoreTemplateId: legacyTemplateId,
      })
    ).json()) as PlayJson;
    const legacyInput = await patchValues('host', legacy.id, [
      op(legacy.players[0]!.identity.id, 'coins', 9),
    ]);
    expect(legacyInput.status).toBe(200);
    expect(
      ((await legacyInput.json()) as { play: PlayJson }).play.players[0]?.computed,
    ).toMatchObject({
      total: 3,
    });
    expect((await send(as('host'), 'POST', `/api/plays/${legacy.id}/finalize`)).status).toBe(200);
  });
});

describe('permissions', () => {
  it('table members edit only their linked identity, while the host manages all rows', async () => {
    const { id, json, tableId } = await createFromTable('host');
    const hostIdentity = json.players.find((p) => p.identity.userId === w.users.host.id)!.identity
      .id;
    const seatedIdentity = json.players.find((p) => p.identity.userId === w.users.seated.id)!
      .identity.id;
    expect((await patchValues('seated', id, [op(seatedIdentity, 'coins', 3)])).status).toBe(200);
    expect((await patchValues('seated', id, [op(hostIdentity, 'coins', 6)])).status).toBe(403);
    expect((await patchValues('host', id, [op(hostIdentity, 'coins', 9)])).status).toBe(200);
    expect((await patchValues('host', id, [op(seatedIdentity, 'coins', 10)])).status).toBe(200);
    expect((await send(as('seated'), 'PATCH', `/api/plays/${id}`, { setup: {} })).status).toBe(403);
    expect((await send(as('seated'), 'PATCH', `/api/plays/${id}`, { addPlayers: [] })).status).toBe(
      403,
    );
    expect((await send(as('admin'), 'PATCH', `/api/plays/${id}`, { addPlayers: [] })).status).toBe(
      403,
    );
    expect((await send(as('owner'), 'POST', `/api/plays/${id}/finalize`)).status).toBe(403);
    expect((await patchValues('other', id, [op(hostIdentity, 'coins', 1)])).status).toBe(403);
    expect((await send(as('outsider'), 'GET', `/api/plays/${id}`)).status).toBe(404);
    expect((await send(as(null), 'GET', `/api/plays/${id}`)).status).toBe(401);
    const view = (await (await send(as('seated'), 'GET', `/api/plays/${id}`)).json()) as PlayJson;
    expect(view).toMatchObject({
      canEdit: true,
      canManage: false,
      editableIdentityIds: [seatedIdentity],
    });
    const current = (await (
      await send(as('seated'), 'GET', `/api/tables/${tableId}/plays/current`)
    ).json()) as { canManage: boolean; editableIdentityIds: string[]; play: PlayJson };
    expect(current).toMatchObject({
      canManage: false,
      editableIdentityIds: [seatedIdentity],
      play: { id },
    });
  });

  it('lets the host edit a guest row that table members cannot edit', async () => {
    const tableId = await createTestTable();
    const guest = (await (
      await send(as('host'), 'POST', `/api/tables/${tableId}/guests`, { displayName: 'Guest' })
    ).json()) as { id: string };
    const { id, json } = await createFromTable('host', {}, tableId);
    expect(json.players.map((player) => player.identity.id)).toContain(guest.id);
    expect((await patchValues('seated', id, [op(guest.id, 'coins', 2)])).status).toBe(403);
    expect((await patchValues('host', id, [op(guest.id, 'coins', 5)])).status).toBe(200);
  });

  it('a player added from the club list can edit afterwards', async () => {
    const { id } = await createFromTable('host');
    const list = (await (
      await send(as('host'), 'GET', `/api/clubs/${w.clubId}/identities`)
    ).json()) as {
      items: { id: string; userId: string | null }[];
    };
    const other = list.items.find((i) => i.userId === w.users.other.id)!;
    const add = await send(as('host'), 'PATCH', `/api/plays/${id}`, { addPlayers: [other.id] });
    expect(add.status).toBe(200);
    expect(((await add.json()) as PlayJson).players).toHaveLength(3);
    expect((await patchValues('other', id, [op(other.id, 'coins', 3)])).status).toBe(200);
  });

  it('rejects adding people outside the club', async () => {
    const { id } = await createFromTable('host');
    const created = await send(as('outsider'), 'POST', '/api/plays', {
      id: uuid(),
      gameId: w.gameId,
    });
    const outsiderId = ((await created.json()) as PlayJson).players[0]!.identity.id;
    expect(
      (await send(as('host'), 'PATCH', `/api/plays/${id}`, { addPlayers: [outsiderId] })).status,
    ).toBe(422);
  });

  it('rechecks poll and stream access after a table member leaves the play and seat', async () => {
    const { id, json, tableId } = await createFromTable('host');
    const seatedIdentity = json.players.find(
      (player) => player.identity.userId === w.users.seated.id,
    )!.identity.id;
    const removed = await send(as('host'), 'PATCH', `/api/plays/${id}`, {
      removePlayers: [seatedIdentity],
    });
    expect(removed.status).toBe(200);
    await db
      .update(meetupParticipants)
      .set({ tableId: null })
      .where(
        and(
          eq(meetupParticipants.meetupId, w.meetupId),
          eq(meetupParticipants.userId, w.users.seated.id),
          eq(meetupParticipants.tableId, tableId),
        ),
      );
    expect((await send(as('seated'), 'GET', `/api/plays/${id}?sinceRev=${json.rev}`)).status).toBe(
      200,
    );
    const stream = await send(as('seated'), 'GET', `/api/plays/${id}/stream`);
    expect(stream.status).toBe(200);
    await stream.body?.cancel();
  });

  it('moves only pinned shared categories when the first player is removed', async () => {
    const { id, json } = await createFromTable('host');
    const [first, second] = json.players.map((player) => player.identity.id) as [string, string];
    const [template] = await db
      .insert(scoreTemplates)
      .values({
        gameId: w.gameId,
        variant: `shared-${uuid()}`,
        version: 3,
        status: 'approved',
        definition: scoreTemplateFixture({
          templateVersion: 3,
          categories: [
            {
              key: 'sharedPrice',
              label: 'Price',
              scope: 'team',
              input: 'number',
              formula: { type: 'sum' },
              countsToTotal: false,
            },
            {
              key: 'cash',
              label: 'Cash',
              scope: 'player',
              input: 'number',
              formula: { type: 'sum' },
              countsToTotal: true,
            },
          ],
        }),
        confidence: 'high',
        needsReview: false,
        sources: [],
      })
      .returning({ id: scoreTemplates.id });
    expect(
      (await send(as('host'), 'PATCH', `/api/plays/${id}`, { scoreTemplateId: template!.id }))
        .status,
    ).toBe(200);
    await db
      .update(playPlayers)
      .set({ values: { sharedPrice: 400, cash: 99 } })
      .where(and(eq(playPlayers.playId, id), eq(playPlayers.identityId, first)));
    await db
      .update(playPlayers)
      .set({ values: { sharedPrice: 100, cash: 5 } })
      .where(and(eq(playPlayers.playId, id), eq(playPlayers.identityId, second)));
    const response = await send(as('host'), 'PATCH', `/api/plays/${id}`, {
      removePlayers: [first],
    });
    expect(response.status).toBe(200);
    const changed = (await response.json()) as PlayJson;
    expect(changed.players[0]?.values).toEqual({ sharedPrice: 400, cash: 5 });
    const last = await send(as('host'), 'PATCH', `/api/plays/${id}`, { removePlayers: [second] });
    expect(last.status).toBe(200);
    expect(((await last.json()) as PlayJson).players).toEqual([]);
  });

  it('removes players and keeps results consistent', async () => {
    const { id, json } = await createFromTable('host');
    const [a, b] = json.players.map((p) => p.identity.id) as [string, string];
    const res = await send(as('host'), 'PATCH', `/api/plays/${id}`, { removePlayers: [b] });
    const play = (await res.json()) as PlayJson;
    expect(play.players.map((p) => p.identity.id)).toEqual([a]);
    expect(
      (await send(as('host'), 'PATCH', `/api/plays/${id}`, { removePlayers: [b] })).status,
    ).toBe(422);
  });
});

describe('finalize and history', () => {
  it('finalizes table plays and rejects further result mutations', async () => {
    const { id, json } = await createFromTable('host');
    const a = json.players[0]!.identity.id;
    await patchValues('host', id, [op(a, 'coins', 6)]);
    expect((await send(as('seated'), 'POST', `/api/plays/${id}/finalize`)).status).toBe(403);
    const fin = (await (
      await send(as('host'), 'POST', `/api/plays/${id}/finalize`)
    ).json()) as PlayJson;
    expect(fin).toMatchObject({ status: 'final', editedAfterFinal: false });
    const again = (await (
      await send(as('host'), 'POST', `/api/plays/${id}/finalize`)
    ).json()) as PlayJson;
    expect(again.rev).toBe(fin.rev);

    expect((await patchValues('seated', id, [op(a, 'coins', 9)])).status).toBe(409);
    expect((await send(as('host'), 'PATCH', `/api/plays/${id}`, { setup: {} })).status).toBe(409);
    expect(
      (await send(as('host'), 'PATCH', `/api/plays/${id}`, { removePlayers: [a] })).status,
    ).toBe(409);
    expect((await send(as('host'), 'PATCH', `/api/plays/${id}`, { outcome: 'win' })).status).toBe(
      409,
    );

    const unchanged = (await (
      await send(as('host'), 'GET', `/api/plays/${id}`)
    ).json()) as PlayJson;
    expect(unchanged).toMatchObject({ status: 'final', editedAfterFinal: false, rev: fin.rev });

    const history = (await (await send(as('seated'), 'GET', '/api/me/plays?limit=50')).json()) as {
      items: { id: string; myComputed: unknown }[];
    };
    expect(history.items.map((i) => i.id)).toContain(id);
    const none = (await (await send(as('other'), 'GET', '/api/me/plays')).json()) as {
      items: { id: string }[];
    };
    expect(none.items.map((i) => i.id)).not.toContain(id);
  });

  it('preserves post-final edits for non-table plays', async () => {
    const created = await send(as('host'), 'POST', '/api/plays', {
      id: uuid(),
      gameId: w.gameId,
    });
    expect(created.status).toBe(201);
    const play = (await created.json()) as PlayJson;
    const identityId = play.players[0]!.identity.id;

    expect((await send(as('host'), 'POST', `/api/plays/${play.id}/finalize`)).status).toBe(200);
    const edit = await patchValues('host', play.id, [op(identityId, 'coins', 9)]);
    expect(edit.status).toBe(200);
    expect(((await edit.json()) as { play: PlayJson }).play).toMatchObject({
      status: 'final',
      editedAfterFinal: true,
    });
  });

  it('paginates history by cursor', async () => {
    const page1 = (await (await send(as('host'), 'GET', '/api/me/plays?limit=2')).json()) as {
      items: { id: string }[];
      nextCursor: string | null;
    };
    expect(page1.items).toHaveLength(2);
    expect(page1.nextCursor).not.toBeNull();
    const page2 = (await (
      await send(as('host'), 'GET', `/api/me/plays?limit=2&cursor=${page1.nextCursor}`)
    ).json()) as { items: { id: string }[] };
    expect(page2.items[0]!.id).not.toBe(page1.items[0]!.id);
    expect(page1.items.map((i) => i.id)).not.toContain(page2.items[0]!.id);
  });
});

describe('score template endpoint', () => {
  it('prefers approved over pending and flags review', async () => {
    const approved = (await (
      await send(as('other'), 'GET', `/api/games/${w.gameId}/score-template`)
    ).json()) as {
      version: number;
      status: string;
      needsReview: boolean;
    };
    expect(approved).toMatchObject({ status: 'approved', version: 2, needsReview: false });
    await db
      .update(scoreTemplates)
      .set({ status: 'pending' })
      .where(eq(scoreTemplates.gameId, w.gameId));
    const pending = (await (
      await send(as('other'), 'GET', `/api/games/${w.gameId}/score-template`)
    ).json()) as {
      needsReview: boolean;
      status: string;
    };
    expect(pending).toMatchObject({ status: 'pending', needsReview: true });
    await db
      .update(scoreTemplates)
      .set({ status: 'approved' })
      .where(eq(scoreTemplates.gameId, w.gameId));
    expect((await send(as('other'), 'GET', `/api/games/${uuid()}/score-template`)).status).toBe(
      404,
    );
  });
});

describe('realtime', () => {
  it('polling returns the play only when the revision moved', async () => {
    const { id, json } = await createFromTable();
    const same = (await (
      await send(as('host'), 'GET', `/api/plays/${id}?sinceRev=${json.rev}`)
    ).json()) as {
      rev: number;
      play?: PlayJson;
    };
    expect(same.play).toBeUndefined();
    await patchValues('host', id, [op(json.players[0]!.identity.id, 'coins', 3)]);
    const moved = (await (
      await send(as('host'), 'GET', `/api/plays/${id}?sinceRev=${json.rev}`)
    ).json()) as {
      rev: number;
      play?: PlayJson;
    };
    expect(moved.rev).toBeGreaterThan(json.rev);
    expect(moved.play?.players[0]?.values).toMatchObject({ coins: 3 });
    const future = (await (
      await send(as('host'), 'GET', `/api/plays/${id}?sinceRev=${moved.rev + 10}`)
    ).json()) as { rev: number; play?: PlayJson };
    expect(future).toMatchObject({ rev: moved.rev, play: { id } });
  });

  it('presence is visible to editors and expires with the heartbeat state', async () => {
    const { id, json } = await createFromTable();
    const seatedIdentity = json.players.find((p) => p.identity.userId === w.users.seated.id)!
      .identity.id;
    const hostIdentity = json.players.find((p) => p.identity.userId === w.users.host.id)!.identity
      .id;
    expect(
      (await send(as('seated'), 'POST', `/api/plays/${id}/presence`, { identityId: hostIdentity }))
        .status,
    ).toBe(422);
    const res = await send(as('seated'), 'POST', `/api/plays/${id}/presence`, {
      identityId: seatedIdentity,
      categoryKey: 'coins',
    });
    expect(((await res.json()) as { presence: { userId: string }[] }).presence[0]?.userId).toBe(
      w.users.seated.id,
    );
    const poll = (await (await send(as('host'), 'GET', `/api/plays/${id}?sinceRev=99`)).json()) as {
      presence: { categoryKey: string }[];
    };
    expect(poll.presence[0]?.categoryKey).toBe('coins');
  });

  it('streams viewer-specific table snapshots without broadcasting raw ops', async () => {
    const { id, json } = await createFromTable();
    const a = json.players[0]!.identity.id;
    const res = await send(as('seated'), 'GET', `/api/plays/${id}/stream`);
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('text/event-stream');
    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    const readUntil = async (predicate: (text: string) => boolean) => {
      while (!predicate(buffer)) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value);
      }
    };
    await readUntil((t) => t.includes('\n\n'));
    expect(buffer).toContain('event: play');
    expect(buffer).toContain(`"rev":${json.rev}`);
    expect(buffer).toContain('"state":{');
    expect(buffer).toContain('"canManage":false');

    const changed = await patchValues('host', id, [op(a, 'coins', 9)]);
    const { rev } = (await changed.json()) as { rev: number };
    await readUntil((t) => t.includes(`"rev":${rev}`));
    expect(buffer).toContain(`"rev":${rev}`);
    expect(buffer).toContain('"ops":[]');
    expect(buffer).toContain('"computed":{}');
    expect(buffer).toContain('"coins":9');
    expect(buffer).not.toContain('"categoryKey":"coins"');

    const setup = await send(as('host'), 'PATCH', `/api/plays/${id}`, {
      setup: { serviceMode: 'shared' },
    });
    expect(setup.status).toBe(200);
    await readUntil((t) => t.includes('"setup":{"serviceMode":"shared"}'));
    expect(buffer).toContain('"setup":{"serviceMode":"shared"}');
    await reader.cancel();

    expect((await send(as('outsider'), 'GET', `/api/plays/${id}/stream`)).status).toBe(404);
  });
});
