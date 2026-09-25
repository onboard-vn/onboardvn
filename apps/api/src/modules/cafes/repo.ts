import type { CafeCreateInput, CafeGameAddedVia, CafeUpdateInput } from '@onboard/shared';
import { and, asc, count, eq, inArray, ne, sql } from 'drizzle-orm';
import { db } from '../../db/client.js';
import { cafeGames, cafes, games, provinces, wards } from '../../db/schema/index.js';

export type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export interface CafeListFilter {
  provinceCode?: string;
  wardCodes?: string[];
}

export interface CafeListOptions {
  /** Staff-only: include cafés awaiting consent, which are otherwise never public. */
  includePending?: boolean;
}

const cafeWithRelations = {
  province: true,
  ward: true,
  inventory: { with: { game: true } },
} as const;

export type CafeFullRow = NonNullable<Awaited<ReturnType<typeof findCafeFullById>>>;

function buildWhere(filter: CafeListFilter, includePending: boolean | undefined) {
  const conditions = [];
  if (!includePending) conditions.push(ne(cafes.consentStatus, 'pending'));
  if (filter.provinceCode) conditions.push(eq(cafes.provinceCode, filter.provinceCode));
  if (filter.wardCodes) conditions.push(inArray(cafes.wardCode, filter.wardCodes));
  return conditions.length ? and(...conditions) : undefined;
}

export interface CafeListRow {
  id: string;
  slug: string;
  name: string;
  provinceCode: string;
  provinceName: string;
  wardCode: string;
  wardName: string;
  addressLine: string;
  legacyDistrict: string | null;
  lat: string | null;
  lng: string | null;
  links: { fanpage?: string; maps?: string } | null;
  consentStatus: 'granted' | 'pending' | 'public_info_only';
  gameCount: number;
}

export async function listCafes(
  filter: CafeListFilter,
  page: number,
  pageSize: number,
  opts: CafeListOptions = {},
): Promise<{ rows: CafeListRow[]; total: number }> {
  const where = buildWhere(filter, opts.includePending);

  const [rows, totalRows] = await Promise.all([
    db
      .select({
        id: cafes.id,
        slug: cafes.slug,
        name: cafes.name,
        provinceCode: cafes.provinceCode,
        provinceName: provinces.name,
        wardCode: cafes.wardCode,
        wardName: wards.name,
        addressLine: cafes.addressLine,
        legacyDistrict: cafes.legacyDistrict,
        lat: cafes.lat,
        lng: cafes.lng,
        links: cafes.links,
        consentStatus: cafes.consentStatus,
        gameCount: sql<number>`count(${cafeGames.gameId})::int`,
      })
      .from(cafes)
      .innerJoin(provinces, eq(provinces.code, cafes.provinceCode))
      .innerJoin(wards, eq(wards.code, cafes.wardCode))
      .leftJoin(cafeGames, eq(cafeGames.cafeId, cafes.id))
      .where(where)
      .groupBy(cafes.id, provinces.name, wards.name)
      .orderBy(sql`count(${cafeGames.gameId}) desc`, asc(cafes.name))
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    db.select({ total: count() }).from(cafes).where(where),
  ]);

  return { rows, total: totalRows[0]?.total ?? 0 };
}

export function findCafeFullBySlug(slug: string) {
  return db.query.cafes.findFirst({ where: eq(cafes.slug, slug), with: cafeWithRelations });
}

export function findCafeFullById(id: string) {
  return db.query.cafes.findFirst({ where: eq(cafes.id, id), with: cafeWithRelations });
}

export async function slugExists(slug: string): Promise<boolean> {
  const [row] = await db.select({ id: cafes.id }).from(cafes).where(eq(cafes.slug, slug)).limit(1);
  return Boolean(row);
}

export async function findAvailableSlug(base: string): Promise<string> {
  let candidate = base || 'quan';
  let suffix = 1;
  while (await slugExists(candidate)) {
    suffix += 1;
    candidate = `${base}-${suffix}`;
  }
  return candidate;
}

