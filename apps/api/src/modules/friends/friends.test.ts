import { randomUUID } from 'node:crypto';
import { inArray } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../../app.js';
import { auth } from '../../auth/better-auth.js';
import { db, pool } from '../../db/client.js';
import { users } from '../../db/schema/index.js';

const app = createApp({ auth, rateLimit: false });
const stamp = Date.now();
const password = 'friends module pass 1';
const headers = { 'content-type': 'application/json', origin: 'http://localhost:3000' };

interface Account {
  email: string;
  username: string;
}

function account(tag: string): Account {
  return { email: `${tag}-${stamp}@example.test`, username: `${tag}_${stamp}`.slice(0, 30) };
}

const alice = account('alice');
const bob = account('bob');
const carol = account('carol');
const dave = account('dave');
const erin = account('erin');
const frank = account('frank');
const grace = account('grace');
const heidi = account('heidi');
const ivan = account('ivan');
const judy = account('judy');

const allAccounts = [alice, bob, carol, dave, erin, frank, grace, heidi, ivan, judy];

function post(path: string, body: unknown, cookie: string | undefined, appInstance = app) {
  return appInstance.request(`/api/auth${path}`, {
    method: 'POST',
    headers: { ...headers, ...(cookie && { cookie }) },
    body: JSON.stringify(body),
  });
}

async function signUpVerified(acc: Account, appInstance = app): Promise<string> {
  await post('/sign-up/email', { ...acc, password, name: acc.username }, undefined, appInstance);
  await db
    .update(users)
    .set({ emailVerified: true })
    .where(inArray(users.email, [acc.email]));
  const res = await post('/sign-in/email', { email: acc.email, password }, undefined, appInstance);
  return res.headers
    .getSetCookie()
    .map((c) => c.split(';')[0])
    .join('; ');
}

const cookie: Record<string, string> = {};
const userId: Record<string, string> = {};

async function loadUserId(username: string): Promise<string> {
  const res = await app.request('/api/me', {
    headers: { origin: 'http://localhost:3000', cookie: cookie[username]! },
  });
  const { user } = (await res.json()) as { user: { id: string } };
  return user.id;
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
  for (const acc of allAccounts) {
    cookie[acc.username] = await signUpVerified(acc);
  }
  for (const acc of allAccounts) {
    userId[acc.username] = await loadUserId(acc.username);
  }
});

afterAll(async () => {
  await cleanup();
  await pool.end();
});

function api(cookieHeader: string) {
  return { cookie: cookieHeader, 'content-type': 'application/json' };
}

