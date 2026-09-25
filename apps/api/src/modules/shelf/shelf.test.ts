import { eq, inArray } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../../app.js';
import { auth } from '../../auth/better-auth.js';
import { db, pool } from '../../db/client.js';
import { gameBarcodes, games, userGames, users } from '../../db/schema/index.js';
import { fakeAuth, fakeUser } from '../../test/fake-auth.js';

const app = createApp({ auth, rateLimit: false });
const stamp = Date.now();
const password = 'shelf module pass 1';
const headers = { 'content-type': 'application/json', origin: 'http://localhost:3000' };

interface Account {
  email: string;
  username: string;
}

function account(tag: string): Account {
  return {
    email: `${tag}-shelf-${stamp}@example.test`,
    username: `${tag}shelf${stamp}`.slice(0, 30),
  };
}

const alice = account('alice');
const bob = account('bob');
const carol = account('carol');
const dave = account('dave');

const allAccounts = [alice, bob, carol, dave];

function post(path: string, body: unknown, cookie: string | undefined) {
  return app.request(`/api/auth${path}`, {
    method: 'POST',
    headers: { ...headers, ...(cookie && { cookie }) },
    body: JSON.stringify(body),
  });
}

async function signUpVerified(acc: Account): Promise<string> {
  await post('/sign-up/email', { ...acc, password, name: acc.username }, undefined);
  await db.update(users).set({ emailVerified: true }).where(eq(users.email, acc.email));
  const res = await post('/sign-in/email', { email: acc.email, password }, undefined);
  return res.headers
    .getSetCookie()
    .map((c) => c.split(';')[0])
    .join('; ');
}

const cookie: Record<string, string> = {};

function api(cookieHeader: string) {
  return { cookie: cookieHeader, 'content-type': 'application/json' };
}

async function setPrivacy(username: string, profileVisibility: 'public' | 'friends' | 'private') {
  const res = await app.request('/api/me/privacy', {
    method: 'PATCH',
    headers: api(cookie[username]!),
    body: JSON.stringify({ profileVisibility }),
  });
  expect(res.status).toBe(204);
}

const maintainer = fakeUser('maintainer');
const maintainerApp = createApp({ auth: fakeAuth(maintainer), rateLimit: false });
const anonApp = createApp({ auth: fakeAuth(null), rateLimit: false });

const HIT_CODE = '96385074';
const createdGameIds: string[] = [];

interface CreatedGame {
  id: string;
  slug: string;
}

async function createGame(nameEn: string): Promise<CreatedGame> {
  const res = await maintainerApp.request('/api/games', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ nameEn, acceptLicense: true }),
  });
  const json = (await res.json()) as CreatedGame;
  createdGameIds.push(json.id);
  return json;
}

const cleanup = () =>
  db.delete(users).where(
    inArray(
      users.email,
      allAccounts.map((a) => a.email),
    ),
  );

beforeAll(async () => {
  await cleanup();
  await db
    .insert(users)
    .values({ ...maintainer, role: 'maintainer' })
    .onConflictDoNothing({ target: users.id });
  for (const acc of allAccounts) {
    cookie[acc.username] = await signUpVerified(acc);
  }
});

afterAll(async () => {
  await cleanup();
  if (createdGameIds.length > 0) {
    await db.delete(gameBarcodes).where(inArray(gameBarcodes.gameId, createdGameIds));
    await db.delete(userGames).where(inArray(userGames.gameId, createdGameIds));
    await db.delete(games).where(inArray(games.id, createdGameIds));
  }
  await db.delete(users).where(eq(users.id, maintainer.id));
  await pool.end();
});

describe('shelf CRUD', () => {
  it('adds idempotently, updates the note, then removes', async () => {
    const game = await createGame(`Shelf Game ${stamp}`);

    const add1 = await app.request('/api/me/shelf', {
      method: 'POST',
      headers: api(cookie[alice.username]!),
      body: JSON.stringify({ gameId: game.id, note: 'bản gốc' }),
    });
    expect(add1.status).toBe(200);

    const add2 = await app.request('/api/me/shelf', {
      method: 'POST',
      headers: api(cookie[alice.username]!),
      body: JSON.stringify({ gameId: game.id, note: 'đã sửa' }),
    });
    expect(add2.status).toBe(200);
    expect(((await add2.json()) as { note: string | null }).note).toBe('đã sửa');

    const list = (await (
      await app.request('/api/me/shelf', {
        headers: { origin: 'http://localhost:3000', cookie: cookie[alice.username]! },
      })
    ).json()) as { items: { game: { id: string }; note: string | null }[] };
    expect(list.items).toHaveLength(1);
    expect(list.items[0]!.note).toBe('đã sửa');

    const remove = await app.request(`/api/me/shelf/${game.id}`, {
      method: 'DELETE',
      headers: { origin: 'http://localhost:3000', cookie: cookie[alice.username]! },
    });
    expect(remove.status).toBe(204);

    const removeAgain = await app.request(`/api/me/shelf/${game.id}`, {
      method: 'DELETE',
      headers: { origin: 'http://localhost:3000', cookie: cookie[alice.username]! },
    });
    expect(removeAgain.status).toBe(404);
  });

  it('rejects an unauthenticated request with 401', async () => {
    const res = await app.request('/api/me/shelf');
    expect(res.status).toBe(401);
  });

  it('keeps the existing note when re-adding without one, and treats blank as null', async () => {
    const game = await createGame(`Shelf Note Preserve ${stamp}`);

    const withNote = await app.request('/api/me/shelf', {
      method: 'POST',
      headers: api(cookie[alice.username]!),
      body: JSON.stringify({ gameId: game.id, note: 'giữ ghi chú này' }),
    });
    expect(((await withNote.json()) as { note: string | null }).note).toBe('giữ ghi chú này');

    const reAddNoNote = await app.request('/api/me/shelf', {
      method: 'POST',
      headers: api(cookie[alice.username]!),
      body: JSON.stringify({ gameId: game.id }),
    });
    expect(((await reAddNoNote.json()) as { note: string | null }).note).toBe('giữ ghi chú này');

    const blankNote = await app.request('/api/me/shelf', {
      method: 'POST',
      headers: api(cookie[alice.username]!),
      body: JSON.stringify({ gameId: game.id, note: '   ' }),
    });
    expect(((await blankNote.json()) as { note: string | null }).note).toBeNull();

    await app.request(`/api/me/shelf/${game.id}`, {
      method: 'DELETE',
      headers: { origin: 'http://localhost:3000', cookie: cookie[alice.username]! },
    });
  });
});

