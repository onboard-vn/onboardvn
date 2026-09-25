import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { eq, inArray } from 'drizzle-orm';
import sharp from 'sharp';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../../app.js';
import { db, pool } from '../../db/client.js';
import { cafeMembers, cafePhotos, cafes, provinces, users, wards } from '../../db/schema/index.js';
import { fakeAuth, fakeUser } from '../../test/fake-auth.js';

const maintainer = fakeUser('maintainer');
const owner = { ...fakeUser('user'), id: 'u-media-owner', email: 'u-media-owner@example.test' };
const outsider = {
  ...fakeUser('user'),
  id: 'u-media-outsider',
  email: 'u-media-outsider@example.test',
};
const maintainerApp = createApp({ auth: fakeAuth(maintainer), rateLimit: false });
const ownerApp = createApp({ auth: fakeAuth(owner), rateLimit: false });
const outsiderApp = createApp({ auth: fakeAuth(outsider), rateLimit: false });

const ORIGIN = 'http://localhost:3000';
const FIXTURES_DIR = fileURLToPath(new URL('../../test/fixtures/', import.meta.url));

const PROVINCE = { code: 'p7c-t1', name: 'Tỉnh Media Test', slug: 'p7c-tinh-media-test' };
const WARD = {
  code: 'p7c-w1',
  provinceCode: PROVINCE.code,
  name: 'Phường Một',
  slug: 'p7c-phuong-mot',
};

const createdCafeIds: string[] = [];
let VALID_PNG_BYTES: Uint8Array;
let EXIF_GPS_JPEG: Buffer;
let OVERSIZE_PIXELS_PNG: Buffer;

beforeAll(async () => {
  await db
    .insert(users)
    .values({ ...maintainer, role: 'maintainer' })
    .onConflictDoNothing({ target: users.id });
  await db
    .insert(users)
    .values({ ...owner, username: owner.id })
    .onConflictDoNothing({ target: users.id });
  await db
    .insert(users)
    .values({ ...outsider, username: outsider.id })
    .onConflictDoNothing({ target: users.id });
  await db.insert(provinces).values(PROVINCE).onConflictDoNothing();
  await db.insert(wards).values(WARD).onConflictDoNothing();

  VALID_PNG_BYTES = new Uint8Array(
    await sharp({
      create: { width: 8, height: 8, channels: 3, background: { r: 200, g: 0, b: 0 } },
    })
      .png()
      .toBuffer(),
  );
  EXIF_GPS_JPEG = await readFile(`${FIXTURES_DIR}exif-gps.jpg`);
  OVERSIZE_PIXELS_PNG = await readFile(`${FIXTURES_DIR}oversize-pixels.png`);
});

afterAll(async () => {
  if (createdCafeIds.length > 0) {
    await db.delete(cafePhotos).where(inArray(cafePhotos.cafeId, createdCafeIds));
    await db.delete(cafeMembers).where(inArray(cafeMembers.cafeId, createdCafeIds));
    await db.delete(cafes).where(inArray(cafes.id, createdCafeIds));
  }
  await db.delete(wards).where(eq(wards.code, WARD.code));
  await db.delete(provinces).where(eq(provinces.code, PROVINCE.code));
  await db.delete(users).where(eq(users.id, maintainer.id));
  await db.delete(users).where(eq(users.id, owner.id));
  await db.delete(users).where(eq(users.id, outsider.id));
  await pool.end();
});

async function createOwnedCafe() {
  const res = await maintainerApp.request('/api/cafes', {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: ORIGIN },
    body: JSON.stringify({
      name: `Quán Media ${Date.now()}-${Math.random()}`,
      provinceCode: PROVINCE.code,
      wardCode: WARD.code,
      addressLine: '1 Đường Media',
      consentStatus: 'granted',
    }),
  });
  const json = (await res.json()) as { id: string };
  createdCafeIds.push(json.id);
  await db.insert(cafeMembers).values({ cafeId: json.id, userId: owner.id, role: 'owner' });
  return json.id;
}

function uploadForm(bytes: Uint8Array | Buffer, filename: string, caption?: string) {
  const form = new FormData();
  form.set('file', new File([bytes], filename, { type: 'image/png' }));
  if (caption !== undefined) form.set('caption', caption);
  return form;
}