describe('invite by friend code', () => {
  it('creates exactly one friendship no matter how many times it is confirmed, from either side', async () => {
    const codeRes = await app.request('/api/me/friend-code', {
      headers: { origin: 'http://localhost:3000', cookie: cookie[alice.username]! },
    });
    const { code } = (await codeRes.json()) as { code: string };

    const preview = await app.request(`/api/friends/invite/${code}`);
    expect(preview.status).toBe(200);
    const previewBody = await preview.json();
    expect(previewBody).toMatchObject({ username: alice.username });
    expect(JSON.stringify(previewBody)).not.toContain('@');

    const confirm1 = await app.request(`/api/friends/invite/${code}`, {
      method: 'POST',
      headers: api(cookie[bob.username]!),
    });
    expect(confirm1.status).toBe(200);

    const confirm2 = await app.request(`/api/friends/invite/${code}`, {
      method: 'POST',
      headers: api(cookie[bob.username]!),
    });
    expect(confirm2.status).toBe(200);

    const bobCode = await (
      await app.request('/api/me/friend-code', {
        headers: { origin: 'http://localhost:3000', cookie: cookie[bob.username]! },
      })
    ).json();
    const confirm3 = await app.request(
      `/api/friends/invite/${(bobCode as { code: string }).code}`,
      {
        method: 'POST',
        headers: api(cookie[alice.username]!),
      },
    );
    expect(confirm3.status).toBe(200);

    const aliceFriends = await (
      await app.request('/api/friends', {
        headers: { origin: 'http://localhost:3000', cookie: cookie[alice.username]! },
      })
    ).json();
    const bobFriends = await (
      await app.request('/api/friends', {
        headers: { origin: 'http://localhost:3000', cookie: cookie[bob.username]! },
      })
    ).json();
    expect((aliceFriends as { items: unknown[] }).items).toHaveLength(1);
    expect((bobFriends as { items: unknown[] }).items).toHaveLength(1);
  });

  it('rejects self-invite with 422', async () => {
    const codeRes = await app.request('/api/me/friend-code', {
      headers: { origin: 'http://localhost:3000', cookie: cookie[carol.username]! },
    });
    const { code } = (await codeRes.json()) as { code: string };
    const res = await app.request(`/api/friends/invite/${code}`, {
      method: 'POST',
      headers: api(cookie[carol.username]!),
    });
    expect(res.status).toBe(422);
  });

  it('makes the old code 404 after rotating', async () => {
    const before = await (
      await app.request('/api/me/friend-code', {
        headers: { origin: 'http://localhost:3000', cookie: cookie[carol.username]! },
      })
    ).json();
    const rotated = await app.request('/api/me/friend-code/rotate', {
      method: 'POST',
      headers: { origin: 'http://localhost:3000', cookie: cookie[carol.username]! },
    });
    expect(rotated.status).toBe(200);
    const stale = await app.request(`/api/friends/invite/${(before as { code: string }).code}`);
    expect(stale.status).toBe(404);
  });
});

