import { eq, inArray } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../../app.js';
import { db, pool } from '../../db/client.js';
import { cafeGames, cafes, games, provinces, users, wards } from '../../db/schema/index.js';
import { fakeAuth, fakeUser } from '../../test/fake-auth.js';

const maintainer = fakeUser('maintainer');
const maintainerApp = createApp({ auth: fakeAuth(maintainer), rateLimit: false });
const userApp = createApp({ auth: fakeAuth(fakeUser('user')), rateLimit: false });
const publicApp = createApp({ auth: fakeAuth(null), rateLimit: false });

const PROVINCE_A = { code: 'p4-t1', name: 'Tỉnh Test A', slug: 'p4-tinh-test-a' };
const PROVINCE_B = { code: 'p4-t2', name: 'Tỉnh Test B', slug: 'p4-tinh-test-b' };
const WARD_A1 = {
  code: 'p4-w1',
  provinceCode: PROVINCE_A.code,
  name: 'Phường Một',
  slug: 'p4-phuong-mot',
};
const WARD_A2 = {
  code: 'p4-w2',
  provinceCode: PROVINCE_A.code,
  name: 'Phường Hai',
  slug: 'p4-phuong-hai',
};
const WARD_B1 = {
  code: 'p4-w3',
  provinceCode: PROVINCE_B.code,
  name: 'Phường Ba',
  slug: 'p4-phuong-ba',
};

const createdCafeIds: string[] = [];
const createdGameIds: string[] = [];

beforeAll(async () => {
  await db
    .insert(users)
    .values({ ...maintainer, role: 'maintainer' })
    .onConflictDoNothing({ target: users.id });
  await db.insert(provinces).values([PROVINCE_A, PROVINCE_B]).onConflictDoNothing();
  await db.insert(wards).values([WARD_A1, WARD_A2, WARD_B1]).onConflictDoNothing();
});

afterAll(async () => {
  if (createdCafeIds.length > 0) {
    await db.delete(cafeGames).where(inArray(cafeGames.cafeId, createdCafeIds));
    await db.delete(cafes).where(inArray(cafes.id, createdCafeIds));
  }
  if (createdGameIds.length > 0) {
    await db.delete(games).where(inArray(games.id, createdGameIds));
  }
  await db.delete(wards).where(inArray(wards.code, [WARD_A1.code, WARD_A2.code, WARD_B1.code]));
  await db.delete(provinces).where(inArray(provinces.code, [PROVINCE_A.code, PROVINCE_B.code]));
  await db.delete(users).where(eq(users.id, maintainer.id));
  await pool.end();
});

interface CreatedCafe {
  id: string;
  slug: string;
  consentStatus: string;
}

async function createCafe(body: Record<string, unknown>) {
  const res = await maintainerApp.request('/api/cafes', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = (await res.json()) as CreatedCafe;
  if (res.status === 201) createdCafeIds.push(json.id);
  return { res, json };
}

async function createGame(nameEn: string) {
  const res = await maintainerApp.request('/api/games', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ nameEn, acceptLicense: true }),
  });
  const json = (await res.json()) as { id: string; slug: string };
  createdGameIds.push(json.id);
  return json;
}

function baseCafeBody(overrides: Record<string, unknown> = {}) {
  return {
    name: `Quán Test ${Date.now()}-${Math.random()}`,
    provinceCode: PROVINCE_A.code,
    wardCode: WARD_A1.code,
    addressLine: '123 Đường Test',
    consentStatus: 'granted',
    ...overrides,
  };
}

