import type {
  CafeCreateInput,
  CafeGameAddedVia,
  CafeLinks,
  CafeOpeningHours,
  CafeUpdateInput,
  VenueType,
} from '@onboard/shared';
import { and, asc, count, eq, gte, inArray, isNotNull, lte, ne, type SQL, sql } from 'drizzle-orm';
import { db } from '../../db/client.js';
import { cafeGames, cafePhotos, cafes, games, provinces, wards } from '../../db/schema/index.js';
import { ApiError } from '../../lib/errors.js';
import { publicCafeWhere } from './visibility.js';

export type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export interface CafeListFilter {
  q?: string;
  provinceCode?: string;
  wardCodes?: string[];
  venueType?: VenueType;
  byog?: boolean;
  food?: boolean;
  privateRoom?: boolean;
  largeTables?: boolean;
  /** feeModel in ('free', 'with_drink'). */
  free?: boolean;
}

/** Tri-state containment filter: `true`/`false` match rows explicitly set that way; unset only
 * matches when `value` is `undefined` (filter not requested). */
function amenityFilter(
  field: 'byogAllowed' | 'foodAvailable' | 'privateRoom' | 'largeTables',
  value: boolean | undefined,
): SQL | undefined {
  if (value === undefined) return undefined;
  return sql`${cafes.amenities} @> ${JSON.stringify({ [field]: value })}::jsonb`;
}

export interface CafeListOptions {
  /** Staff-only: include cafés awaiting consent, which are otherwise never public. */
  includePending?: boolean;
  /** Staff-only: also match `public_info_only` cafés against attribute filters (see below). */
  showAll?: boolean;
}

export type CafeFullRow = NonNullable<Awaited<ReturnType<typeof findCafeFullById>>>;

const ATTRIBUTE_FILTER_KEYS = [
  'venueType',
  'byog',
  'food',
  'privateRoom',
  'largeTables',
  'free',
] as const;

function buildWhere(
  filter: CafeListFilter,
  opts: CafeListOptions,
  extra: (SQL | undefined)[] = [],
) {
  const conditions = [
    amenityFilter('byogAllowed', filter.byog),
    amenityFilter('foodAvailable', filter.food),
    amenityFilter('privateRoom', filter.privateRoom),
    amenityFilter('largeTables', filter.largeTables),
    ...extra,
  ].filter((c): c is SQL => c !== undefined);
  if (!opts.includePending) conditions.push(publicCafeWhere());
  if (filter.q) {
    conditions.push(
      sql`unaccent_immutable(${cafes.name}) ilike unaccent_immutable(${`%${filter.q}%`})`,
    );
  }
  if (filter.provinceCode) conditions.push(eq(cafes.provinceCode, filter.provinceCode));
  if (filter.wardCodes) conditions.push(inArray(cafes.wardCode, filter.wardCodes));
  if (filter.venueType) conditions.push(eq(cafes.venueType, filter.venueType));
  if (filter.free) conditions.push(inArray(cafes.feeModel, ['free', 'with_drink']));
  // A public_info_only café doesn't expose amenities/fee publicly, so it must never match an
  // attribute filter for a non-staff caller — only venueType is public for those cafés.
  const hasNonVenueTypeAttributeFilter = ATTRIBUTE_FILTER_KEYS.slice(1).some(
    (key) => filter[key] !== undefined,
  );
  if (!opts.showAll && hasNonVenueTypeAttributeFilter) {
    conditions.push(ne(cafes.consentStatus, 'public_info_only'));
  }
  return conditions.length ? and(...conditions) : undefined;
}

const cafeListSelection = {
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
  logoPath: cafes.logoPath,
  coverPath: cafes.coverPath,
  consentStatus: cafes.consentStatus,
  venueType: cafes.venueType,
  openingHours: cafes.openingHours,
  gameCount: sql<number>`count(${cafeGames.gameId})::int`,
} as const;

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
  links: CafeLinks | null;
  logoPath: string | null;
  coverPath: string | null;
  consentStatus: 'granted' | 'pending' | 'public_info_only' | 'declined';
  venueType: VenueType;
  openingHours: CafeOpeningHours | null;
  gameCount: number;
}

