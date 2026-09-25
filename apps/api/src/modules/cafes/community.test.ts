import { asc, count, eq, inArray } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { AppDeps } from '../../app.js';
import { createApp } from '../../app.js';
import { db, pool } from '../../db/client.js';
import {
  adminAuditLog,
  cafeGameEvents,
  cafeGames,
  cafeMembers,
  cafes,
  games,
  provinces,
  users,
  wards,
} from '../../db/schema/index.js';
import type { Role } from '@onboard/shared';
import { fakeAuth, fakeUser } from '../../test/fake-auth.js';
import type { SessionUser } from '../../types.js';

function withId(
  id: string,
  overrides: { role?: Role; emailVerified?: boolean; contributionBlockedAt?: Date | null } = {},
) {
  return { ...fakeUser('user'), ...overrides, id, email: `${id}@example.test` };
}

/** Unlike {@link fakeAuth}, re-reads `contributionBlockedAt` from the DB on every session fetch —
 * needed to see an admin's block/unblock action take effect within the same test. */
function dbBackedAuth(baseUser: SessionUser): AppDeps['auth'] {
  const session = {
    id: 's1',
    token: 't',
    userId: baseUser.id,
    expiresAt: new Date(Date.now() + 60_000),
    createdAt: new Date(),
    updatedAt: new Date(),
    ipAddress: null,
    userAgent: null,
  };
  return {
    api: {
      getSession: async () => {
        const row = await db.query.users.findFirst({ where: eq(users.id, baseUser.id) });
        const user = { ...baseUser, contributionBlockedAt: row?.contributionBlockedAt ?? null };
        return { user, session };
      },
    },
    handler: async () => new Response(null, { status: 404 }),
  } as unknown as AppDeps['auth'];
}

const maintainer = fakeUser('maintainer');
const admin = withId('u-comm-admin', { role: 'admin' });
const owner = withId('u-comm-owner');
const staff = withId('u-comm-staff');
const contributor = withId('u-comm-contributor');
const blockedUser = withId('u-comm-blocked', { contributionBlockedAt: new Date() });
const unverifiedUser = withId('u-comm-unverified', { emailVerified: false });

const maintainerApp = createApp({ auth: fakeAuth(maintainer), rateLimit: false });
const adminApp = createApp({ auth: fakeAuth(admin), rateLimit: false });
const ownerApp = createApp({ auth: fakeAuth(owner), rateLimit: false });
const staffApp = createApp({ auth: fakeAuth(staff), rateLimit: false });
const contributorApp = createApp({ auth: fakeAuth(contributor), rateLimit: false });
const blockedApp = createApp({ auth: fakeAuth(blockedUser), rateLimit: false });
const unverifiedApp = createApp({ auth: fakeAuth(unverifiedUser), rateLimit: false });
const publicApp = createApp({ auth: fakeAuth(null), rateLimit: false });
const rateLimitedContributorApp = createApp({ auth: fakeAuth(contributor), rateLimit: true });
const dbBackedContributorApp = createApp({ auth: dbBackedAuth(contributor), rateLimit: false });

const PROVINCE = { code: 'p8-t1', name: 'Tỉnh P8', slug: 'p8-tinh' };
const WARD = { code: 'p8-w1', provinceCode: PROVINCE.code, name: 'Phường P8', slug: 'p8-phuong' };

const allUsers = [maintainer, admin, owner, staff, contributor, blockedUser, unverifiedUser];
const cafeIds: string[] = [];
const gameIds: string[] = [];

beforeAll(async () => {
  for (const u of allUsers) {
    await db
      .insert(users)
      .values({ ...u, username: u.id })
      .onConflictDoNothing({ target: users.id });
  }
  await db.insert(provinces).values(PROVINCE).onConflictDoNothing();
  await db.insert(wards).values(WARD).onConflictDoNothing();
});

afterAll(async () => {
  if (cafeIds.length > 0) {
    await db.delete(cafeGameEvents).where(inArray(cafeGameEvents.cafeId, cafeIds));
    await db.delete(cafeGames).where(inArray(cafeGames.cafeId, cafeIds));
    await db.delete(cafeMembers).where(inArray(cafeMembers.cafeId, cafeIds));
    await db.delete(cafes).where(inArray(cafes.id, cafeIds));
  }
  if (gameIds.length > 0) await db.delete(games).where(inArray(games.id, gameIds));
  await db.delete(users).where(
    inArray(
      users.id,
      allUsers.map((u) => u.id),
    ),
  );
  await db.delete(wards).where(eq(wards.code, WARD.code));
  await db.delete(provinces).where(eq(provinces.code, PROVINCE.code));
  await pool.end();
});