describe('cafes directory', () => {
  it('filters cafes by province and ward correctly', async () => {
    const { res: res1 } = await createCafe(baseCafeBody({ wardCode: WARD_A1.code }));
    expect(res1.status).toBe(201);
    const { res: res2 } = await createCafe(baseCafeBody({ wardCode: WARD_A2.code }));
    expect(res2.status).toBe(201);

    const listRes = await publicApp.request(
      `/api/cafes?province=${PROVINCE_A.slug}&ward=${WARD_A1.slug}`,
    );
    expect(listRes.status).toBe(200);
    const body = (await listRes.json()) as { items: { wardCode: string }[] };
    expect(body.items.length).toBeGreaterThan(0);
    expect(body.items.every((c) => c.wardCode === WARD_A1.code)).toBe(true);
  });

  it('rejects a cafe missing consentStatus (422)', async () => {
    const body = baseCafeBody();
    delete (body as Record<string, unknown>).consentStatus;
    const res = await maintainerApp.request('/api/cafes', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    expect(res.status).toBe(422);
  });

  it('rejects a ward that does not belong to the given province (422)', async () => {
    const { res } = await createCafe(
      baseCafeBody({ provinceCode: PROVINCE_A.code, wardCode: WARD_B1.code }),
    );
    expect(res.status).toBe(422);
  });

  it('requires sourceUrl when consentStatus is not granted (422)', async () => {
    const { res } = await createCafe(baseCafeBody({ consentStatus: 'pending' }));
    expect(res.status).toBe(422);
  });

  it('hides consentNote from the public response', async () => {
    const { json: cafe } = await createCafe(
      baseCafeBody({
        consentStatus: 'public_info_only',
        sourceUrl: 'https://example.test',
        consentNote: 'bí mật nội bộ',
      }),
    );
    const res = await publicApp.request(`/api/cafes/${cafe.slug}`);
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).not.toContain('bí mật nội bộ');
    expect(text).not.toContain('consentNote');
  });

  it('hides a pending cafe from the public list and detail routes, but staff still see it', async () => {
    const { json: cafe } = await createCafe(
      baseCafeBody({ consentStatus: 'pending', sourceUrl: 'https://example.test' }),
    );

    const detailRes = await publicApp.request(`/api/cafes/${cafe.slug}`);
    expect(detailRes.status).toBe(404);

    const listRes = await publicApp.request(`/api/cafes?province=${PROVINCE_A.slug}`);
    const listBody = (await listRes.json()) as { items: { id: string }[] };
    expect(listBody.items.some((c) => c.id === cafe.id)).toBe(false);

    const manageListRes = await maintainerApp.request('/api/cafes/manage?pageSize=50');
    expect(manageListRes.status).toBe(200);
    const manageBody = (await manageListRes.json()) as { items: { id: string }[] };
    expect(manageBody.items.some((c) => c.id === cafe.id)).toBe(true);

    const manageRes = await maintainerApp.request(`/api/cafes/${cafe.id}/manage`);
    expect(manageRes.status).toBe(200);
  });

  it('hides a pending cafe from a game`s public "where to play" list', async () => {
    const { json: cafe } = await createCafe(
      baseCafeBody({ consentStatus: 'pending', sourceUrl: 'https://example.test' }),
    );
    const game = await createGame(`Pending Cafe Game ${Date.now()}`);
    await maintainerApp.request(`/api/cafes/${cafe.id}/games`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ gameId: game.id }),
    });

    const res = await publicApp.request(`/api/games/${game.slug}/cafes`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { id: string }[];
    expect(body.some((c) => c.id === cafe.id)).toBe(false);
  });

  it('rejects a duplicate game added to the same cafe inventory (409)', async () => {
    const { json: cafe } = await createCafe(baseCafeBody());
    const game = await createGame(`Dup Test ${Date.now()}`);

    const first = await maintainerApp.request(`/api/cafes/${cafe.id}/games`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ gameId: game.id }),
    });
    expect(first.status).toBe(201);

    const second = await maintainerApp.request(`/api/cafes/${cafe.id}/games`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ gameId: game.id }),
    });
    expect(second.status).toBe(409);
  });

  it('bulk add skips games already in inventory', async () => {
    const { json: cafe } = await createCafe(baseCafeBody());
    const gameA = await createGame(`Bulk A ${Date.now()}`);
    const gameB = await createGame(`Bulk B ${Date.now()}`);

    await maintainerApp.request(`/api/cafes/${cafe.id}/games`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ gameId: gameA.id }),
    });

    const bulkRes = await maintainerApp.request(`/api/cafes/${cafe.id}/games/bulk`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ gameIds: [gameA.id, gameB.id] }),
    });
    expect(bulkRes.status).toBe(200);
    const body = (await bulkRes.json()) as { added: number; skipped: number };
    expect(body).toEqual({ added: 1, skipped: 1 });
  });

  it('forbids a regular user from creating a cafe', async () => {
    const res = await userApp.request('/api/cafes', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(baseCafeBody()),
    });
    expect(res.status).toBe(403);
  });
});
