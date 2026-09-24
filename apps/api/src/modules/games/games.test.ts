import { eq, inArray } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../../app.js';
import { db, pool } from '../../db/client.js';
import { gameBarcodes, gameCategories, games, users } from '../../db/schema/index.js';
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
});