describe('friend requests', () => {
  it('sends, lists, and accepts a request', async () => {
    const send = await app.request('/api/friends/requests', {
      method: 'POST',
      headers: api(cookie[carol.username]!),
      body: JSON.stringify({ username: dave.username }),
    });
    expect(send.status).toBe(201);
    expect(await send.json()).toEqual({ status: 'pending' });

    const count = await (
      await app.request('/api/friends/requests/count', {
        headers: { origin: 'http://localhost:3000', cookie: cookie[dave.username]! },
      })
    ).json();
    expect(count).toEqual({ count: 1 });

    const incoming = await (
      await app.request('/api/friends/requests?dir=in', {
        headers: { origin: 'http://localhost:3000', cookie: cookie[dave.username]! },
      })
    ).json();
    expect((incoming as { items: unknown[] }).items).toHaveLength(1);
    expect(JSON.stringify(incoming)).not.toContain('@');

    const accept = await app.request(`/api/friends/requests/${userId[carol.username]}/accept`, {
      method: 'POST',
      headers: { origin: 'http://localhost:3000', cookie: cookie[dave.username]! },
    });
    expect(accept.status).toBe(204);

    const daveFriends = (await (
      await app.request('/api/friends', {
        headers: { origin: 'http://localhost:3000', cookie: cookie[dave.username]! },
      })
    ).json()) as { items: { username: string | null }[] };
    expect(daveFriends.items.some((f) => f.username === carol.username)).toBe(true);

    const daveCount = await (
      await app.request('/api/friends/requests/count', {
        headers: { origin: 'http://localhost:3000', cookie: cookie[dave.username]! },
      })
    ).json();
    const carolCount = await (
      await app.request('/api/friends/requests/count', {
        headers: { origin: 'http://localhost:3000', cookie: cookie[carol.username]! },
      })
    ).json();
    expect(daveCount).toEqual({ count: 0 });
    expect(carolCount).toEqual({ count: 0 });
  });

  it('auto-accepts a crossed request', async () => {
    const first = await app.request('/api/friends/requests', {
      method: 'POST',
      headers: api(cookie[erin.username]!),
      body: JSON.stringify({ username: frank.username }),
    });
    expect(await first.json()).toEqual({ status: 'pending' });

    const second = await app.request('/api/friends/requests', {
      method: 'POST',
      headers: api(cookie[frank.username]!),
      body: JSON.stringify({ username: erin.username }),
    });
    expect(await second.json()).toEqual({ status: 'accepted' });

    const erinFriends = (await (
      await app.request('/api/friends', {
        headers: { origin: 'http://localhost:3000', cookie: cookie[erin.username]! },
      })
    ).json()) as { items: { username: string | null }[] };
    expect(erinFriends.items.some((f) => f.username === frank.username)).toBe(true);
  });

  it('blocks re-sending within the 7-day cooldown after a decline', async () => {
    await app.request('/api/friends/requests', {
      method: 'POST',
      headers: api(cookie[grace.username]!),
      body: JSON.stringify({ username: heidi.username }),
    });
    const decline = await app.request(`/api/friends/requests/${userId[grace.username]}/decline`, {
      method: 'POST',
      headers: { origin: 'http://localhost:3000', cookie: cookie[heidi.username]! },
    });
    expect(decline.status).toBe(204);

    const resend = await app.request('/api/friends/requests', {
      method: 'POST',
      headers: api(cookie[grace.username]!),
      body: JSON.stringify({ username: heidi.username }),
    });
    expect(resend.status).toBe(409);
  });

  it('rejects sending to or receiving from a blocked user with 403', async () => {
    const block = await app.request('/api/blocks', {
      method: 'POST',
      headers: api(cookie[heidi.username]!),
      body: JSON.stringify({ userId: userId[ivan.username] }),
    });
    expect(block.status).toBe(204);

    const fromBlocked = await app.request('/api/friends/requests', {
      method: 'POST',
      headers: api(cookie[ivan.username]!),
      body: JSON.stringify({ username: heidi.username }),
    });
    expect(fromBlocked.status).toBe(403);

    const toBlocker = await app.request('/api/friends/requests', {
      method: 'POST',
      headers: api(cookie[heidi.username]!),
      body: JSON.stringify({ username: ivan.username }),
    });
    expect(toBlocker.status).toBe(403);

    await app.request(`/api/blocks/${userId[ivan.username]}`, {
      method: 'DELETE',
      headers: { origin: 'http://localhost:3000', cookie: cookie[heidi.username]! },
    });
  });

  it('cancels an outgoing request and unfriends an existing friendship', async () => {
    await app.request('/api/friends/requests', {
      method: 'POST',
      headers: api(cookie[carol.username]!),
      body: JSON.stringify({ username: erin.username }),
    });
    const cancel = await app.request(`/api/friends/requests/${userId[erin.username]}`, {
      method: 'DELETE',
      headers: { origin: 'http://localhost:3000', cookie: cookie[carol.username]! },
    });
    expect(cancel.status).toBe(204);

    const unfriend = await app.request(`/api/friends/${userId[dave.username]}`, {
      method: 'DELETE',
      headers: { origin: 'http://localhost:3000', cookie: cookie[carol.username]! },
    });
    expect(unfriend.status).toBe(204);
    const notFriendsAnymore = await app.request(`/api/friends/${userId[dave.username]}`, {
      method: 'DELETE',
      headers: { origin: 'http://localhost:3000', cookie: cookie[carol.username]! },
    });
    expect(notFriendsAnymore.status).toBe(404);
  });
});

describe('friends visibility on public profile', () => {
  it('hides the list from a stranger by default and shows it to a friend', async () => {
    const asStranger = await (await app.request(`/api/users/${alice.username}/friends`)).json();
    expect(asStranger).toEqual({ hidden: true });

    const asFriend = await (
      await app.request(`/api/users/${alice.username}/friends`, {
        headers: { origin: 'http://localhost:3000', cookie: cookie[bob.username]! },
      })
    ).json();
    expect((asFriend as { items: unknown[] }).items).toBeDefined();
  });
});