describe('cafe media upload', () => {
  it('rejects a spoofed MIME (fake magic bytes) with 422', async () => {
    const cafeId = await createOwnedCafe();
    const res = await ownerApp.request(`/api/cafes/${cafeId}/logo`, {
      method: 'POST',
      headers: { origin: ORIGIN },
      body: uploadForm(new Uint8Array([1, 2, 3, 4]), 'fake.png'),
    });
    expect(res.status).toBe(422);
  });

  it('rejects an oversized file with 413', async () => {
    const cafeId = await createOwnedCafe();
    const oversized = new Uint8Array(6 * 1024 * 1024);
    oversized.set(VALID_PNG_BYTES);

    const res = await ownerApp.request(`/api/cafes/${cafeId}/logo`, {
      method: 'POST',
      headers: { origin: ORIGIN },
      body: uploadForm(oversized, 'big.png'),
    });
    expect(res.status).toBe(413);
  });

  it('rejects an image whose decoded pixel count exceeds the limit with 422', async () => {
    const cafeId = await createOwnedCafe();
    const res = await ownerApp.request(`/api/cafes/${cafeId}/logo`, {
      method: 'POST',
      headers: { origin: ORIGIN },
      body: uploadForm(OVERSIZE_PIXELS_PNG, 'huge.png'),
    });
    expect(res.status).toBe(422);
  });

  it('uploads and serves a valid logo as re-encoded WebP, and deletes it', async () => {
    const cafeId = await createOwnedCafe();
    const uploadRes = await ownerApp.request(`/api/cafes/${cafeId}/logo`, {
      method: 'POST',
      headers: { origin: ORIGIN },
      body: uploadForm(VALID_PNG_BYTES, 'logo.png'),
    });
    expect(uploadRes.status).toBe(200);
    const cafe = (await uploadRes.json()) as { logoUrl: string | null };
    expect(cafe.logoUrl).toMatch(/^\/api\/uploads\/cafes\/logos\/.+\.webp$/);

    const getRes = await ownerApp.request(cafe.logoUrl!);
    expect(getRes.status).toBe(200);
    expect(getRes.headers.get('content-type')).toContain('image/webp');

    const deleteRes = await ownerApp.request(`/api/cafes/${cafeId}/logo`, {
      method: 'DELETE',
      headers: { origin: ORIGIN },
    });
    expect(deleteRes.status).toBe(200);
    const afterDelete = (await deleteRes.json()) as { logoUrl: string | null };
    expect(afterDelete.logoUrl).toBeNull();

    const afterDeleteGet = await ownerApp.request(cafe.logoUrl!);
    expect(afterDeleteGet.status).toBe(404);
  });

  it('strips EXIF/GPS metadata from an uploaded JPEG', async () => {
    const cafeId = await createOwnedCafe();
    const uploadRes = await ownerApp.request(`/api/cafes/${cafeId}/cover`, {
      method: 'POST',
      headers: { origin: ORIGIN },
      body: uploadForm(EXIF_GPS_JPEG, 'exif.jpg'),
    });
    expect(uploadRes.status).toBe(200);
    const cafe = (await uploadRes.json()) as { coverUrl: string | null };

    const getRes = await ownerApp.request(cafe.coverUrl!);
    const stored = Buffer.from(await getRes.arrayBuffer());
    const meta = await sharp(stored).metadata();
    expect(meta.format).toBe('webp');
    expect(meta.exif).toBeUndefined();
  });

  it('uses a fresh unique filename per upload and removes the previous file', async () => {
    const cafeId = await createOwnedCafe();
    const first = await ownerApp.request(`/api/cafes/${cafeId}/logo`, {
      method: 'POST',
      headers: { origin: ORIGIN },
      body: uploadForm(VALID_PNG_BYTES, 'logo1.png'),
    });
    const firstCafe = (await first.json()) as { logoUrl: string };

    const second = await ownerApp.request(`/api/cafes/${cafeId}/logo`, {
      method: 'POST',
      headers: { origin: ORIGIN },
      body: uploadForm(VALID_PNG_BYTES, 'logo2.png'),
    });
    const secondCafe = (await second.json()) as { logoUrl: string };

    expect(secondCafe.logoUrl).not.toBe(firstCafe.logoUrl);
    const oldGet = await ownerApp.request(firstCafe.logoUrl);
    expect(oldGet.status).toBe(404);
    const newGet = await ownerApp.request(secondCafe.logoUrl);
    expect(newGet.status).toBe(200);
  });

  it('rejects cross-café access with 403', async () => {
    const cafeId = await createOwnedCafe();
    const res = await outsiderApp.request(`/api/cafes/${cafeId}/logo`, {
      method: 'POST',
      headers: { origin: ORIGIN },
      body: uploadForm(VALID_PNG_BYTES, 'logo.png'),
    });
    expect(res.status).toBe(403);
  });

  it('caps photos at 30 per café', async () => {
    const cafeId = await createOwnedCafe();
    const rows = Array.from({ length: 30 }, (_, i) => ({
      cafeId,
      path: `cafes/photos/${cafeId}/seed-${i}.webp`,
      sortOrder: i,
      uploadedBy: owner.id,
    }));
    await db.insert(cafePhotos).values(rows);

    const res = await ownerApp.request(`/api/cafes/${cafeId}/photos`, {
      method: 'POST',
      headers: { origin: ORIGIN },
      body: uploadForm(VALID_PNG_BYTES, 'extra.png'),
    });
    expect(res.status).toBe(422);
  });

  it('enforces the 30-photo cap under concurrent uploads (no race past the limit)', async () => {
    const cafeId = await createOwnedCafe();
    const seedRows = Array.from({ length: 29 }, (_, i) => ({
      cafeId,
      path: `cafes/photos/${cafeId}/seed-race-${i}.webp`,
      sortOrder: i,
      uploadedBy: owner.id,
    }));
    await db.insert(cafePhotos).values(seedRows);

    const [a, b] = await Promise.all([
      ownerApp.request(`/api/cafes/${cafeId}/photos`, {
        method: 'POST',
        headers: { origin: ORIGIN },
        body: uploadForm(VALID_PNG_BYTES, 'race-a.png'),
      }),
      ownerApp.request(`/api/cafes/${cafeId}/photos`, {
        method: 'POST',
        headers: { origin: ORIGIN },
        body: uploadForm(VALID_PNG_BYTES, 'race-b.png'),
      }),
    ]);
    const statuses = [a.status, b.status].sort();
    expect(statuses).toEqual([201, 422]);

    const rows = await db.select().from(cafePhotos).where(eq(cafePhotos.cafeId, cafeId));
    expect(rows).toHaveLength(30);
  });

  it('rejects a photo caption longer than 140 characters with 422', async () => {
    const cafeId = await createOwnedCafe();
    const res = await ownerApp.request(`/api/cafes/${cafeId}/photos`, {
      method: 'POST',
      headers: { origin: ORIGIN },
      body: uploadForm(VALID_PNG_BYTES, 'p.png', 'x'.repeat(141)),
    });
    expect(res.status).toBe(422);
  });

  it('adds, reorders and deletes a photo', async () => {
    const cafeId = await createOwnedCafe();
    const res1 = await ownerApp.request(`/api/cafes/${cafeId}/photos`, {
      method: 'POST',
      headers: { origin: ORIGIN },
      body: uploadForm(VALID_PNG_BYTES, 'p1.png', 'Ảnh 1'),
    });
    expect(res1.status).toBe(201);

    const res2 = await ownerApp.request(`/api/cafes/${cafeId}/photos`, {
      method: 'POST',
      headers: { origin: ORIGIN },
      body: uploadForm(VALID_PNG_BYTES, 'p2.png'),
    });
    expect(res2.status).toBe(201);
    const cafeAfterAdd = (await res2.json()) as {
      photos: { id: string; caption: string | null }[];
    };
    expect(cafeAfterAdd.photos).toHaveLength(2);
    expect(cafeAfterAdd.photos[0]!.caption).toBe('Ảnh 1');

    const [first, second] = cafeAfterAdd.photos;
    const reorderRes = await ownerApp.request(`/api/cafes/${cafeId}/photos/reorder`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json', origin: ORIGIN },
      body: JSON.stringify({ photoIds: [second!.id, first!.id] }),
    });
    expect(reorderRes.status).toBe(200);
    const reordered = (await reorderRes.json()) as { photos: { id: string }[] };
    expect(reordered.photos[0]!.id).toBe(second!.id);

    const deleteRes = await ownerApp.request(`/api/cafes/${cafeId}/photos/${first!.id}`, {
      method: 'DELETE',
      headers: { origin: ORIGIN },
    });
    expect(deleteRes.status).toBe(200);
    const afterDelete = (await deleteRes.json()) as { photos: { id: string }[] };
    expect(afterDelete.photos).toHaveLength(1);
    expect(afterDelete.photos[0]!.id).toBe(second!.id);
  });

  it('deleting a café removes its logo, cover and photo files', async () => {
    const cafeId = await createOwnedCafe();
    const logoRes = await ownerApp.request(`/api/cafes/${cafeId}/logo`, {
      method: 'POST',
      headers: { origin: ORIGIN },
      body: uploadForm(VALID_PNG_BYTES, 'logo.png'),
    });
    const { logoUrl } = (await logoRes.json()) as { logoUrl: string };

    const photoRes = await ownerApp.request(`/api/cafes/${cafeId}/photos`, {
      method: 'POST',
      headers: { origin: ORIGIN },
      body: uploadForm(VALID_PNG_BYTES, 'p.png'),
    });
    const { photos } = (await photoRes.json()) as { photos: { url: string }[] };
    const photoUrl = photos[0]!.url;

    const deleteRes = await maintainerApp.request(`/api/cafes/${cafeId}`, {
      method: 'DELETE',
      headers: { origin: ORIGIN },
    });
    expect(deleteRes.status).toBe(204);
    createdCafeIds.splice(createdCafeIds.indexOf(cafeId), 1);

    const logoGet = await maintainerApp.request(logoUrl);
    expect(logoGet.status).toBe(404);
    const photoGet = await maintainerApp.request(photoUrl);
    expect(photoGet.status).toBe(404);
  });
});
