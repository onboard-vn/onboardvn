import { count, eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { db, pool } from '../db/client.js';
import { categories, games } from '../db/schema/index.js';
import { importGamesCsv } from './import.js';

const suffix = Date.now();
const categoryName = `Party ${suffix}`;
const createdGameIds: string[] = [];

beforeAll(async () => {
  await db.insert(categories).values({ name: categoryName, kind: 'category' });
});

afterAll(async () => {
  if (createdGameIds.length > 0) {
    await db.delete(games).where(eq(games.slug, `dataset-import-${suffix}`));
  }
  await db.delete(categories).where(eq(categories.name, categoryName));
  await pool.end();
});

async function gameCount(): Promise<number> {
  const [row] = await db.select({ n: count() }).from(games);
  return row?.n ?? 0;
}

describe('dataset import', () => {
  it('dry-run never writes to the database', async () => {
    const csv = `slug,nameVi,nameEn,minPlayers,maxPlayers,playMinutes,weight,minAge,isVietnamese,bggId,categories,videoUrls\ndataset-import-${suffix},Trò Chơi Test,Test Game ${suffix},2,4,30,2.0,10,false,,${categoryName},`;
    const before = await gameCount();

    const result = await importGamesCsv(csv, { apply: false });

    expect(result.errors).toEqual([]);
    expect(result.created).toBe(1);
    expect(result.applied).toBe(false);
    expect(await gameCount()).toBe(before);
  });

  it('reports errors with line numbers, header counted as line 1', async () => {
    const csv = `slug,nameVi,nameEn,minPlayers,maxPlayers,playMinutes,weight,minAge,isVietnamese,bggId,categories,videoUrls\n,,,,,,,,,,,`;

    const result = await importGamesCsv(csv, { apply: false });

    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]?.line).toBe(2);
    expect(result.errors.some((e) => e.field === 'nameEn')).toBe(true);
  });

  it('rejects an unknown category by name', async () => {
    const csv = `slug,nameVi,nameEn,minPlayers,maxPlayers,playMinutes,weight,minAge,isVietnamese,bggId,categories,videoUrls\n,,Some Game ${suffix},,,,,,,,Không Tồn Tại ${suffix},`;

    const result = await importGamesCsv(csv, { apply: false });

    expect(result.errors.some((e) => e.field === 'categories')).toBe(true);
  });

  it('--apply creates the row and links the category', async () => {
    const csv = `slug,nameVi,nameEn,minPlayers,maxPlayers,playMinutes,weight,minAge,isVietnamese,bggId,categories,videoUrls\ndataset-import-${suffix},Trò Chơi Test,Test Game ${suffix},2,4,30,2.0,10,false,,${categoryName},`;

    const result = await importGamesCsv(csv, { apply: true });

    expect(result.errors).toEqual([]);
    expect(result.applied).toBe(true);
    const row = await db.query.games.findFirst({
      where: eq(games.slug, `dataset-import-${suffix}`),
    });
    expect(row).toBeDefined();
    if (row) createdGameIds.push(row.id);
  });

  it('an update row with blank categories/videoUrls columns leaves existing values untouched', async () => {
    const slug = `dataset-import-preserve-${suffix}`;
    const createCsv = `slug,nameVi,nameEn,minPlayers,maxPlayers,playMinutes,weight,minAge,isVietnamese,bggId,categories,videoUrls\n${slug},,Preserve Test ${suffix},,,,,,,,${categoryName},https://www.youtube.com/watch?v=abc`;
    const createResult = await importGamesCsv(createCsv, { apply: true });
    expect(createResult.errors).toEqual([]);
    const created = await db.query.games.findFirst({
      where: eq(games.slug, slug),
      with: { categories: true },
    });
    expect(created).toBeDefined();
    if (created) createdGameIds.push(created.id);
    expect(created?.videoUrls).toEqual(['https://www.youtube.com/watch?v=abc']);
    expect(created?.categories).toHaveLength(1);

    const updateCsv = `slug,nameVi,nameEn,minPlayers,maxPlayers,playMinutes,weight,minAge,isVietnamese,bggId,categories,videoUrls\n${slug},Tên mới,Preserve Test ${suffix},,,,,,,,,`;
    const updateResult = await importGamesCsv(updateCsv, { apply: true });
    expect(updateResult.errors).toEqual([]);
    expect(updateResult.rows).toEqual([{ line: 2, slug, action: 'update' }]);

    const updated = await db.query.games.findFirst({
      where: eq(games.slug, slug),
      with: { categories: true },
    });
    expect(updated?.nameVi).toBe('Tên mới');
    expect(updated?.videoUrls).toEqual(['https://www.youtube.com/watch?v=abc']);
    expect(updated?.categories).toHaveLength(1);
  });

  it('reports the correct source line for a record spanning multiple physical lines', async () => {
    const csv =
      'slug,nameVi,nameEn,minPlayers,maxPlayers,playMinutes,weight,minAge,isVietnamese,bggId,categories,videoUrls\n' +
      `dataset-import-multiline-${suffix},"Dòng 1\nDòng 2",Multiline Test ${suffix},,,,,,,,,\n` +
      ',,,,,,,,,,,';

    const result = await importGamesCsv(csv, { apply: false });

    expect(result.errors.length).toBeGreaterThan(0);
    // Row 1 spans source lines 2-3 (quoted newline); row 2 is on line 4.
    expect(result.errors[0]?.line).toBe(4);
  });
});