describe('privacy settings', () => {
  it('rejects an invalid privacy level', async () => {
    const res = await app.request('/api/me/privacy', {
      method: 'PATCH',
      headers: api(cookie[alice.username]!),
      body: JSON.stringify({ profileVisibility: 'bogus' }),
    });
    expect(res.status).toBe(422);
  });

  it('accepts a valid partial update', async () => {
    const res = await app.request('/api/me/privacy', {
      method: 'PATCH',
      headers: api(cookie[alice.username]!),
      body: JSON.stringify({ emailOnFriendRequest: true }),
    });
    expect(res.status).toBe(204);
  });
});

describe('concurrent cross requests', () => {
  it('ends up as friends with no leftover pending rows when both send at once', async () => {
    const quinn = account('quinn');
    const rachel = account('rachel');
    cookie[quinn.username] = await signUpVerified(quinn);
    cookie[rachel.username] = await signUpVerified(rachel);

    const [a, b] = await Promise.all([
      app.request('/api/friends/requests', {
        method: 'POST',
        headers: api(cookie[quinn.username]!),
        body: JSON.stringify({ username: rachel.username }),
      }),
      app.request('/api/friends/requests', {
        method: 'POST',
        headers: api(cookie[rachel.username]!),
        body: JSON.stringify({ username: quinn.username }),
      }),
    ]);
    expect(a.status).toBeLessThan(500);
    expect(b.status).toBeLessThan(500);

    const quinnFriends = (await (
      await app.request('/api/friends', {
        headers: { origin: 'http://localhost:3000', cookie: cookie[quinn.username]! },
      })
    ).json()) as { items: { username: string | null }[] };
    expect(quinnFriends.items.some((f) => f.username === rachel.username)).toBe(true);

    const quinnOut = (await (
      await app.request('/api/friends/requests?dir=out', {
        headers: { origin: 'http://localhost:3000', cookie: cookie[quinn.username]! },
      })
    ).json()) as { items: unknown[] };
    const rachelOut = (await (
      await app.request('/api/friends/requests?dir=out', {
        headers: { origin: 'http://localhost:3000', cookie: cookie[rachel.username]! },
      })
    ).json()) as { items: unknown[] };
    expect(quinnOut.items).toHaveLength(0);
    expect(rachelOut.items).toHaveLength(0);

    await db.delete(users).where(inArray(users.email, [quinn.email, rachel.email]));
  });
});

describe('outgoing pending cap', () => {
  it('rejects a 51st outgoing pending request with 409', async () => {
    const oscar = account('oscar');
    cookie[oscar.username] = await signUpVerified(oscar);

    const targets = Array.from({ length: 51 }, (_, i) => account(`cap_target_${i}`));
    await db
      .insert(users)
      .values(
        targets.map((t) => ({
          id: randomUUID(),
          email: t.email,
          name: t.username,
          emailVerified: true,
          username: t.username,
          displayUsername: t.username,
        })),
      )
      .onConflictDoNothing();

    let last: Response | undefined;
    for (const target of targets) {
      last = await app.request('/api/friends/requests', {
        method: 'POST',
        headers: api(cookie[oscar.username]!),
        body: JSON.stringify({ username: target.username }),
      });
    }
    expect(last!.status).toBe(409);

    await db
      .delete(users)
      .where(inArray(users.email, [oscar.email, ...targets.map((t) => t.email)]));
  });
});

describe('per-user rate limit on sending requests', () => {
  it('returns 429 after the daily cap', async () => {
    const limitedApp = createApp({ auth, rateLimit: true });
    const signIn = await post(
      '/sign-in/email',
      { email: ivan.email, password },
      undefined,
      limitedApp,
    );
    const ivanCookie = signIn.headers
      .getSetCookie()
      .map((c) => c.split(';')[0])
      .join('; ');

    let last: Response | undefined;
    for (let i = 0; i < 21; i += 1) {
      last = await limitedApp.request('/api/friends/requests', {
        method: 'POST',
        headers: api(ivanCookie),
        body: JSON.stringify({ username: judy.username }),
      });
    }
    expect(last!.status).toBe(429);
  });
});
