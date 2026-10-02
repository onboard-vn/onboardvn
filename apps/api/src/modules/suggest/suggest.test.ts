import { eq, inArray } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../../app.js';
import { db } from '../../db/client.js';
import {
  cafeGames,
  cafes,
  clubMembers,
  clubs,
  friendships,
  games,
  userBlocks,
  provinces,
  userGames,
  userWishlist,
  users,
  wards,
} from '../../db/schema/index.js';
import { fakeAuth, fakeUser } from '../../test/fake-auth.js';
import { rarityOf } from './service.js';

const stamp = Date.now();
const user = {
  ...fakeUser('user'),
  id: `u-suggest-${stamp}`,
  email: `suggest-${stamp}@example.test`,
};
const app = createApp({ auth: fakeAuth(user), rateLimit: false });
const anon = createApp({ auth: fakeAuth(null), rateLimit: false });
const provinceCode = `sg-p-${stamp}`;
const otherProvince = `sg-q-${stamp}`;

const mk = (tag: string, extra: Partial<typeof users.$inferInsert> = {}) => ({
  ...fakeUser('user'),
  id: `u-sg-${tag}-${stamp}`,
  email: `sg-${tag}-${stamp}@example.test`,
  username: `sg_${tag}_${stamp}`,
  name: `Name ${tag}`,
  ...extra,
});
const mate = mk('mate');
const mateOff = mk('mateoff', { clubShelfSuggest: false });
const outsider = mk('outsider');
const friend = mk('friend', { profileVisibility: 'friends' });
const friendPrivate = mk('friendpriv', { profileVisibility: 'private' });
const stranger = mk('stranger');
const blockedFriend = mk('blockedfriend');
const cityPublic = mk('citypub', { provinceCode });
const cityFriendsOnly = mk('cityfriends', { provinceCode, profileVisibility: 'friends' });
const cityOther = mk('cityother', { provinceCode: otherProvince });
const socialUsers = [
  mate,
  mateOff,
  outsider,
  friend,
  friendPrivate,
  stranger,
  blockedFriend,
  cityPublic,
  cityFriendsOnly,
  cityOther,
];
let clubId = '';

interface Item {
  game: { id: string; slug: string };
  rarity: string;
  cafeCount: number;
  owners?: { name: string; username: string | null }[];
  ownerCount?: number;
}
interface Pool {
  items: Item[];
  total: number;
}

let gameIds: Record<string, string> = {};
let cafeIds: string[] = [];
let pendingCafeId = '';

async function pool(application: typeof app, qs: string): Promise<{ status: number; body: Pool }> {
  const res = await application.request(`/api/suggest?${qs}`);
  return { status: res.status, body: (await res.json()) as Pool };
}
const slugs = (p: Pool) => p.items.map((i) => i.game.slug.replace(`sg-${stamp}-`, '')).sort();
const prov = `source=province&provinceCode=${provinceCode}`;

