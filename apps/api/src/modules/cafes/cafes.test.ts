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
const owner = { ...fakeUser('user'), id: 'u-cafes-owner', email: 'u-cafes-owner@example.test' };
const maintainerApp = createApp({ auth: fakeAuth(maintainer), rateLimit: false });
const userApp = createApp({ auth: fakeAuth(fakeUser('user')), rateLimit: false });
const ownerApp = createApp({ auth: fakeAuth(owner), rateLimit: false });
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
  await db
    .insert(users)
    .values({ ...owner, username: owner.id })
    .onConflictDoNothing({ target: users.id });
  await db.insert(provinces).values([PROVINCE_A, PROVINCE_B]).onConflictDoNothing();
  await db.insert(wards).values([WARD_A1, WARD_A2, WARD_B1]).onConflictDoNothing();
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
  await db.delete(wards).where(inArray(wards.code, [WARD_A1.code, WARD_A2.code, WARD_B1.code]));
  await db.delete(provinces).where(inArray(provinces.code, [PROVINCE_A.code, PROVINCE_B.code]));
  await db.delete(users).where(eq(users.id, maintainer.id));
  await db.delete(users).where(eq(users.id, owner.id));
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

  it('hides a declined cafe from the public list, detail and game finder, but staff still see it', async () => {
    const { json: cafe } = await createCafe(
      baseCafeBody({ consentStatus: 'declined', sourceUrl: 'https://example.test' }),
    );
    const game = await createGame(`Declined Cafe Game ${Date.now()}`);
    await maintainerApp.request(`/api/cafes/${cafe.id}/games`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ gameId: game.id }),
    });

    const detailRes = await publicApp.request(`/api/cafes/${cafe.slug}`);
    expect(detailRes.status).toBe(404);

    const listRes = await publicApp.request(`/api/cafes?province=${PROVINCE_A.slug}`);
    const listBody = (await listRes.json()) as { items: { id: string }[] };
    expect(listBody.items.some((c) => c.id === cafe.id)).toBe(false);

    const gameCafesRes = await publicApp.request(`/api/games/${game.slug}/cafes`);
    const gameCafesBody = (await gameCafesRes.json()) as { id: string }[];
    expect(gameCafesBody.some((c) => c.id === cafe.id)).toBe(false);

    const manageRes = await maintainerApp.request(`/api/cafes/${cafe.id}/manage`);
    expect(manageRes.status).toBe(200);
  });

  it('exposes `verified` only for a granted cafe on both list and detail (also read by sitemap/llms)', async () => {
    const { json: granted } = await createCafe(baseCafeBody({ consentStatus: 'granted' }));
    const { json: infoOnly } = await createCafe(
      baseCafeBody({ consentStatus: 'public_info_only', sourceUrl: 'https://example.test' }),
    );

    const listRes = await publicApp.request(`/api/cafes?province=${PROVINCE_A.slug}&pageSize=50`);
    const listBody = (await listRes.json()) as { items: { id: string; verified: boolean }[] };
    expect(listBody.items.find((c) => c.id === granted.id)?.verified).toBe(true);
    expect(listBody.items.find((c) => c.id === infoOnly.id)?.verified).toBe(false);

    const detailRes = await publicApp.request(`/api/cafes/${granted.slug}`);
    expect(((await detailRes.json()) as { verified: boolean }).verified).toBe(true);
  });

  it('hides amenities/feeModel/feeNote/openingHours/openStatus for public_info_only but shows venueType', async () => {
    const { json: cafe } = await createCafe(
      baseCafeBody({
        consentStatus: 'public_info_only',
        sourceUrl: 'https://example.test',
        venueType: 'byog_cafe',
        feeModel: 'hourly',
        feeNote: 'không được lộ ra ngoài',
        amenities: { wifi: true },
        openingHours: { mon: [{ open: '08:00', close: '22:00' }] },
      }),
    );

    const res = await publicApp.request(`/api/cafes/${cafe.slug}`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.venueType).toBe('byog_cafe');
    expect(body.amenities).toBeUndefined();
    expect(body.feeModel).toBeUndefined();
    expect(body.feeNote).toBeUndefined();
    expect(body.openStatus).toBeUndefined();
    expect(body.openingHours).toBeUndefined();

    const textRes = await publicApp.request(`/api/cafes/${cafe.slug}`);
    expect(await textRes.text()).not.toContain('không được lộ ra ngoài');

    const manageRes = await maintainerApp.request(`/api/cafes/${cafe.id}/manage`);
    const manageBody = (await manageRes.json()) as Record<string, unknown>;
    // byog_cafe defaults byogAllowed to true on top of the explicit wifi:true.
    expect(manageBody.amenities).toEqual({ wifi: true, byogAllowed: true });
    expect(manageBody.feeModel).toBe('hourly');
  });

  it('defaults byogAllowed to true for a byog_cafe when unset', async () => {
    const { json: cafe } = await createCafe(baseCafeBody({ venueType: 'byog_cafe' }));
    const manageRes = await maintainerApp.request(`/api/cafes/${cafe.id}/manage`);
    const body = (await manageRes.json()) as { amenities: { byogAllowed: boolean | null } };
    expect(body.amenities.byogAllowed).toBe(true);
  });

  it('rejects an invalid amenities value (maxGroupSize out of range)', async () => {
    const res = await maintainerApp.request('/api/cafes', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(baseCafeBody({ amenities: { maxGroupSize: 500 } })),
    });
    expect(res.status).toBe(422);
  });

  it('filters cafes by venueType, byog and free', async () => {
    const { json: byogCafe } = await createCafe(
      baseCafeBody({ venueType: 'byog_cafe', feeModel: 'free' }),
    );
    const { json: regularCafe } = await createCafe(
      baseCafeBody({ venueType: 'boardgame_cafe', feeModel: 'hourly' }),
    );

    const venueTypeRes = await publicApp.request(
      `/api/cafes?province=${PROVINCE_A.slug}&venueType=byog_cafe&pageSize=50`,
    );
    const venueTypeBody = (await venueTypeRes.json()) as { items: { id: string }[] };
    expect(venueTypeBody.items.some((c) => c.id === byogCafe.id)).toBe(true);
    expect(venueTypeBody.items.some((c) => c.id === regularCafe.id)).toBe(false);

    const byogRes = await publicApp.request(
      `/api/cafes?province=${PROVINCE_A.slug}&byog=true&pageSize=50`,
    );
    const byogBody = (await byogRes.json()) as { items: { id: string }[] };
    expect(byogBody.items.some((c) => c.id === byogCafe.id)).toBe(true);
    expect(byogBody.items.some((c) => c.id === regularCafe.id)).toBe(false);

    const freeRes = await publicApp.request(
      `/api/cafes?province=${PROVINCE_A.slug}&free=true&pageSize=50`,
    );
    const freeBody = (await freeRes.json()) as { items: { id: string }[] };
    expect(freeBody.items.some((c) => c.id === byogCafe.id)).toBe(true);
    expect(freeBody.items.some((c) => c.id === regularCafe.id)).toBe(false);
  });

  it('filters cafes by openNow', async () => {
    const { json: openCafe } = await createCafe(
      baseCafeBody({
        openingHours: { mon: [], tue: [], wed: [], thu: [], fri: [], sat: [], sun: [] },
      }),
    );
    // A café with an all-day range (00:00-00:00 == 24h) is always open right now.
    const allDay = { open: '00:00', close: '00:00' };
    await maintainerApp.request(`/api/cafes/${openCafe.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        openingHours: {
          mon: [allDay],
          tue: [allDay],
          wed: [allDay],
          thu: [allDay],
          fri: [allDay],
          sat: [allDay],
          sun: [allDay],
        },
      }),
    });
    const { json: closedCafe } = await createCafe(baseCafeBody());

    const res = await publicApp.request(
      `/api/cafes?province=${PROVINCE_A.slug}&openNow=true&pageSize=50`,
    );
    const body = (await res.json()) as { items: { id: string }[] };
    expect(body.items.some((c) => c.id === openCafe.id)).toBe(true);
    expect(body.items.some((c) => c.id === closedCafe.id)).toBe(false);
  });

  it('owner/staff PATCH can update venueType/amenities/feeModel but not consentStatus', async () => {
    const { json: cafe } = await createCafe(baseCafeBody());
    await db.insert(cafeMembers).values({ cafeId: cafe.id, userId: owner.id, role: 'owner' });

    const res = await ownerApp.request(`/api/cafes/${cafe.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        venueType: 'event_space',
        amenities: { wifi: true, maxGroupSize: 20 },
        feeModel: 'per_person',
        feeNote: 'Vé vào cổng',
        consentStatus: 'declined',
      }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.venueType).toBe('event_space');
    expect(body.feeModel).toBe('per_person');
    expect(body.consentStatus).not.toBe('declined');

    await db.delete(cafeMembers).where(eq(cafeMembers.cafeId, cafe.id));
  });

  it('excludes a public_info_only café from attribute filters for anonymous, but staff still see it', async () => {
    const { json: cafe } = await createCafe(
      baseCafeBody({
        consentStatus: 'public_info_only',
        sourceUrl: 'https://example.test',
        venueType: 'byog_cafe',
        feeModel: 'free',
        amenities: { foodAvailable: true, privateRoom: true, largeTables: true },
        openingHours: {
          mon: [{ open: '00:00', close: '00:00' }],
          tue: [{ open: '00:00', close: '00:00' }],
          wed: [{ open: '00:00', close: '00:00' }],
          thu: [{ open: '00:00', close: '00:00' }],
          fri: [{ open: '00:00', close: '00:00' }],
          sat: [{ open: '00:00', close: '00:00' }],
          sun: [{ open: '00:00', close: '00:00' }],
        },
      }),
    );

    const base = `province=${PROVINCE_A.slug}&pageSize=50`;
    for (const q of [
      'byog=true',
      'food=true',
      'privateRoom=true',
      'largeTables=true',
      'free=true',
      'openNow=true',
    ]) {
      const res = await publicApp.request(`/api/cafes?${base}&${q}`);
      const body = (await res.json()) as { items: { id: string }[] };
      expect(body.items.some((c) => c.id === cafe.id)).toBe(false);
    }

    const manageRes = await maintainerApp.request(`/api/cafes/manage?${base}&byog=true`);
    const manageBody = (await manageRes.json()) as { items: { id: string }[] };
    expect(manageBody.items.some((c) => c.id === cafe.id)).toBe(true);
  });

  it('returns 200 for a legacy/malformed openingHours row (defensive read, never throws)', async () => {
    const { json: cafe } = await createCafe(baseCafeBody());
    await db
      .update(cafes)
      .set({ openingHours: { mon: '8:00-22:00' } as never })
      .where(eq(cafes.id, cafe.id));

    const listRes = await publicApp.request(`/api/cafes?province=${PROVINCE_A.slug}&pageSize=50`);
    expect(listRes.status).toBe(200);

    const detailRes = await publicApp.request(`/api/cafes/${cafe.slug}`);
    expect(detailRes.status).toBe(200);
    const detail = (await detailRes.json()) as { openStatus: { state: string } };
    expect(detail.openStatus.state).toBe('unknown');
  });

  it('merges touching ranges on save (10-14 + 14-22 becomes a single 10-22 range)', async () => {
    const { json: cafe } = await createCafe(
      baseCafeBody({
        openingHours: {
          mon: [
            { open: '10:00', close: '14:00' },
            { open: '14:00', close: '22:00' },
          ],
        },
      }),
    );
    const detailRes = await publicApp.request(`/api/cafes/${cafe.slug}`);
    const detail = (await detailRes.json()) as {
      openingHours: { mon: { open: string; close: string }[] };
    };
    expect(detail.openingHours.mon).toEqual([{ open: '10:00', close: '22:00' }]);
  });
});