function selectCafeList(where: SQL | undefined) {
  return db
    .select(cafeListSelection)
    .from(cafes)
    .innerJoin(provinces, eq(provinces.code, cafes.provinceCode))
    .innerJoin(wards, eq(wards.code, cafes.wardCode))
    .leftJoin(cafeGames, eq(cafeGames.cafeId, cafes.id))
    .where(where)
    .groupBy(cafes.id, provinces.name, wards.name)
    .orderBy(sql`count(${cafeGames.gameId}) desc`, asc(cafes.name));
}

export async function listCafes(
  filter: CafeListFilter,
  page: number,
  pageSize: number,
  opts: CafeListOptions = {},
): Promise<{ rows: CafeListRow[]; total: number }> {
  const where = buildWhere(filter, opts);

  const [rows, totalRows] = await Promise.all([
    selectCafeList(where)
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    db.select({ total: count() }).from(cafes).where(where),
  ]);

  return { rows, total: totalRows[0]?.total ?? 0 };
}

/** Unpaginated variant for the `openNow` filter (evaluated in JS per row by the service). */
const OPEN_NOW_CANDIDATE_CAP = 1000; // dataset is small; caps worst-case JS work per request.
export async function listAllCafesForFilter(
  filter: CafeListFilter,
  opts: CafeListOptions = {},
): Promise<CafeListRow[]> {
  return selectCafeList(buildWhere(filter, opts)).limit(OPEN_NOW_CANDIDATE_CAP);
}

const inventoryGameWith = {
  with: { game: { with: { categories: { with: { category: true as const } } } } },
};

export function findCafeFullBySlug(slug: string) {
  return db.query.cafes.findFirst({
    where: eq(cafes.slug, slug),
    with: {
      province: true,
      ward: true,
      inventory: inventoryGameWith,
      photos: { orderBy: [asc(cafePhotos.sortOrder)] },
    },
  });
}