async function createCafe(overrides: Record<string, unknown> = {}) {
  const res = await maintainerApp.request('/api/cafes', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      name: `Quán P8 ${Date.now()}-${Math.random()}`,
      provinceCode: PROVINCE.code,
      wardCode: WARD.code,
      addressLine: '1 Test St',
      consentStatus: 'granted',
      ...overrides,
    }),
  });
  const json = (await res.json()) as { id: string; slug: string };
  cafeIds.push(json.id);
  return json;
}

async function createGame(nameEn: string) {
  const [row] = await db
    .insert(games)
    .values({ slug: `p8-${nameEn.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`, nameEn })
    .returning();
  gameIds.push(row!.id);
  return row!;
}

async function seedOwnerAndStaff(cafeId: string) {
  await db.insert(cafeMembers).values([
    { cafeId, userId: owner.id, role: 'owner' },
    { cafeId, userId: staff.id, role: 'staff' },
  ]);
}

async function addCommunityGame(cafeId: string, gameId: string) {
  const res = await contributorApp.request(`/api/cafes/${cafeId}/community-games`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ gameIds: [gameId] }),
  });
  return res;
}

describe('community café scan', () => {
  it('lets a verified user add a game and shows community:true with no addedBy anywhere but admin', async () => {
    const cafe = await createCafe();
    await seedOwnerAndStaff(cafe.id);
    const game = await createGame(`Community Game ${Date.now()}`);

    const addRes = await addCommunityGame(cafe.id, game.id);
    expect(addRes.status).toBe(201);
    const addBody = (await addRes.json()) as {
      added: number;
      skipped: number;
      skippedRemoved: number;
    };
    expect(addBody).toEqual({ added: 1, skipped: 0, skippedRemoved: 0 });

    const publicRes = await publicApp.request(`/api/cafes/${cafe.slug}`);
    const publicBody = (await publicRes.json()) as { inventory: Record<string, unknown>[] };
    const publicItem = publicBody.inventory.find((i) => i.gameId === game.id)!;
    expect(publicItem.community).toBe(true);
    expect(publicItem).not.toHaveProperty('addedBy');

    const ownerRes = await ownerApp.request(`/api/cafes/${cafe.id}/manage`);
    const ownerBody = (await ownerRes.json()) as { inventory: Record<string, unknown>[] };
    const ownerItem = ownerBody.inventory.find((i) => i.gameId === game.id)!;
    expect(ownerItem.community).toBe(true);
    expect(ownerItem).not.toHaveProperty('addedBy');

    const maintainerRes = await maintainerApp.request(`/api/cafes/${cafe.id}/manage`);
    const maintainerBody = (await maintainerRes.json()) as { inventory: Record<string, unknown>[] };
    const maintainerItem = maintainerBody.inventory.find((i) => i.gameId === game.id)!;
    expect(maintainerItem.community).toBe(true);
    expect(maintainerItem).not.toHaveProperty('addedBy');

    const adminRes = await adminApp.request(`/api/cafes/${cafe.id}/manage`);
    const adminBody = (await adminRes.json()) as { inventory: Record<string, unknown>[] };
    const adminItem = adminBody.inventory.find((i) => i.gameId === game.id)!;
    expect(adminItem.community).toBe(true);
    expect(adminItem.addedBy).toBe(contributor.id);

    const events = await db.query.cafeGameEvents.findMany({
      where: eq(cafeGameEvents.gameId, game.id),
    });
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ action: 'add', source: 'community', userId: contributor.id });
  });

  it('does not overwrite an existing game and reports it as skipped', async () => {
    const cafe = await createCafe();
    const game = await createGame(`Existing Game ${Date.now()}`);

    await maintainerApp.request(`/api/cafes/${cafe.id}/games`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ gameId: game.id }),
    });

    const res = await addCommunityGame(cafe.id, game.id);
    expect(res.status).toBe(201);
    const body = (await res.json()) as { added: number; skipped: number; skippedRemoved: number };
    expect(body).toEqual({ added: 0, skipped: 1, skippedRemoved: 0 });

    const row = await db.query.cafeGames.findFirst({
      where: eq(cafeGames.gameId, game.id),
    });
    expect(row?.source).toBe('staff');
  });

  it('403s community add on a declined café and a pending café', async () => {
    const declined = await createCafe({
      consentStatus: 'declined',
      sourceUrl: 'https://example.test',
    });
    const pending = await createCafe({
      consentStatus: 'pending',
      sourceUrl: 'https://example.test',
    });
    const game = await createGame(`Hidden Cafe Game ${Date.now()}`);

    expect((await addCommunityGame(declined.id, game.id)).status).toBe(403);
    expect((await addCommunityGame(pending.id, game.id)).status).toBe(403);
  });

  it('403s a contribution-blocked user', async () => {
    const cafe = await createCafe();
    const game = await createGame(`Blocked User Game ${Date.now()}`);

    const res = await blockedApp.request(`/api/cafes/${cafe.id}/community-games`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ gameIds: [game.id] }),
    });
    expect(res.status).toBe(403);
  });

  it('403s an unverified user', async () => {
    const cafe = await createCafe();
    const game = await createGame(`Unverified User Game ${Date.now()}`);

    const res = await unverifiedApp.request(`/api/cafes/${cafe.id}/community-games`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ gameIds: [game.id] }),
    });
    expect(res.status).toBe(403);
  });

  it('rejects more than 20 game ids with 422', async () => {
    const cafe = await createCafe();
    const tooMany = Array.from({ length: 21 }, () => crypto.randomUUID());

    const res = await contributorApp.request(`/api/cafes/${cafe.id}/community-games`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ gameIds: tooMany }),
    });
    expect(res.status).toBe(422);
  });

  it('409s re-adding a game the owner removed; confirm 404s since it is no longer in inventory; owner can re-add it manually', async () => {
    const cafe = await createCafe();
    await seedOwnerAndStaff(cafe.id);
    const game = await createGame(`Removed Game ${Date.now()}`);

    expect((await addCommunityGame(cafe.id, game.id)).status).toBe(201);

    const removeRes = await ownerApp.request(`/api/cafes/${cafe.id}/games/${game.id}`, {
      method: 'DELETE',
      headers: { 'content-type': 'application/json' },
    });
    expect(removeRes.status).toBe(200);

    const blockedRetry = await addCommunityGame(cafe.id, game.id);
    expect(blockedRetry.status).toBe(409);

    const confirmRes = await ownerApp.request(`/api/cafes/${cafe.id}/games/${game.id}/confirm`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
    });
    // Game isn't in inventory anymore (it was removed) so confirm 404s; owner must re-add manually.
    expect(confirmRes.status).toBe(404);

    const eventsBeforeReAdd = await db.query.cafeGameEvents.findMany({
      where: eq(cafeGameEvents.gameId, game.id),
      orderBy: [asc(cafeGameEvents.createdAt), asc(cafeGameEvents.id)],
    });
    // The failed confirm (404) wrote nothing.
    expect(eventsBeforeReAdd.map((e) => e.action)).toEqual(['add', 'remove']);

    const reAddByOwner = await ownerApp.request(`/api/cafes/${cafe.id}/games`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ gameId: game.id }),
    });
    expect(reAddByOwner.status).toBe(201);

    const events = await db.query.cafeGameEvents.findMany({
      where: eq(cafeGameEvents.gameId, game.id),
      orderBy: [asc(cafeGameEvents.createdAt), asc(cafeGameEvents.id)],
    });
    expect(events.map((e) => e.action)).toEqual(['add', 'remove', 'add']);
    expect(events[1]).toMatchObject({ source: 'owner' });
  });

  it('confirm sets source to owner for a café owner and staff for café staff', async () => {
    const cafe = await createCafe();
    await seedOwnerAndStaff(cafe.id);
    const gameForOwner = await createGame(`Confirm Owner Game ${Date.now()}`);
    const gameForStaff = await createGame(`Confirm Staff Game ${Date.now()}`);

    expect((await addCommunityGame(cafe.id, gameForOwner.id)).status).toBe(201);
    expect((await addCommunityGame(cafe.id, gameForStaff.id)).status).toBe(201);

    const ownerConfirm = await ownerApp.request(
      `/api/cafes/${cafe.id}/games/${gameForOwner.id}/confirm`,
      { method: 'POST', headers: { 'content-type': 'application/json' } },
    );
    expect(ownerConfirm.status).toBe(200);
    const ownerRow = await db.query.cafeGames.findFirst({
      where: eq(cafeGames.gameId, gameForOwner.id),
    });
    expect(ownerRow?.source).toBe('owner');

    const staffConfirm = await staffApp.request(
      `/api/cafes/${cafe.id}/games/${gameForStaff.id}/confirm`,
      { method: 'POST', headers: { 'content-type': 'application/json' } },
    );
    expect(staffConfirm.status).toBe(200);
    const staffRow = await db.query.cafeGames.findFirst({
      where: eq(cafeGames.gameId, gameForStaff.id),
    });
    expect(staffRow?.source).toBe('staff');

    const confirmEvents = await db.query.cafeGameEvents.findMany({
      where: inArray(cafeGameEvents.gameId, [gameForOwner.id, gameForStaff.id]),
    });
    expect(confirmEvents.filter((e) => e.action === 'confirm')).toHaveLength(2);
  });

  it('confirming an already owner/staff-sourced game is a no-op: no event, no source change', async () => {
    const cafe = await createCafe();
    await seedOwnerAndStaff(cafe.id);
    const game = await createGame(`Already Owner Game ${Date.now()}`);

    const addRes = await ownerApp.request(`/api/cafes/${cafe.id}/games`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ gameId: game.id }),
    });
    expect(addRes.status).toBe(201);

    const confirmRes = await ownerApp.request(`/api/cafes/${cafe.id}/games/${game.id}/confirm`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
    });
    expect(confirmRes.status).toBe(200);

    const row = await db.query.cafeGames.findFirst({ where: eq(cafeGames.gameId, game.id) });
    expect(row?.source).toBe('owner');

    const events = await db.query.cafeGameEvents.findMany({
      where: eq(cafeGameEvents.gameId, game.id),
    });
    expect(events.map((e) => e.action)).toEqual(['add']);
  });

  it('rate limits community adds after 30 requests per hour', async () => {
    const cafe = await createCafe();
    const requests = Array.from({ length: 31 }, () =>
      createGame(`Rate Limit Game ${Math.random()}`),
    );
    const created = await Promise.all(requests);

    const statuses: number[] = [];
    for (const game of created) {
      const res = await rateLimitedContributorApp.request(`/api/cafes/${cafe.id}/community-games`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ gameIds: [game.id] }),
      });
      statuses.push(res.status);
    }
    expect(statuses).toEqual([...Array<number>(30).fill(201), 429]);
  });

  it('admin can list contributions, block a user, bulk-remove their community games, and unblock', async () => {
    const cafe = await createCafe();
    const game = await createGame(`Admin Managed Game ${Date.now()}`);
    expect((await addCommunityGame(cafe.id, game.id)).status).toBe(201);

    const listRes = await adminApp.request(
      `/api/admin/contributions?userId=${contributor.id}&cafeId=${cafe.id}`,
    );
    expect(listRes.status).toBe(200);
    const listBody = (await listRes.json()) as { items: { gameId: string }[]; total: number };
    expect(listBody.items.some((i) => i.gameId === game.id)).toBe(true);

    const nonAdminList = await ownerApp.request('/api/admin/contributions');
    expect(nonAdminList.status).toBe(403);

    const blockRes = await adminApp.request(
      `/api/admin/users/${contributor.id}/contribution-block`,
      { method: 'POST', headers: { 'content-type': 'application/json' } },
    );
    expect(blockRes.status).toBe(204);

    const blockedNow = await db.query.users.findFirst({ where: eq(users.id, contributor.id) });
    expect(blockedNow?.contributionBlockedAt).not.toBeNull();

    const blockedGame = await createGame(`Blocked Now ${Date.now()}`);
    const blockedAddRes = await dbBackedContributorApp.request(
      `/api/cafes/${cafe.id}/community-games`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ gameIds: [blockedGame.id] }),
      },
    );
    expect(blockedAddRes.status).toBe(403);

    const removeRes = await adminApp.request(`/api/admin/users/${contributor.id}/community-games`, {
      method: 'DELETE',
      headers: { 'content-type': 'application/json' },
    });
    expect(removeRes.status).toBe(200);
    const removeBody = (await removeRes.json()) as { removed: number };
    expect(removeBody.removed).toBeGreaterThanOrEqual(1);

    const remainingRow = await db.query.cafeGames.findFirst({
      where: eq(cafeGames.gameId, game.id),
    });
    expect(remainingRow).toBeUndefined();

    const unblockRes = await adminApp.request(
      `/api/admin/users/${contributor.id}/contribution-block`,
      { method: 'DELETE', headers: { 'content-type': 'application/json' } },
    );
    expect(unblockRes.status).toBe(204);
    const unblockedNow = await db.query.users.findFirst({ where: eq(users.id, contributor.id) });
    expect(unblockedNow?.contributionBlockedAt).toBeNull();

    const unblockedAddRes = await dbBackedContributorApp.request(
      `/api/cafes/${cafe.id}/community-games`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ gameIds: [blockedGame.id] }),
      },
    );
    expect(unblockedAddRes.status).toBe(201);
  });

  it('404s block/unblock for a nonexistent user and writes no audit row', async () => {
    const bogusUserId = 'u-comm-does-not-exist';
    const auditCountBefore = (
      await db
        .select({ total: count() })
        .from(adminAuditLog)
        .where(eq(adminAuditLog.targetId, bogusUserId))
    )[0]?.total;

    const blockRes = await adminApp.request(`/api/admin/users/${bogusUserId}/contribution-block`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
    });
    expect(blockRes.status).toBe(404);

    const unblockRes = await adminApp.request(
      `/api/admin/users/${bogusUserId}/contribution-block`,
      {
        method: 'DELETE',
        headers: { 'content-type': 'application/json' },
      },
    );
    expect(unblockRes.status).toBe(404);

    const auditCountAfter = (
      await db
        .select({ total: count() })
        .from(adminAuditLog)
        .where(eq(adminAuditLog.targetId, bogusUserId))
    )[0]?.total;
    expect(auditCountAfter).toBe(auditCountBefore ?? 0);
  });
});
