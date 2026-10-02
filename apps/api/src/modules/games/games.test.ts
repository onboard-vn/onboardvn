import { eq, inArray } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../../app.js';
import { db, pool } from '../../db/client.js';
import {
  cafeGames,
  cafes,
  categories,
  gameBarcodes,
  gameCategories,
  games,
  provinces,
  users,
  wards,
} from '../../db/schema/index.js';
import { fakeAuth, fakeUser } from '../../test/fake-auth.js';

const maintainer = fakeUser('maintainer');
const maintainerApp = createApp({ auth: fakeAuth(maintainer), rateLimit: false });
const userApp = createApp({ auth: fakeAuth(fakeUser('user')), rateLimit: false });
const publicApp = createApp({ auth: fakeAuth(null), rateLimit: false });

const createdGameIds: string[] = [];

beforeAll(async () => {
  // games.createdBy has an FK to users, so the maintainer fixture must exist as a real row.
  await db
    .insert(users)
    .values({ ...maintainer, role: 'maintainer' })
    .onConflictDoNothing({ target: users.id });
});

interface CreatedGame {
  id: string;
  slug: string;
  bggId: number | null;
}

async function createGame(body: Record<string, unknown>) {
  const res = await maintainerApp.request('/api/games', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ acceptLicense: true, ...body }),
  });
  const json = (await res.json()) as CreatedGame;
  if (res.status === 201) createdGameIds.push(json.id);
  return { res, json };
}

afterAll(async () => {
  if (createdGameIds.length > 0) {
    await db.delete(gameBarcodes).where(inArray(gameBarcodes.gameId, createdGameIds));
    await db.delete(gameCategories).where(inArray(gameCategories.gameId, createdGameIds));
    await db.delete(games).where(inArray(games.id, createdGameIds));
  }
  await db.delete(users).where(eq(users.id, maintainer.id));
  await pool.end();
});

