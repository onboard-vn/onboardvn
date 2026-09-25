import { eq, inArray } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../../app.js';
import { db, pool } from '../../db/client.js';
import {
  cafeGames,
  cafeMembers,
  cafes,
  games,
  provinces,
  users,
  wards,
} from '../../db/schema/index.js';
import { fakeAuth, fakeUser } from '../../test/fake-auth.js';

const maintainer = fakeUser('maintainer');
const maintainerApp = createApp({ auth: fakeAuth(maintainer), rateLimit: false });
const publicApp = createApp({ auth: fakeAuth(null), rateLimit: false });

const PROVINCE = { code: 'p9-t1', name: 'Tỉnh Map Test', slug: 'p9-tinh-map-test' };
const WARD = {
  code: 'p9-w1',
  provinceCode: PROVINCE.code,
  name: 'Phường Map',
  slug: 'p9-phuong-map',
};

// Hà Nội-ish coordinates, inside the VN bounding box.
const HANOI_LAT = 21.0285;
const HANOI_LNG = 105.8542;

const createdCafeIds: string[] = [];
const createdGameIds: string[] = [];

beforeAll(async () => {
  await db
    .insert(users)
    .values({ ...maintainer, role: 'maintainer' })
    .onConflictDoNothing({ target: users.id });
  await db.insert(provinces).values(PROVINCE).onConflictDoNothing();
  await db.insert(wards).values(WARD).onConflictDoNothing();
});

afterAll(async () => {
  if (createdCafeIds.length > 0) {
    await db.delete(cafeMembers).where(inArray(cafeMembers.cafeId, createdCafeIds));
    await db.delete(cafeGames).where(inArray(cafeGames.cafeId, createdCafeIds));
    await db.delete(cafes).where(inArray(cafes.id, createdCafeIds));
  }
  if (createdGameIds.length > 0) {
    await db.delete(games).where(inArray(games.id, createdGameIds));
  }
  await db.delete(wards).where(eq(wards.code, WARD.code));
  await db.delete(provinces).where(eq(provinces.code, PROVINCE.code));
  await db.delete(users).where(eq(users.id, maintainer.id));
  await pool.end();
});

function baseCafeBody(overrides: Record<string, unknown> = {}) {
  return {
    name: `Quán Map Test ${Date.now()}-${Math.random()}`,
    provinceCode: PROVINCE.code,
    wardCode: WARD.code,
    addressLine: '1 Đường Map',
    consentStatus: 'granted',
    lat: HANOI_LAT,
    lng: HANOI_LNG,
    ...overrides,
  };
}

async function createCafe(body: Record<string, unknown>) {
  const res = await maintainerApp.request('/api/cafes', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = (await res.json()) as { id: string; slug: string };
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

async function pins(query: string) {
  const res = await publicApp.request(`/api/cafes/map?${query}`);
  const body = (await res.json()) as { slug: string; verified: boolean; openStatus?: unknown }[];
  return { res, body };
}

describe('GET /cafes/map', () => {
  it('rejects cafés without coordinates, declined, and pending', async () => {
    const { json: noCoords } = await createCafe({
      ...baseCafeBody(),
      lat: undefined,
      lng: undefined,
    });
    const { json: declined } = await createCafe(
      baseCafeBody({ consentStatus: 'declined', sourceUrl: 'https://example.test' }),
    );
    const { json: pending } = await createCafe(
      baseCafeBody({ consentStatus: 'pending', sourceUrl: 'https://example.test' }),
    );

    const { body } = await pins(`province=${PROVINCE.slug}`);
    const slugs = body.map((p) => p.slug);
    expect(slugs).not.toContain(noCoords.slug);
    expect(slugs).not.toContain(declined.slug);
    expect(slugs).not.toContain(pending.slug);
  });

  it('includes a public_info_only café with coordinates, but without openStatus', async () => {
    const { json: cafe } = await createCafe(
      baseCafeBody({ consentStatus: 'public_info_only', sourceUrl: 'https://example.test' }),
    );

    const { body } = await pins(`province=${PROVINCE.slug}`);
    const item = body.find((p) => p.slug === cafe.slug);
    expect(item).toBeDefined();
    expect(item?.verified).toBe(false);
    expect(item?.openStatus).toBeUndefined();
  });

  it('excludes a public_info_only café from attribute filters', async () => {
    const { json: cafe } = await createCafe(
      baseCafeBody({
        consentStatus: 'public_info_only',
        sourceUrl: 'https://example.test',
        amenities: { byogAllowed: true },
      }),
    );

    const { body } = await pins(`province=${PROVINCE.slug}&byog=true`);
    expect(body.some((p) => p.slug === cafe.slug)).toBe(false);
  });

  it('filters by gameSlug ("có game X")', async () => {
    const { json: withGame } = await createCafe(baseCafeBody());
    const { json: withoutGame } = await createCafe(baseCafeBody());
    const game = await createGame(`Map Filter Game ${Date.now()}`);
    await maintainerApp.request(`/api/cafes/${withGame.id}/games`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ gameId: game.id }),
    });

    const { body } = await pins(`province=${PROVINCE.slug}&gameSlug=${game.slug}`);
    const slugs = body.map((p) => p.slug);
    expect(slugs).toContain(withGame.slug);
    expect(slugs).not.toContain(withoutGame.slug);
  });

  it('filters by bbox', async () => {
    const { json: inside } = await createCafe(baseCafeBody());
    const { json: outside } = await createCafe(baseCafeBody({ lat: 10.7769, lng: 106.7009 }));

    const { body } = await pins('minLng=105&minLat=20.5&maxLng=106.5&maxLat=21.5');
    const slugs = body.map((p) => p.slug);
    expect(slugs).toContain(inside.slug);
    expect(slugs).not.toContain(outside.slug);
  });

  it('rejects a bbox missing a coordinate (422)', async () => {
    const res = await publicApp.request('/api/cafes/map?minLng=105&minLat=20.5&maxLng=106.5');
    expect(res.status).toBe(422);
  });

  it('rejects a bbox where min >= max (422)', async () => {
    const res = await publicApp.request(
      '/api/cafes/map?minLng=107&minLat=20.5&maxLng=106.5&maxLat=21.5',
    );
    expect(res.status).toBe(422);
  });
});

describe('PATCH /cafes/:id — VN coordinate bounding box', () => {
  it('rejects coordinates outside Vietnam (422)', async () => {
    const { res } = await createCafe(baseCafeBody({ lat: 1.35, lng: 103.82 }));
    expect(res.status).toBe(422);
  });

  it('accepts coordinates inside Vietnam', async () => {
    const { res } = await createCafe(baseCafeBody());
    expect(res.status).toBe(201);
  });

  it('rejects half-set coordinates — lat without lng (422)', async () => {
    const { res } = await createCafe(baseCafeBody({ lat: 21.0285, lng: undefined }));
    expect(res.status).toBe(422);
  });

  it('rejects half-set coordinates — lng without lat (422)', async () => {
    const { res } = await createCafe(baseCafeBody({ lat: undefined, lng: 105.8542 }));
    expect(res.status).toBe(422);
  });
});
