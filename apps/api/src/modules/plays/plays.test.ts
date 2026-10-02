import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { db, pool } from '../../db/client.js';
import { playEvents, plays, scoreTemplates } from '../../db/schema/index.js';
import { createWorld, send, type World } from '../../test/play-world.js';
import { scoreTemplateFixture } from '../../test/score-template-fixture.js';

let w: World;
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
  template: { id: string; needsReview: boolean } | null;
  game: { id: string };
  players: {
    identity: { id: string; userId: string | null; displayName: string };
    computed: { total: number; rank: number | null; isWinner: boolean } | null;
    values: Record<string, unknown>;
    rounds: Record<string, number[]> | null;
  }[];
}

async function createFromTable(who: Who = 'host', extra: object = {}) {
  const id = uuid();
  const res = await send(as(who), 'POST', `/api/tables/${w.tableId}/plays`, { id, ...extra });
  return { id, res, json: (await res.json()) as PlayJson };
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
  await w.cleanup();
  await pool.end();
});

describe('create', () => {
  it('prefills game, club, template and players from the table seats', async () => {
    const { res, json } = await createFromTable();
    expect(res.status).toBe(201);
    expect(json.clubId).toBe(w.clubId);
    expect(json.game.id).toBe(w.gameId);
    expect(json.template?.id).toBe(w.templateId);
    expect(json.players.map((p) => p.identity.userId).sort()).toEqual(
      [w.users.host.id, w.users.seated.id].sort(),
    );
  });

  it('is idempotent for the creator and conflicts for anyone else', async () => {
    const { id, json } = await createFromTable();
    const again = await send(as('host'), 'POST', '/api/plays', { id, meetupTableId: w.tableId });
    expect(again.status).toBe(201);
    expect(((await again.json()) as PlayJson).rev).toBe(json.rev);
    const stolen = await send(as('seated'), 'POST', '/api/plays', { id, meetupTableId: w.tableId });
    expect(stolen.status).toBe(409);
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

  it('finds the latest play of a table for viewers only', async () => {
    const { id } = await createFromTable();
    const found = await as('seated').request(`/api/tables/${w.tableId}/play`);
    expect(found.status).toBe(200);
    expect(((await found.json()) as PlayJson).id).toBe(id);
    expect((await as('outsider').request(`/api/tables/${w.tableId}/play`)).status).toBe(404);
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
    const [a, b] = json.players.map((p) => p.identity.id) as [string, string];
    await patchValues('host', id, [op(a, 'coins', 3), op(b, 'coins', 3)]);
    await patchValues('seated', id, [op(a, 'coins', 12)]);
    await patchValues('host', id, [op(a, 'coins', 6)]);
    const got = (await (await send(as('host'), 'GET', `/api/plays/${id}`)).json()) as PlayJson;
    const byId = new Map(got.players.map((p) => [p.identity.id, p]));
    expect(byId.get(a)?.values.coins).toBe(6);
    expect(byId.get(b)?.values.coins).toBe(3);
    const sets = await db
      .select()
      .from(playEvents)
      .where(eq(playEvents.playId, id))
      .orderBy(playEvents.rev);
    const last = sets.filter((e) => e.identityId === a && e.action === 'set_value').at(-1);
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
});

describe('permissions', () => {
  it('seated players, host, club admin and creator can edit; other members only view', async () => {
    const { id, json } = await createFromTable('host');
    const a = json.players[0]!.identity.id;
    expect((await patchValues('seated', id, [op(a, 'coins', 3)])).status).toBe(200);
    expect((await patchValues('admin', id, [op(a, 'coins', 6)])).status).toBe(200);
    expect((await patchValues('owner', id, [op(a, 'coins', 9)])).status).toBe(200);
    expect((await patchValues('other', id, [op(a, 'coins', 1)])).status).toBe(403);
    expect((await patchValues('outsider', id, [op(a, 'coins', 1)])).status).toBe(404);
    expect((await send(as('other'), 'GET', `/api/plays/${id}`)).status).toBe(200);
    expect((await send(as('outsider'), 'GET', `/api/plays/${id}`)).status).toBe(404);
    expect((await send(as(null), 'GET', `/api/plays/${id}`)).status).toBe(401);
    expect((await send(as('other'), 'POST', `/api/plays/${id}/finalize`)).status).toBe(403);
    const view = (await (await send(as('other'), 'GET', `/api/plays/${id}`)).json()) as PlayJson;
    expect(view.canEdit).toBe(false);
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
  it('finalizes, flags edits made afterwards, and lists the play in history', async () => {
    const { id, json } = await createFromTable('host');
    const a = json.players[0]!.identity.id;
    await patchValues('host', id, [op(a, 'coins', 6)]);
    const fin = (await (
      await send(as('seated'), 'POST', `/api/plays/${id}/finalize`)
    ).json()) as PlayJson;
    expect(fin).toMatchObject({ status: 'final', editedAfterFinal: false });
    const again = (await (
      await send(as('seated'), 'POST', `/api/plays/${id}/finalize`)
    ).json()) as PlayJson;
    expect(again.rev).toBe(fin.rev);

    const edit = (await (await patchValues('seated', id, [op(a, 'coins', 9)])).json()) as {
      play: PlayJson;
    };
    expect(edit.play).toMatchObject({ status: 'final', editedAfterFinal: true });
    expect(edit.play.rev).toBeGreaterThan(fin.rev);

    const history = (await (await send(as('seated'), 'GET', '/api/me/plays?limit=50')).json()) as {
      items: { id: string; myComputed: unknown }[];
    };
    expect(history.items.map((i) => i.id)).toContain(id);
    const none = (await (await send(as('other'), 'GET', '/api/me/plays')).json()) as {
      items: { id: string }[];
    };
    expect(none.items.map((i) => i.id)).not.toContain(id);
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
  });

  it('presence is visible to editors and expires with the heartbeat state', async () => {
    const { id, json } = await createFromTable();
    const a = json.players[0]!.identity.id;
    expect(
      (await send(as('other'), 'POST', `/api/plays/${id}/presence`, { identityId: a })).status,
    ).toBe(403);
    const res = await send(as('seated'), 'POST', `/api/plays/${id}/presence`, {
      identityId: a,
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

  it('streams an event over SSE when a value changes', async () => {
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

    const changed = await patchValues('host', id, [op(a, 'coins', 9)]);
    const { rev } = (await changed.json()) as { rev: number };
    await readUntil((t) => t.includes(`"rev":${rev}`));
    expect(buffer).toContain(`"rev":${rev}`);
    expect(buffer).toContain('"categoryKey":"coins"');
    await reader.cancel();

    expect((await send(as('outsider'), 'GET', `/api/plays/${id}/stream`)).status).toBe(404);
  });
});
