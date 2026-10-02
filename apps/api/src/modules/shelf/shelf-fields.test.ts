import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../../app.js';
import { db } from '../../db/client.js';
import { games, identities, playPlayers, plays, users } from '../../db/schema/index.js';
import { fakeAuth, fakeUser } from '../../test/fake-auth.js';

const stamp = Date.now();
const user = {
  ...fakeUser('user'),
  id: `u-shf-${stamp}`,
  email: `shf-${stamp}@example.test`,
  username: `shf${stamp}`,
};
const app = createApp({ auth: fakeAuth(user), rateLimit: false });
const viewer = createApp({ auth: fakeAuth(null), rateLimit: false });
const json = { 'content-type': 'application/json' };
let gameA = '';
let gameB = '';

interface Item {
  game: { id: string };
  note: string | null;
  condition: string | null;
  sleeved: boolean;
  boxProtected: boolean;
  edition: string | null;
  lastPlayedAt: string | null;
}

const add = async (body: Record<string, unknown>) => {
  const res = await app.request('/api/me/shelf', {
    method: 'POST',
    headers: json,
    body: JSON.stringify(body),
  });
  expect(res.status).toBe(200);
  return (await res.json()) as Item;
};

beforeAll(async () => {
  await db.insert(users).values(user);
  const rows = await db
    .insert(games)
    .values([
      { slug: `shf-a-${stamp}`, nameEn: 'A' },
      { slug: `shf-b-${stamp}`, nameEn: 'B' },
    ])
    .returning({ id: games.id, slug: games.slug });
  gameA = rows.find((r) => r.slug.includes('-a-'))!.id;
  gameB = rows.find((r) => r.slug.includes('-b-'))!.id;
});

afterAll(async () => {
  await db.delete(plays).where(eq(plays.createdBy, user.id));
  await db.delete(identities).where(eq(identities.userId, user.id));
  await db.delete(users).where(eq(users.id, user.id));
  await db.delete(games).where(eq(games.id, gameA));
  await db.delete(games).where(eq(games.id, gameB));
});

describe('shelf condition fields', () => {
  it('defaults, sets, keeps when omitted, clears with null', async () => {
    const created = await add({ gameId: gameA });
    expect(created).toMatchObject({
      condition: null,
      sleeved: false,
      boxProtected: false,
      edition: null,
      lastPlayedAt: null,
    });

    const set = await add({
      gameId: gameA,
      condition: 'like_new',
      sleeved: true,
      boxProtected: true,
      edition: ' 2nd ',
      note: 'hi',
    });
    expect(set).toMatchObject({
      condition: 'like_new',
      sleeved: true,
      boxProtected: true,
      edition: '2nd',
      note: 'hi',
    });

    const kept = await add({ gameId: gameA, sleeved: false });
    expect(kept).toMatchObject({
      condition: 'like_new',
      sleeved: false,
      boxProtected: true,
      edition: '2nd',
      note: 'hi',
    });

    const cleared = await add({ gameId: gameA, condition: null, edition: null });
    expect(cleared).toMatchObject({
      condition: null,
      edition: null,
      boxProtected: true,
      note: 'hi',
    });
  });

  it('rejects invalid condition', async () => {
    const res = await app.request('/api/me/shelf', {
      method: 'POST',
      headers: json,
      body: JSON.stringify({ gameId: gameA, condition: 'mint' }),
    });
    expect(res.status).toBe(422);
  });

  it('lastPlayedAt is the latest play with the owner member identity', async () => {
    await add({ gameId: gameB });
    const [member] = await db
      .insert(identities)
      .values({ kind: 'member', userId: user.id, displayName: 'Me' })
      .returning({ id: identities.id });
    const [guest] = await db
      .insert(identities)
      .values({ kind: 'guest', displayName: 'Guest' })
      .returning({ id: identities.id });
    const old = new Date('2026-01-01T00:00:00Z');
    const recent = new Date('2026-03-05T10:00:00Z');
    const newestOthers = new Date('2026-06-01T00:00:00Z');
    const mk = async (startedAt: Date, gameId: string, who: string) => {
      const [p] = await db
        .insert(plays)
        .values({ id: crypto.randomUUID(), gameId, createdBy: user.id, startedAt })
        .returning({ id: plays.id });
      await db.insert(playPlayers).values({ playId: p!.id, identityId: who, seat: 1 });
    };
    await mk(old, gameA, member!.id);
    await mk(recent, gameA, member!.id);
    await mk(newestOthers, gameA, guest!.id);

    const res = await app.request('/api/me/shelf');
    const { items } = (await res.json()) as { items: Item[] };
    const byGame = Object.fromEntries(items.map((i) => [i.game.id, i.lastPlayedAt]));
    expect(byGame[gameA]).toBe(recent.toISOString());
    expect(byGame[gameB]).toBeNull();

    const profile = await viewer.request(`/api/users/${user.username}/shelf`);
    const body = (await profile.json()) as { hidden: boolean; items: Item[] };
    expect(body.hidden).toBe(false);
    expect(body.items.every((i) => i.lastPlayedAt === null)).toBe(true);
    expect(body.items.find((i) => i.game.id === gameA)?.sleeved).toBe(false);
  });
});