describe('shelf visibility on public profile', () => {
  it('hides from a stranger when private, shows to a friend, hides when blocked', async () => {
    const game = await createGame(`Shelf Visibility ${stamp}`);
    await app.request('/api/me/shelf', {
      method: 'POST',
      headers: api(cookie[bob.username]!),
      body: JSON.stringify({ gameId: game.id }),
    });
    await setPrivacy(bob.username, 'private');

    const asStranger = await (await app.request(`/api/users/${bob.username}/shelf`)).json();
    expect(asStranger).toEqual({ hidden: true });

    await setPrivacy(bob.username, 'friends');

    const asStrangerFriendsLevel = await (
      await app.request(`/api/users/${bob.username}/shelf`, {
        headers: { origin: 'http://localhost:3000', cookie: cookie[carol.username]! },
      })
    ).json();
    expect(asStrangerFriendsLevel).toEqual({ hidden: true });

    await app.request('/api/friends/requests', {
      method: 'POST',
      headers: api(cookie[bob.username]!),
      body: JSON.stringify({ username: carol.username }),
    });
    await app.request('/api/friends/requests', {
      method: 'POST',
      headers: api(cookie[carol.username]!),
      body: JSON.stringify({ username: bob.username }),
    });

    const asFriend = (await (
      await app.request(`/api/users/${bob.username}/shelf`, {
        headers: { origin: 'http://localhost:3000', cookie: cookie[carol.username]! },
      })
    ).json()) as { hidden: false; items: { game: { id: string } }[] };
    expect(asFriend.hidden).toBe(false);
    expect(asFriend.items.some((i) => i.game.id === game.id)).toBe(true);

    await app.request('/api/blocks', {
      method: 'POST',
      headers: api(cookie[bob.username]!),
      body: JSON.stringify({ userId: await currentUserId(carol.username) }),
    });

    const asBlocked = await (
      await app.request(`/api/users/${bob.username}/shelf`, {
        headers: { origin: 'http://localhost:3000', cookie: cookie[carol.username]! },
      })
    ).json();
    expect(asBlocked).toEqual({ hidden: true });
  });

  it('returns 404 for an unknown username', async () => {
    const res = await app.request(`/api/users/no-such-user-${stamp}/shelf`);
    expect(res.status).toBe(404);
  });
});

async function currentUserId(username: string): Promise<string> {
  const res = await app.request('/api/me', {
    headers: { origin: 'http://localhost:3000', cookie: cookie[username]! },
  });
  const { user } = (await res.json()) as { user: { id: string } };
  return user.id;
}

describe('game owners count', () => {
  it('counts every shelf row across all privacy levels', async () => {
    const game = await createGame(`Owners Count ${stamp}`);
    await app.request('/api/me/shelf', {
      method: 'POST',
      headers: api(cookie[dave.username]!),
      body: JSON.stringify({ gameId: game.id }),
    });
    await app.request('/api/me/shelf', {
      method: 'POST',
      headers: api(cookie[alice.username]!),
      body: JSON.stringify({ gameId: game.id }),
    });
    await setPrivacy(alice.username, 'private');

    const detail = (await (await app.request(`/api/games/${game.slug}`)).json()) as {
      ownersCount: number;
    };
    expect(detail.ownersCount).toBe(2);
  });
});

describe('local barcode lookup', () => {
  it('requires auth', async () => {
    const res = await anonApp.request(`/api/barcodes/local/${HIT_CODE}`);
    expect(res.status).toBe(401);
  });

  it('finds a locally linked game and returns null for an unlinked code', async () => {
    const game = await createGame(`Local Barcode ${stamp}`);
    await db.insert(gameBarcodes).values({ code: HIT_CODE, gameId: game.id, source: 'manual' });

    const hit = (await (
      await app.request(`/api/barcodes/local/${HIT_CODE}`, {
        headers: { origin: 'http://localhost:3000', cookie: cookie[alice.username]! },
      })
    ).json()) as { game: { id: string } | null };
    expect(hit.game?.id).toBe(game.id);

    const miss = (await (
      await app.request('/api/barcodes/local/4006381333931', {
        headers: { origin: 'http://localhost:3000', cookie: cookie[alice.username]! },
      })
    ).json()) as { game: unknown };
    expect(miss.game).toBeNull();

    await db.delete(gameBarcodes).where(eq(gameBarcodes.code, HIT_CODE));
  });
});
