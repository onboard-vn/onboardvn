import { count, eq, inArray } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { db, pool } from '../db/client.js';
import { cafes, categories, games, provinces, wards } from '../db/schema/index.js';
import { importCafesCsv, importCategoriesCsv, importGamesCsv } from './import.js';

const suffix = Date.now();
const categoryName = `Party ${suffix}`;
const createdGameIds: string[] = [];

const PROVINCE = { code: `ds-p-${suffix}`, name: `Tỉnh DS ${suffix}`, slug: `ds-tinh-${suffix}` };
const WARD = {
  code: `ds-w-${suffix}`,
  provinceCode: PROVINCE.code,
  name: `Phường DS ${suffix}`,
  slug: `ds-phuong-${suffix}`,
};
const createdCafeSlugs: string[] = [];

beforeAll(async () => {
  await db.insert(categories).values({ name: categoryName, kind: 'category' });
  await db.insert(provinces).values(PROVINCE).onConflictDoNothing();
  await db.insert(wards).values(WARD).onConflictDoNothing();
});

afterAll(async () => {
  if (createdGameIds.length > 0) {
    await db.delete(games).where(eq(games.slug, `dataset-import-${suffix}`));
  }
  if (createdCafeSlugs.length > 0) {
    await db.delete(cafes).where(inArray(cafes.slug, createdCafeSlugs));
  }
  await db.delete(wards).where(eq(wards.code, WARD.code));
  await db.delete(provinces).where(eq(provinces.code, PROVINCE.code));
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

describe('dataset import - categories', () => {
  const newName = `DS Category ${suffix}`;
  const newNames: string[] = [];

  afterAll(async () => {
    if (newNames.length > 0) {
      await db.delete(categories).where(inArray(categories.name, newNames));
    }
  });

  it('dry-run never writes to the database', async () => {
    const csv = `name,nameVi,kind,bggId\n${newName},Thể Loại DS,category,`;

    const result = await importCategoriesCsv(csv, { apply: false });

    expect(result.errors).toEqual([]);
    expect(result.created).toBe(1);
    expect(result.applied).toBe(false);
    const existing = await db.query.categories.findFirst({ where: eq(categories.name, newName) });
    expect(existing).toBeUndefined();
  });

  it('--apply creates the row, and re-apply updates it idempotently without duplicating', async () => {
    newNames.push(newName);
    const csv = `name,nameVi,kind,bggId\n${newName},Thể Loại DS,category,`;

    const createResult = await importCategoriesCsv(csv, { apply: true });
    expect(createResult.errors).toEqual([]);
    expect(createResult.rows).toEqual([{ line: 2, name: newName, action: 'create' }]);

    const updateCsv = `name,nameVi,kind,bggId\n${newName},Thể Loại DS Mới,category,`;
    const updateResult = await importCategoriesCsv(updateCsv, { apply: true });
    expect(updateResult.errors).toEqual([]);
    expect(updateResult.rows).toEqual([{ line: 2, name: newName, action: 'update' }]);

    const rows = await db.select().from(categories).where(eq(categories.name, newName));
    expect(rows).toHaveLength(1);
    expect(rows[0]?.nameVi).toBe('Thể Loại DS Mới');
  });
});

describe('dataset import - cafes', () => {
  const cafeSlug = `ds-cafe-${suffix}`;

  it('dry-run never writes to the database', async () => {
    const csv = `slug,name,provinceCode,wardCode,addressLine,legacyDistrict,lat,lng,links,sourceUrl,consentStatus\n${cafeSlug},Cafe DS,${PROVINCE.code},${WARD.code},123 Test St,,,,,https://example.com/source,public_info_only`;

    const result = await importCafesCsv(csv, { apply: false });

    expect(result.errors).toEqual([]);
    expect(result.created).toBe(1);
    expect(result.applied).toBe(false);
    const existing = await db.query.cafes.findFirst({ where: eq(cafes.slug, cafeSlug) });
    expect(existing).toBeUndefined();
  });

  it('--apply creates, re-apply is idempotent, and an invalid ward reports an error line', async () => {
    createdCafeSlugs.push(cafeSlug);
    const csv = `slug,name,provinceCode,wardCode,addressLine,legacyDistrict,lat,lng,links,sourceUrl,consentStatus\n${cafeSlug},Cafe DS,${PROVINCE.code},${WARD.code},123 Test St,,,,,https://example.com/source,public_info_only`;

    const createResult = await importCafesCsv(csv, { apply: true });
    expect(createResult.errors).toEqual([]);
    expect(createResult.rows).toEqual([{ line: 2, slug: cafeSlug, action: 'create' }]);

    const updateResult = await importCafesCsv(csv, { apply: true });
    expect(updateResult.errors).toEqual([]);
    expect(updateResult.rows).toEqual([{ line: 2, slug: cafeSlug, action: 'update' }]);

    const rows = await db.select().from(cafes).where(eq(cafes.slug, cafeSlug));
    expect(rows).toHaveLength(1);

    const badWardCsv = `slug,name,provinceCode,wardCode,addressLine,legacyDistrict,lat,lng,links,sourceUrl,consentStatus\n${cafeSlug},Cafe DS,${PROVINCE.code},not-a-ward,123 Test St,,,,,https://example.com/source,public_info_only`;
    const badResult = await importCafesCsv(badWardCsv, { apply: false });
    expect(badResult.errors).toEqual([
      { line: 2, field: 'wardCode', message: 'không thuộc tỉnh/thành đã chọn' },
    ]);
  });

  it('never downgrades a granted café back to public_info_only', async () => {
    const grantedSlug = `ds-cafe-granted-${suffix}`;
    createdCafeSlugs.push(grantedSlug);
    const createCsv = `slug,name,provinceCode,wardCode,addressLine,legacyDistrict,lat,lng,links,sourceUrl,consentStatus\n${grantedSlug},Cafe Granted,${PROVINCE.code},${WARD.code},123 Test St,,,,,,granted`;
    const createResult = await importCafesCsv(createCsv, { apply: true });
    expect(createResult.errors).toEqual([]);
    expect(createResult.rows).toEqual([{ line: 2, slug: grantedSlug, action: 'create' }]);

    const downgradeCsv = `slug,name,provinceCode,wardCode,addressLine,legacyDistrict,lat,lng,links,sourceUrl,consentStatus\n${grantedSlug},Cafe Granted,${PROVINCE.code},${WARD.code},123 Test St,,,,,https://example.com/source,public_info_only`;
    const downgradeResult = await importCafesCsv(downgradeCsv, { apply: true });
    expect(downgradeResult.errors).toEqual([]);
    expect(downgradeResult.rows).toEqual([{ line: 2, slug: grantedSlug, action: 'skip' }]);

    const row = await db.query.cafes.findFirst({ where: eq(cafes.slug, grantedSlug) });
    expect(row?.consentStatus).toBe('granted');
  });

  it('never republishes a declined café', async () => {
    const declinedSlug = `ds-cafe-declined-${suffix}`;
    createdCafeSlugs.push(declinedSlug);
    const createCsv = `slug,name,provinceCode,wardCode,addressLine,legacyDistrict,lat,lng,links,sourceUrl,consentStatus\n${declinedSlug},Cafe Declined,${PROVINCE.code},${WARD.code},123 Test St,,,,,https://example.com/source,declined`;
    const createResult = await importCafesCsv(createCsv, { apply: true });
    expect(createResult.errors).toEqual([]);
    expect(createResult.rows).toEqual([{ line: 2, slug: declinedSlug, action: 'create' }]);

    const republishCsv = `slug,name,provinceCode,wardCode,addressLine,legacyDistrict,lat,lng,links,sourceUrl,consentStatus\n${declinedSlug},Cafe Declined,${PROVINCE.code},${WARD.code},123 Test St,,,,,https://example.com/source,public_info_only`;
    const republishResult = await importCafesCsv(republishCsv, { apply: true });
    expect(republishResult.errors).toEqual([]);
    expect(republishResult.rows).toEqual([{ line: 2, slug: declinedSlug, action: 'skip' }]);

    const row = await db.query.cafes.findFirst({ where: eq(cafes.slug, declinedSlug) });
    expect(row?.consentStatus).toBe('declined');
  });

  it('imports venueType, feeModel, amenities and structured openingHours', async () => {
    const slug = `ds-cafe-venue-${suffix}`;
    createdCafeSlugs.push(slug);
    const amenities = JSON.stringify({ byogAllowed: true, wifi: true });
    const openingHours = JSON.stringify({ mon: [{ open: '08:00', close: '22:00' }] });
    const header =
      'slug,name,provinceCode,wardCode,addressLine,legacyDistrict,lat,lng,links,sourceUrl,consentStatus,venueType,feeModel,feeNote,amenities,openingHours';
    const csv = `${header}\n${slug},Cafe Venue,${PROVINCE.code},${WARD.code},123 Test St,,,,,,granted,byog_cafe,free,Miễn phí ngồi,"${amenities.replaceAll('"', '""')}","${openingHours.replaceAll('"', '""')}"`;

    const result = await importCafesCsv(csv, { apply: true });
    expect(result.errors).toEqual([]);
    expect(result.rows).toEqual([{ line: 2, slug, action: 'create' }]);

    const row = await db.query.cafes.findFirst({ where: eq(cafes.slug, slug) });
    expect(row?.venueType).toBe('byog_cafe');
    expect(row?.feeModel).toBe('free');
    expect(row?.feeNote).toBe('Miễn phí ngồi');
    expect(row?.amenities).toEqual({ byogAllowed: true, wifi: true });
    expect(row?.openingHours).toEqual({ mon: [{ open: '08:00', close: '22:00' }] });
  });
});