beforeAll(async () => {
  await db.insert(users).values(user);
  await db.insert(provinces).values([
    { code: provinceCode, name: 'SG', slug: `sg-${stamp}` },
    { code: otherProvince, name: 'SG2', slug: `sg2-${stamp}` },
  ]);
  await db.insert(users).values(socialUsers);
  await db.insert(wards).values({ code: `sg-w-${stamp}`, provinceCode, name: 'W', slug: 'w' });
  const insertedCafes = await db
    .insert(cafes)
    .values(
      Array.from({ length: 11 }, (_, i) => ({
        slug: `sg-cafe-${stamp}-${i}`,
        name: `SG Cafe ${i}`,
        provinceCode,
        wardCode: `sg-w-${stamp}`,
        addressLine: 'x',
        consentStatus: (i === 10 ? 'pending' : 'granted') as 'pending' | 'granted',
      })),
    )
    .returning({ id: cafes.id });
  cafeIds = insertedCafes.map((c) => c.id);
  pendingCafeId = cafeIds[10]!;

  const defs: Record<string, Partial<typeof games.$inferInsert> & { cafes: number }> = {
    common: { cafes: 10, minPlayers: 2, maxPlayers: 4, playMinutes: 30, weight: '1.50' },
    heavyBumped: { cafes: 10, minPlayers: 1, maxPlayers: 4, playMinutes: 120, weight: '3.50' },
    rare: { cafes: 5, minPlayers: 2, maxPlayers: 8, playMinutes: 20, weight: '1.20' },
    epic: { cafes: 2, minPlayers: 3, maxPlayers: 5, playMinutes: 60, weight: '2.80' },
    legendary: { cafes: 1, minPlayers: 2, maxPlayers: 2, playMinutes: 45, weight: '2.00' },
    noData: { cafes: 1 },
    pendingOnly: { cafes: 0, minPlayers: 2, maxPlayers: 4 },
    ancient: { cafes: 0, minPlayers: 2, maxPlayers: 4, weight: '2.00' },
  };
  const rows = await db
    .insert(games)
    .values(
      Object.entries(defs).map(([key, { cafes: _c, ...rest }]) => ({
        slug: `sg-${stamp}-${key}`,
        nameEn: `SG ${key} ${stamp}`,
        ...rest,
      })),
    )
    .returning({ id: games.id, slug: games.slug });
  gameIds = Object.fromEntries(rows.map((r) => [r.slug.replace(`sg-${stamp}-`, ''), r.id]));

  const links = Object.entries(defs).flatMap(([key, d]) =>
    cafeIds.slice(0, d.cafes).map((cafeId) => ({ cafeId, gameId: gameIds[key]! })),
  );
  links.push({ cafeId: pendingCafeId, gameId: gameIds.pendingOnly! });
  await db.insert(cafeGames).values(links);
  await db.insert(userGames).values([
    { userId: user.id, gameId: gameIds.ancient! },
    { userId: user.id, gameId: gameIds.common! },
  ]);
  await db.insert(userWishlist).values({ userId: user.id, gameId: gameIds.epic! });

  const [club] = await db
    .insert(clubs)
    .values({ slug: `sg-club-${stamp}`, name: 'SG Club', inviteCodeHash: `sg-hash-${stamp}` })
    .returning({ id: clubs.id });
  clubId = club!.id;
  await db
    .insert(clubMembers)
    .values([user, mate, mateOff, blockedFriend].map((u) => ({ clubId, userId: u.id })));
  const own = (u: { id: string }, keys: string[]) =>
    keys.map((k) => ({ userId: u.id, gameId: gameIds[k]! }));
  await db
    .insert(userGames)
    .values([
      ...own(mate, ['rare', 'common']),
      ...own(mateOff, ['epic']),
      ...own(outsider, ['legendary']),
      ...own(friend, ['epic', 'rare']),
      ...own(friendPrivate, ['noData']),
      ...own(stranger, ['legendary']),
      ...own(blockedFriend, ['pendingOnly']),
      ...own(cityPublic, ['ancient', 'rare']),
      ...own(cityFriendsOnly, ['pendingOnly']),
      ...own(cityOther, ['heavyBumped']),
    ]);
  const pair = (a: { id: string }, b: { id: string }) =>
    a.id < b.id ? { userA: a.id, userB: b.id } : { userA: b.id, userB: a.id };
  await db
    .insert(friendships)
    .values([friend, friendPrivate, blockedFriend, cityFriendsOnly].map((f) => pair(user, f)));
  await db.insert(userBlocks).values({ blockerId: blockedFriend.id, blockedId: user.id });
});

afterAll(async () => {
  await db.delete(clubs).where(eq(clubs.id, clubId));
  await db.delete(users).where(inArray(users.id, [user.id, ...socialUsers.map((u) => u.id)]));
  await db.delete(provinces).where(eq(provinces.code, otherProvince));
  await db.delete(games).where(inArray(games.id, Object.values(gameIds)));
  await db.delete(cafes).where(eq(cafes.provinceCode, provinceCode));
  await db.delete(wards).where(eq(wards.provinceCode, provinceCode));
  await db.delete(provinces).where(eq(provinces.code, provinceCode));
});