export function findCafeFullById(id: string) {
  return db.query.cafes.findFirst({
    where: eq(cafes.id, id),
    with: {
      province: true,
      ward: true,
      inventory: inventoryGameWith,
      photos: { orderBy: [asc(cafePhotos.sortOrder)] },
    },
  });
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
    ...(input.venueType !== undefined && { venueType: input.venueType }),
    ...(input.amenities !== undefined && { amenities: input.amenities }),
    ...(input.feeModel !== undefined && { feeModel: input.feeModel }),
    ...(input.feeNote !== undefined && { feeNote: input.feeNote }),
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
      ...(input.venueType !== undefined && { venueType: input.venueType }),
      ...(input.amenities !== undefined && { amenities: input.amenities }),
      ...(input.feeModel !== undefined && { feeModel: input.feeModel }),
      ...(input.feeNote !== undefined && { feeNote: input.feeNote }),
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

export async function cafeExists(id: string): Promise<boolean> {
  const [row] = await db.select({ id: cafes.id }).from(cafes).where(eq(cafes.id, id)).limit(1);
  return Boolean(row);
}

/** Cafés table row only — no inventory/photos join — for callers that just need core columns
 * (e.g. merging PATCH input against current values). */
export function findCafeRowById(id: string) {
  return db.query.cafes.findFirst({ where: eq(cafes.id, id) });
}

export function findCafeMediaPaths(id: string) {
  return db.query.cafes.findFirst({
    where: eq(cafes.id, id),
    columns: { id: true, logoPath: true, coverPath: true },
  });
}

export async function updateCafeMediaPath(
  id: string,
  field: 'logoPath' | 'coverPath',
  path: string | null,
): Promise<void> {
  await db
    .update(cafes)
    .set({ [field]: path })
    .where(eq(cafes.id, id));
}

/** Serializes photo-count-then-insert per café with `SELECT ... FOR UPDATE` on the café row, so
 * two concurrent uploads can never both pass the cap check and land the café over it. */
export async function lockCafeAndInsertPhoto(
  cafeId: string,
  maxCount: number,
  values: { cafeId: string; path: string; caption: string | null; uploadedBy: string },
): Promise<void> {
  await db.transaction(async (tx) => {
    await tx.execute(sql`select id from ${cafes} where id = ${cafeId} for update`);

    const countRows = await tx
      .select({ total: count() })
      .from(cafePhotos)
      .where(eq(cafePhotos.cafeId, cafeId));
    const total = countRows[0]?.total ?? 0;
    if (total >= maxCount) {
      throw new ApiError('VALIDATION_FAILED', 422, `Chỉ được tối đa ${maxCount} ảnh`);
    }

    await tx.insert(cafePhotos).values({ ...values, sortOrder: total });
  });
}

export function findCafePhoto(id: string) {
  return db.query.cafePhotos.findFirst({ where: eq(cafePhotos.id, id) });
}

export function listCafePhotos(cafeId: string) {
  return db.query.cafePhotos.findMany({
    where: eq(cafePhotos.cafeId, cafeId),
    orderBy: asc(cafePhotos.sortOrder),
  });
}

export async function listCafePhotoPaths(cafeId: string): Promise<string[]> {
  const rows = await db
    .select({ path: cafePhotos.path })
    .from(cafePhotos)
    .where(eq(cafePhotos.cafeId, cafeId));
  return rows.map((r) => r.path);
}

export async function deleteCafePhoto(id: string): Promise<void> {
  await db.delete(cafePhotos).where(eq(cafePhotos.id, id));
}

export interface CafeMapFilter extends CafeListFilter {
  gameSlug?: string;
  bbox?: { minLng: number; minLat: number; maxLng: number; maxLat: number };
}

export interface CafeMapPinRow {
  slug: string;
  name: string;
  lat: string;
  lng: string;
  venueType: VenueType;
  consentStatus: 'granted' | 'pending' | 'public_info_only' | 'declined';
  openingHours: CafeOpeningHours | null;
}

const MAP_PIN_CAP = 2000;

function gameSlugCondition(gameSlug: string | undefined): SQL | undefined {
  if (!gameSlug) return undefined;
  return sql`exists (
    select 1 from ${cafeGames}
    inner join ${games} on ${games.id} = ${cafeGames.gameId}
    where ${cafeGames.cafeId} = ${cafes.id} and ${games.slug} = ${gameSlug}
  )`;
}

function bboxConditions(bbox: CafeMapFilter['bbox']): SQL[] {
  if (!bbox) return [];
  return [
    gte(cafes.lat, bbox.minLat.toString()),
    lte(cafes.lat, bbox.maxLat.toString()),
    gte(cafes.lng, bbox.minLng.toString()),
    lte(cafes.lng, bbox.maxLng.toString()),
  ];
}

/** Lightweight pins for `/map` — same public/attribute filters as {@link listCafes}, plus
 * coordinates required (no pin without a lat/lng), an optional `gameSlug` and viewport bbox.
 * Ordered `granted` cafés first then by name so the {@link MAP_PIN_CAP} cutoff is deterministic
 * rather than whatever order Postgres happens to return. `openNow` (JS-only, see service.ts)
 * filters this already-capped set rather than an unbounded one — an acceptable trade-off at the
 * current dataset size; revisit (like {@link listAllCafesForFilter}'s own cap) if it grows. */
export function listCafeMapPins(
  filter: CafeMapFilter,
  opts: CafeListOptions = {},
): Promise<CafeMapPinRow[]> {
  const where = buildWhere(filter, opts, [
    isNotNull(cafes.lat),
    isNotNull(cafes.lng),
    gameSlugCondition(filter.gameSlug),
    ...bboxConditions(filter.bbox),
  ]);
  return db
    .select({
      slug: cafes.slug,
      name: cafes.name,
      lat: cafes.lat,
      lng: cafes.lng,
      venueType: cafes.venueType,
      consentStatus: cafes.consentStatus,
      openingHours: cafes.openingHours,
    })
    .from(cafes)
    .where(where)
    .orderBy(sql`(${cafes.consentStatus} = 'granted') desc`, asc(cafes.name))
    .limit(MAP_PIN_CAP) as Promise<CafeMapPinRow[]>;
}

export async function reorderCafePhotos(cafeId: string, photoIds: string[]): Promise<void> {
  await db.transaction(async (tx) => {
    for (const [index, photoId] of photoIds.entries()) {
      await tx
        .update(cafePhotos)
        .set({ sortOrder: index })
        .where(and(eq(cafePhotos.id, photoId), eq(cafePhotos.cafeId, cafeId)));
    }
  });
}