describe('games catalog', () => {
  it('search "ma soi" finds "Ma Sói"', async () => {
    const { res } = await createGame({ nameEn: `Werewolf ${Date.now()}`, nameVi: 'Ma Sói' });
    expect(res.status).toBe(201);

    const listRes = await publicApp.request(`/api/games?q=${encodeURIComponent('ma soi')}`);
    expect(listRes.status).toBe(200);
    const body = (await listRes.json()) as { items: { nameVi: string | null }[] };
    expect(body.items.some((g) => g.nameVi === 'Ma Sói')).toBe(true);
  });

  it('filters by player, time and weight ranges', async () => {
    const tag = `Range${Date.now()}`;
    const mk = (suffix: string, body: Record<string, unknown>) =>
      createGame({ nameEn: `${tag} ${suffix}`, ...body });
    await mk('A', { minPlayers: 2, maxPlayers: 4, playMinutes: 30, weight: 1.5 });
    await mk('B', { minPlayers: 5, maxPlayers: 8, playMinutes: 120, weight: 3.5 });

    const names = async (query: string) => {
      const res = await publicApp.request(`/api/games?q=${encodeURIComponent(tag)}&${query}`);
      expect(res.status).toBe(200);
      const body = (await res.json()) as { items: { nameEn: string }[] };
      return body.items.map((g) => g.nameEn.slice(-1)).sort();
    };

    expect(await names('minPlayers=3&maxPlayers=4')).toEqual(['A']);
    expect(await names('minPlayers=4&maxPlayers=5')).toEqual(['A', 'B']);
    expect(await names('minPlayers=9')).toEqual([]);
    expect(await names('maxPlayers=1')).toEqual([]);
    expect(await names('minTime=60')).toEqual(['B']);
    expect(await names('minTime=20&maxTime=60')).toEqual(['A']);
    expect(await names('minWeight=2')).toEqual(['B']);
    expect(await names('minWeight=1&maxWeight=2')).toEqual(['A']);
    expect(await names('players=6')).toEqual(['B']);
    expect(await names('maxTime=30')).toEqual(['A']);
    expect(await names('maxWeight=4')).toEqual(['A', 'B']);
  });

  it('rejects a barcode with a bad checksum (422)', async () => {
    const { json: game } = await createGame({ nameEn: `Barcode Test ${Date.now()}` });
    const res = await maintainerApp.request(`/api/games/${game.id}/barcodes`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ code: '4006381333930' }),
    });
    expect(res.status).toBe(422);
    expect(((await res.json()) as { error: { code: string } }).error.code).toBe(
      'VALIDATION_FAILED',
    );
  });

  it('dedupes the slug on a name collision', async () => {
    const name = `Catan Test ${Date.now()}`;
    const { json: first } = await createGame({ nameEn: name });
    const { json: second } = await createGame({ nameEn: name });
    expect(first.slug).not.toBe(second.slug);
    expect(second.slug.startsWith(first.slug)).toBe(true);
  });

  it('forbids a regular user from creating a game', async () => {
    const res = await userApp.request('/api/games', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ nameEn: 'Nope' }),
    });
    expect(res.status).toBe(403);
  });

  it('includes a BGG link in the detail response when bggId is set', async () => {
    const bggId = 100_000 + (Date.now() % 100_000);
    const { json: game } = await createGame({ nameEn: `BGG Test ${Date.now()}`, bggId });
    const res = await publicApp.request(`/api/games/${game.slug}`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { bggUrl: string | null };
    expect(body.bggUrl).toBe(`https://boardgamegeek.com/boardgame/${bggId}`);
  });

  it('rejects an original-source description without acceptLicense (422)', async () => {
    const res = await maintainerApp.request('/api/games', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ nameEn: `No Accept ${Date.now()}`, descriptionVi: 'Mô tả' }),
    });
    expect(res.status).toBe(422);
    expect(((await res.json()) as { error: { code: string } }).error.code).toBe(
      'VALIDATION_FAILED',
    );
  });

  it('rejects a translated_with_permission description missing the rights holder (422)', async () => {
    const res = await maintainerApp.request('/api/games', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        nameEn: `Translated No Holder ${Date.now()}`,
        descriptionSource: 'translated_with_permission',
      }),
    });
    expect(res.status).toBe(422);
    expect(((await res.json()) as { error: { code: string } }).error.code).toBe(
      'VALIDATION_FAILED',
    );
  });

  it('rejects a non-YouTube/Facebook video URL (422)', async () => {
    const res = await maintainerApp.request('/api/games', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        nameEn: `Bad Video ${Date.now()}`,
        acceptLicense: true,
        videoUrls: ['https://vimeo.com/123'],
      }),
    });
    expect(res.status).toBe(422);
  });

  it('writes a game_revisions row on create and on update, and hides permissionRef publicly', async () => {
    const { json: game } = await createGame({
      nameEn: `Revisions Test ${Date.now()}`,
      descriptionVi: 'Bản đầu tiên',
      descriptionSource: 'translated_with_permission',
      descriptionRightsHolder: 'NPH Test',
      descriptionPermissionRef: 'email-2026-09-24',
    });

    const revisionsRes = await maintainerApp.request(`/api/games/${game.slug}/revisions`);
    expect(revisionsRes.status).toBe(200);
    let revisions = ((await revisionsRes.json()) as { items: unknown[] }).items;
    expect(revisions).toHaveLength(1);

    const updateRes = await maintainerApp.request(`/api/games/${game.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ descriptionVi: 'Bản cập nhật' }),
    });
    expect(updateRes.status).toBe(200);

    const revisionsRes2 = await maintainerApp.request(`/api/games/${game.slug}/revisions`);
    revisions = ((await revisionsRes2.json()) as { items: unknown[] }).items;
    expect(revisions).toHaveLength(2);

    const publicRes = await publicApp.request(`/api/games/${game.slug}`);
    const publicBody = (await publicRes.json()) as Record<string, unknown>;
    expect(publicBody.descriptionPermissionRef).toBeUndefined();

    const staffRes = await maintainerApp.request(`/api/games/${game.slug}`);
    const staffBody = (await staffRes.json()) as { descriptionPermissionRef: string | null };
    expect(staffBody.descriptionPermissionRef).toBe('email-2026-09-24');
  });

  it('filters by categoryId', async () => {
    const [cat] = await db
      .insert(categories)
      .values({ name: `Test category ${Date.now()}` })
      .returning({ id: categories.id });
    const { json: tagged } = await createGame({
      nameEn: `Category hit ${Date.now()}`,
      categoryIds: [cat!.id],
    });
    await createGame({ nameEn: `Category miss ${Date.now()}` });
    try {
      const res = await publicApp.request(`/api/games?categoryId=${cat!.id}`);
      expect(res.status).toBe(200);
      const body = (await res.json()) as { items: { id: string }[] };
      expect(body.items.map((g) => g.id)).toEqual([tagged.id]);
    } finally {
      await db.delete(gameCategories).where(eq(gameCategories.categoryId, cat!.id));
      await db.delete(categories).where(eq(categories.id, cat!.id));
    }
  });

  it('returns 422 (not 500) for a malformed uuid in categoryId or a route param', async () => {
    const listRes = await publicApp.request('/api/games?categoryId=abc');
    expect(listRes.status).toBe(422);

    const patchRes = await maintainerApp.request('/api/games/not-a-uuid', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ nameEn: 'x' }),
    });
    expect(patchRes.status).toBe(422);
  });

  it('clears an optional field by sending null on update', async () => {
    const { json: game } = await createGame({
      nameEn: `Clear Field Test ${Date.now()}`,
      nameVi: 'Có tên',
      bggId: 900_000 + (Date.now() % 90_000),
    });

    const res = await maintainerApp.request(`/api/games/${game.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ nameVi: null, bggId: null }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { nameVi: string | null; bggId: number | null };
    expect(body.nameVi).toBeNull();
    expect(body.bggId).toBeNull();
  });
  it('filters by isVietnamese and rejects a non-boolean value', async () => {
    const { json: vi } = await createGame({ nameEn: `Viet hit ${Date.now()}`, isVietnamese: true });
    const { json: other } = await createGame({ nameEn: `Viet miss ${Date.now()}` });

    const yes = (await (
      await publicApp.request('/api/games?isVietnamese=true&pageSize=50')
    ).json()) as {
      items: { id: string; isVietnamese: boolean }[];
    };
    expect(yes.items.every((g) => g.isVietnamese)).toBe(true);
    expect(yes.items.some((g) => g.id === vi.id)).toBe(true);
    expect(yes.items.some((g) => g.id === other.id)).toBe(false);

    expect((await publicApp.request('/api/games?isVietnamese=maybe')).status).toBe(422);
  });

  it('sorts by number of public cafes, ignoring pending ones and games in no café', async () => {
    const stamp = Date.now();
    const { json: many } = await createGame({ nameEn: `Zzz many cafes ${stamp}` });
    const { json: few } = await createGame({ nameEn: `Aaa few cafes ${stamp}` });
    const { json: none } = await createGame({ nameEn: `Aaa no cafes ${stamp}` });
    const provinceCode = `gs-p-${stamp}`;
    await db.insert(provinces).values({ code: provinceCode, name: 'GS', slug: `gs-${stamp}` });
    await db
      .insert(wards)
      .values({ code: `gs-w-${stamp}`, provinceCode, name: 'W', slug: `gs-w-${stamp}` });
    const inserted = await db
      .insert(cafes)
      .values(
        [0, 1, 2].map((i) => ({
          slug: `games-sort-${stamp}-${i}`,
          name: `Games Sort ${i}`,
          provinceCode,
          wardCode: `gs-w-${stamp}`,
          addressLine: 'x',
          consentStatus: (i === 2 ? 'pending' : 'granted') as 'pending' | 'granted',
        })),
      )
      .returning({ id: cafes.id });
    const cafeIds = inserted.map((c) => c.id);
    try {
      await db.insert(cafeGames).values([
        { cafeId: cafeIds[0]!, gameId: many.id },
        { cafeId: cafeIds[1]!, gameId: many.id },
        { cafeId: cafeIds[0]!, gameId: few.id },
        { cafeId: cafeIds[2]!, gameId: few.id },
      ]);
      const res = await publicApp.request('/api/games?sort=cafes&pageSize=50');
      expect(res.status).toBe(200);
      const body = (await res.json()) as { items: { id: string }[] };
      const ids = body.items.map((g) => g.id);
      expect(ids.indexOf(many.id)).toBeGreaterThanOrEqual(0);
      expect(ids.indexOf(many.id)).toBeLessThan(ids.indexOf(few.id));
      expect(ids).not.toContain(none.id);
      expect((await publicApp.request('/api/games?sort=bogus')).status).toBe(422);
    } finally {
      await db.delete(cafes).where(inArray(cafes.id, cafeIds));
      await db.delete(wards).where(eq(wards.provinceCode, provinceCode));
      await db.delete(provinces).where(eq(provinces.code, provinceCode));
    }
  });
});
