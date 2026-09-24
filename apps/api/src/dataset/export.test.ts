import { readFile, readdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { eq, inArray } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { db, pool } from '../db/client.js';
import {
  cafeGames,
  cafes,
  categories,
  gameCategories,
  games,
  provinces,
  wards,
} from '../db/schema/index.js';
import { FORBIDDEN_PII_COLUMNS } from './columns.js';
import { exportDataset } from './export.js';

const suffix = Date.now();
const PROVINCE = { code: `p6-t-${suffix}`, name: 'Tỉnh Dataset', slug: `p6-tinh-${suffix}` };
const WARD = {
  code: `p6-w-${suffix}`,
  provinceCode: PROVINCE.code,
  name: 'Phường Dataset',
  slug: `p6-phuong-${suffix}`,
};

const gameIds: string[] = [];
const categoryIds: string[] = [];
const cafeIds: string[] = [];

beforeAll(async () => {
  await db.insert(provinces).values(PROVINCE).onConflictDoNothing();
  await db.insert(wards).values(WARD).onConflictDoNothing();

  const [category] = await db
    .insert(categories)
    .values({ name: `Strategy ${suffix}`, nameVi: 'Chiến thuật', kind: 'category' })
    .returning();
  categoryIds.push(category!.id);

  const [ccGame, permGame] = await db
    .insert(games)
    .values([
      {
        slug: `ma-soi-${suffix}`,
        nameEn: `Werewolf ${suffix}`,
        nameVi: 'Ma Sói',
        descriptionVi: 'Mô tả cộng đồng',
        descriptionSource: 'original',
        descriptionLicense: 'CC-BY-SA-4.0',
      },
      {
        slug: `perm-only-${suffix}`,
        nameEn: `Permission Only ${suffix}`,
        descriptionVi: 'Không được xuất',
        descriptionSource: 'translated_with_permission',
        descriptionLicense: 'permission-only',
        descriptionRightsHolder: 'NPH X',
        descriptionPermissionRef: 'email-2026-01-01',
      },
    ])
    .returning();
  gameIds.push(ccGame!.id, permGame!.id);

  await db.insert(gameCategories).values({ gameId: ccGame!.id, categoryId: category!.id });

  const [grantedCafe, pendingCafe] = await db
    .insert(cafes)
    .values([
      {
        slug: `quan-mo-${suffix}`,
        name: 'Quán Mở',
        provinceCode: PROVINCE.code,
        wardCode: WARD.code,
        addressLine: '123 Test',
        consentStatus: 'granted',
        consentNote: 'note không được xuất',
      },
      {
        slug: `quan-cho-duyet-${suffix}`,
        name: 'Quán Chờ Duyệt',
        provinceCode: PROVINCE.code,
        wardCode: WARD.code,
        addressLine: '456 Test',
        consentStatus: 'pending',
      },
    ])
    .returning();
  cafeIds.push(grantedCafe!.id, pendingCafe!.id);

  await db.insert(cafeGames).values([
    { cafeId: grantedCafe!.id, gameId: ccGame!.id, copies: 2 },
    { cafeId: pendingCafe!.id, gameId: ccGame!.id, copies: 1 },
  ]);
});

afterAll(async () => {
  await db.delete(cafeGames).where(inArray(cafeGames.cafeId, cafeIds));
  await db.delete(cafes).where(inArray(cafes.id, cafeIds));
  await db.delete(gameCategories).where(inArray(gameCategories.gameId, gameIds));
  await db.delete(games).where(inArray(games.id, gameIds));
  await db.delete(categories).where(inArray(categories.id, categoryIds));
  await db.delete(wards).where(eq(wards.code, WARD.code));
  await db.delete(provinces).where(eq(provinces.code, PROVINCE.code));
  await pool.end();
});

async function listFilesRecursive(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...(await listFilesRecursive(path)));
    else files.push(path);
  }
  return files.sort();
}

describe('dataset export', () => {
  it('is byte-identical across two runs', async () => {
    const dirA = `/tmp/onboard-dataset-test-a-${suffix}`;
    const dirB = `/tmp/onboard-dataset-test-b-${suffix}`;
    await exportDataset(dirA);
    await exportDataset(dirB);

    const filesA = (await listFilesRecursive(dirA)).map((f) => f.slice(dirA.length));
    const filesB = (await listFilesRecursive(dirB)).map((f) => f.slice(dirB.length));
    expect(filesA).toEqual(filesB);

    for (const rel of filesA) {
      const [a, b] = await Promise.all([
        readFile(join(dirA, rel), 'utf8'),
        readFile(join(dirB, rel), 'utf8'),
      ]);
      expect(a).toBe(b);
    }

    await rm(dirA, { recursive: true, force: true });
    await rm(dirB, { recursive: true, force: true });
  });

  it('excludes pending cafes and permission-only descriptions, and leaks no PII', async () => {
    const dir = `/tmp/onboard-dataset-test-c-${suffix}`;
    await exportDataset(dir);

    const cafesCsv = await readFile(join(dir, 'cafes/cafes.csv'), 'utf8');
    expect(cafesCsv).toContain(`quan-mo-${suffix}`);
    expect(cafesCsv).not.toContain(`quan-cho-duyet-${suffix}`);

    const cafeGamesCsv = await readFile(join(dir, 'cafes/cafe_games.csv'), 'utf8');
    expect(cafeGamesCsv).not.toContain(`quan-cho-duyet-${suffix}`);

    const descriptionsCsv = await readFile(join(dir, 'descriptions/games.csv'), 'utf8');
    expect(descriptionsCsv).toContain(`ma-soi-${suffix}`);
    expect(descriptionsCsv).not.toContain(`perm-only-${suffix}`);

    const allFiles = await listFilesRecursive(dir);
    for (const file of allFiles) {
      if (!file.endsWith('.csv') && !file.endsWith('.json')) continue;
      const content = await readFile(file, 'utf8');
      const header = content.split('\n')[0] ?? '';
      for (const forbidden of FORBIDDEN_PII_COLUMNS) {
        expect(header).not.toContain(forbidden);
      }
      expect(content).not.toContain('note không được xuất');
    }

    await rm(dir, { recursive: true, force: true });
  });
});
