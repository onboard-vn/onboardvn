import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../../app.js';
import { db } from '../../db/client.js';
import { games, users } from '../../db/schema/index.js';
import { fakeAuth, fakeUser } from '../../test/fake-auth.js';

const stamp = Date.now();
const user = { ...fakeUser('user'), id: `u-wish-${stamp}`, email: `wish-${stamp}@example.test` };
const app = createApp({ auth: fakeAuth(user), rateLimit: false });
const anon = createApp({ auth: fakeAuth(null), rateLimit: false });
const json = { 'content-type': 'application/json' };
const ids: string[] = [];

const post = (gameId: string, a = app) =>
  a.request('/api/me/wishlist', {
    method: 'POST',
    headers: json,
    body: JSON.stringify({ gameId }),
  });

beforeAll(async () => {
  await db.insert(users).values(user);
  const rows = await db
    .insert(games)
    .values([1, 2].map((n) => ({ slug: `wish-${stamp}-${n}`, nameEn: `Wish ${n}` })))
    .returning({ id: games.id });
  ids.push(...rows.map((r) => r.id));
});

afterAll(async () => {
  await db.delete(users).where(eq(users.id, user.id));
  for (const id of ids) await db.delete(games).where(eq(games.id, id));
});

describe('/api/me/wishlist', () => {
  it('requires auth', async () => {
    expect((await anon.request('/api/me/wishlist')).status).toBe(401);
    expect((await anon.request('/api/me/wishlist/ids')).status).toBe(401);
    expect((await post(ids[0]!, anon)).status).toBe(401);
    expect(
      (
        await anon.request(`/api/me/wishlist/${ids[0]}`, {
          method: 'DELETE',
          headers: { origin: 'http://localhost:3000' },
        })
      ).status,
    ).toBe(401);
  });

  it('adds idempotently, lists newest first, removes', async () => {
    expect((await post(ids[0]!)).status).toBe(201);
    expect((await post(ids[0]!)).status).toBe(200);
    expect((await post(ids[1]!)).status).toBe(201);

    const list = (await (await app.request('/api/me/wishlist')).json()) as {
      items: { game: { id: string }; createdAt: string }[];
    };
    expect(list.items.map((i) => i.game.id)).toEqual([ids[1], ids[0]]);

    const idsRes = (await (await app.request('/api/me/wishlist/ids')).json()) as {
      gameIds: string[];
    };
    expect(idsRes.gameIds.sort()).toEqual([...ids].sort());

    expect(
      (
        await app.request(`/api/me/wishlist/${ids[0]}`, {
          method: 'DELETE',
          headers: { origin: 'http://localhost:3000' },
        })
      ).status,
    ).toBe(204);
    expect(
      (
        await app.request(`/api/me/wishlist/${ids[0]}`, {
          method: 'DELETE',
          headers: { origin: 'http://localhost:3000' },
        })
      ).status,
    ).toBe(204);
    const after = (await (await app.request('/api/me/wishlist/ids')).json()) as {
      gameIds: string[];
    };
    expect(after.gameIds).toEqual([ids[1]]);
  });

  it('404 for unknown game, 422 for bad id', async () => {
    expect((await post('00000000-0000-4000-8000-000000000000')).status).toBe(404);
    expect((await post('nope')).status).toBe(422);
  });
});