describe('rarityOf', () => {
  it('maps scarcity to tiers and bumps heavy games once, capped at ancient', () => {
    expect(rarityOf(12, null)).toBe('common');
    expect(rarityOf(5, 2)).toBe('rare');
    expect(rarityOf(3, 2.9)).toBe('epic');
    expect(rarityOf(1, null)).toBe('legendary');
    expect(rarityOf(0, 1)).toBe('ancient');
    expect(rarityOf(10, 3)).toBe('rare');
    expect(rarityOf(0, 4)).toBe('ancient');
  });
});

describe('GET /api/suggest', () => {
  it('province source uses public inventories only, with rarity per tier', async () => {
    const { status, body } = await pool(anon, prov);
    expect(status).toBe(200);
    expect(body.total).toBe(6);
    expect(slugs(body)).toEqual(['common', 'epic', 'heavyBumped', 'legendary', 'noData', 'rare']);
    const rarity = Object.fromEntries(
      body.items.map((i) => [i.game.slug.split('-').pop(), i.rarity]),
    );
    expect(rarity).toMatchObject({
      common: 'common',
      heavyBumped: 'rare',
      rare: 'rare',
      epic: 'epic',
      legendary: 'legendary',
    });
  });

  it('422 when province or cafe is missing', async () => {
    expect((await pool(anon, 'source=province')).status).toBe(422);
    expect((await pool(anon, 'source=cafe')).status).toBe(422);
  });

  it('cafe source returns that cafe inventory; hidden cafe is 404', async () => {
    const one = await pool(anon, `source=cafe&cafeId=${cafeIds[0]}`);
    expect(one.status).toBe(200);
    expect(slugs(one.body)).toEqual([
      'common',
      'epic',
      'heavyBumped',
      'legendary',
      'noData',
      'rare',
    ]);
    const hidden = await pool(anon, `source=cafe&cafeId=${pendingCafeId}`);
    expect(hidden.status).toBe(404);
  });

  it('shelf and wishlist need login and use the user lists', async () => {
    expect((await pool(anon, 'source=shelf')).status).toBe(401);
    expect((await pool(anon, 'source=wishlist')).status).toBe(401);
    expect(slugs((await pool(app, 'source=shelf')).body)).toEqual(['ancient', 'common']);
    expect(slugs((await pool(app, 'source=wishlist')).body)).toEqual(['epic']);
  });

  it('shelf rarity is computed within the chosen province', async () => {
    const { body } = await pool(app, `source=shelf&provinceCode=${provinceCode}`);
    const ancient = body.items.find((i) => i.game.slug.endsWith('-ancient'));
    expect(ancient).toMatchObject({ rarity: 'ancient', cafeCount: 0 });
  });

  it('all source returns a capped pool', async () => {
    const { status, body } = await pool(anon, 'source=all');
    expect(status).toBe(200);
    expect(body.items.length).toBeLessThanOrEqual(150);
    expect(body.total).toBeGreaterThanOrEqual(8);
  });

  it('filters by players, maxMinutes and weight (nulls excluded)', async () => {
    expect(slugs((await pool(anon, `${prov}&players=5`)).body)).toEqual(['epic', 'rare']);
    expect(slugs((await pool(anon, `${prov}&maxMinutes=30`)).body)).toEqual(['common', 'rare']);
    expect(slugs((await pool(anon, `${prov}&weight=light`)).body)).toEqual([
      'common',
      'legendary',
      'rare',
    ]);
    expect(slugs((await pool(anon, `${prov}&weight=medium`)).body)).toEqual(['epic']);
    expect(slugs((await pool(anon, `${prov}&weight=heavy`)).body)).toEqual(['heavyBumped']);
  });

  it('presets', async () => {
    expect(slugs((await pool(anon, `${prov}&preset=solo`)).body)).toEqual(['heavyBumped']);
    expect(slugs((await pool(anon, `${prov}&preset=best2`)).body)).toEqual([
      'common',
      'heavyBumped',
      'legendary',
      'rare',
    ]);
    expect(slugs((await pool(anon, `${prov}&preset=best3`)).body)).toEqual([
      'common',
      'epic',
      'heavyBumped',
      'rare',
    ]);
    expect(slugs((await pool(anon, `${prov}&preset=party`)).body)).toEqual(['rare']);
    expect(slugs((await pool(anon, `${prov}&preset=heavy`)).body)).toEqual(['heavyBumped']);
    expect(slugs((await pool(anon, `${prov}&preset=rare`)).body)).toEqual([
      'epic',
      'legendary',
      'noData',
    ]);
  });

  it('club source: unblocked members with the toggle on plus own shelf; owners exclude the caller', async () => {
    const { status, body } = await pool(app, `source=club&clubId=${clubId}`);
    expect(status).toBe(200);
    expect(slugs(body)).toEqual(['ancient', 'common', 'rare']);
    const common = body.items.find((i) => i.game.slug.endsWith('-common'))!;
    expect(common.ownerCount).toBe(1);
    expect(common.owners).toEqual([{ name: 'Name mate', username: mate.username }]);
    for (const i of body.items) {
      expect(i.owners!.some((o) => o.name === user.name)).toBe(false);
    }
    const ancient = body.items.find((i) => i.game.slug.endsWith('-ancient'))!;
    expect(ancient).toMatchObject({ ownerCount: 0, owners: [] });
  });

  it('club source: 401 anonymous, 422 without clubId, 403 for non-members', async () => {
    expect((await pool(anon, `source=club&clubId=${clubId}`)).status).toBe(401);
    expect((await pool(app, 'source=club')).status).toBe(422);
    const out = createApp({ auth: fakeAuth(outsider), rateLimit: false });
    expect((await pool(out, `source=club&clubId=${clubId}`)).status).toBe(403);
  });

  it('friends source: friends with public/friends profile only, never private or blocked', async () => {
    expect((await pool(anon, 'source=friends')).status).toBe(401);
    const { status, body } = await pool(app, 'source=friends');
    expect(status).toBe(200);
    expect(slugs(body)).toEqual(['ancient', 'common', 'epic', 'pendingOnly', 'rare']);
    const rare = body.items.find((i) => i.game.slug.endsWith('-rare'))!;
    expect(rare.owners).toEqual([{ name: 'Name friend', username: friend.username }]);
  });

  it('city source: needs provinceCode; cafés plus public shelves in that province', async () => {
    expect((await pool(anon, 'source=city')).status).toBe(422);
    const { status, body } = await pool(anon, `source=city&provinceCode=${provinceCode}`);
    expect(status).toBe(200);
    expect(slugs(body)).toEqual([
      'ancient',
      'common',
      'epic',
      'heavyBumped',
      'legendary',
      'noData',
      'rare',
    ]);
    const rare = body.items.find((i) => i.game.slug.endsWith('-rare'))!;
    expect(rare).toMatchObject({ cafeCount: 5, ownerCount: 1 });
    expect(rare.owners).toEqual([{ name: 'Name citypub', username: cityPublic.username }]);
    const ancient = body.items.find((i) => i.game.slug.endsWith('-ancient'))!;
    expect(ancient).toMatchObject({ rarity: 'ancient', cafeCount: 0 });
    expect(body.items.some((i) => i.game.slug.endsWith('-pendingOnly'))).toBe(false);
  });

  it('city source with no cafés and only other-province owners is empty of foreign shelves', async () => {
    const { body } = await pool(anon, `source=city&provinceCode=${otherProvince}`);
    expect(slugs(body)).toEqual(['heavyBumped']);
    expect(body.items[0]!.owners).toEqual([
      { name: 'Name cityother', username: cityOther.username },
    ]);
  });

  it('non-social sources omit owners', async () => {
    const { body } = await pool(app, 'source=shelf');
    expect(body.items.every((i) => i.owners === undefined && i.ownerCount === undefined)).toBe(
      true,
    );
  });

  it('rejects invalid query', async () => {
    expect((await pool(anon, 'preset=nope')).status).toBe(422);
  });
});