function toCafeValues(input: CafeUpdateInput) {
  return {
    ...(input.name !== undefined && { name: input.name }),
    ...(input.provinceCode !== undefined && { provinceCode: input.provinceCode }),
    ...(input.wardCode !== undefined && { wardCode: input.wardCode }),
    ...(input.addressLine !== undefined && { addressLine: input.addressLine }),
    ...(input.legacyDistrict !== undefined && { legacyDistrict: input.legacyDistrict }),
    ...(input.lat !== undefined && { lat: input.lat === null ? null : input.lat.toFixed(6) }),
    ...(input.lng !== undefined && { lng: input.lng === null ? null : input.lng.toFixed(6) }),
    ...(input.openingHours !== undefined && { openingHours: input.openingHours }),
    ...(input.links !== undefined && { links: input.links }),
    ...(input.sourceUrl !== undefined && { sourceUrl: input.sourceUrl }),
    ...(input.consentStatus !== undefined && { consentStatus: input.consentStatus }),
    ...(input.consentNote !== undefined && { consentNote: input.consentNote }),
  };
}

export async function insertCafe(
  input: CafeCreateInput & { slug: string; createdBy: string | null },
  tx: Tx | typeof db = db,
) {
  const [row] = await tx
    .insert(cafes)
    .values({
      slug: input.slug,
      createdBy: input.createdBy,
      name: input.name,
      provinceCode: input.provinceCode,
      wardCode: input.wardCode,
      addressLine: input.addressLine,
      legacyDistrict: input.legacyDistrict,
      lat: input.lat !== undefined ? input.lat.toFixed(6) : undefined,
      lng: input.lng !== undefined ? input.lng.toFixed(6) : undefined,
      openingHours: input.openingHours,
      links: input.links,
      sourceUrl: input.sourceUrl,
      consentStatus: input.consentStatus,
      consentNote: input.consentNote,
    })
    .returning();
  return row!;
}

export async function updateCafeRow(id: string, input: CafeUpdateInput, tx: Tx | typeof db = db) {
  const values = toCafeValues(input);
  if (Object.keys(values).length === 0) {
    return tx.query.cafes.findFirst({ where: eq(cafes.id, id) });
  }
  const [row] = await tx.update(cafes).set(values).where(eq(cafes.id, id)).returning();
  return row;
}

export async function deleteCafeRow(id: string): Promise<void> {
  await db.delete(cafes).where(eq(cafes.id, id));
}

export async function gameExists(gameId: string): Promise<boolean> {
  const [row] = await db.select({ id: games.id }).from(games).where(eq(games.id, gameId)).limit(1);
  return Boolean(row);
}

export async function gameIdsExist(ids: string[]): Promise<boolean> {
  if (ids.length === 0) return true;
  const rows = await db.select({ id: games.id }).from(games).where(inArray(games.id, ids));
  return rows.length === ids.length;
}

export function findCafeGame(cafeId: string, gameId: string) {
  return db.query.cafeGames.findFirst({
    where: and(eq(cafeGames.cafeId, cafeId), eq(cafeGames.gameId, gameId)),
  });
}

export async function insertCafeGame(
  values: typeof cafeGames.$inferInsert,
  tx: Tx | typeof db = db,
): Promise<void> {
  await tx.insert(cafeGames).values(values);
}

export async function updateCafeGameCopies(
  cafeId: string,
  gameId: string,
  copies: number,
  tx: Tx | typeof db = db,
): Promise<void> {
  await tx
    .update(cafeGames)
    .set({ copies })
    .where(and(eq(cafeGames.cafeId, cafeId), eq(cafeGames.gameId, gameId)));
}

export async function deleteCafeGame(cafeId: string, gameId: string): Promise<void> {
  await db.delete(cafeGames).where(and(eq(cafeGames.cafeId, cafeId), eq(cafeGames.gameId, gameId)));
}

export async function bulkInsertCafeGames(
  cafeId: string,
  gameIds: string[],
  addedBy: string,
  addedVia: CafeGameAddedVia,
): Promise<{ added: number; skipped: number }> {
  return db.transaction(async (tx) => {
    const existing = await tx
      .select({ gameId: cafeGames.gameId })
      .from(cafeGames)
      .where(and(eq(cafeGames.cafeId, cafeId), inArray(cafeGames.gameId, gameIds)));
    const existingIds = new Set(existing.map((r) => r.gameId));
    const toInsert = gameIds.filter((id) => !existingIds.has(id));

    if (toInsert.length > 0) {
      await tx
        .insert(cafeGames)
        .values(toInsert.map((gameId) => ({ cafeId, gameId, addedBy, addedVia })));
    }

    return { added: toInsert.length, skipped: gameIds.length - toInsert.length };
  });
}

export function findCafesForGame(gameId: string) {
  return db.query.cafeGames.findMany({
    where: eq(cafeGames.gameId, gameId),
    with: { cafe: { with: { province: true, ward: true } } },
  });
}
