import type { GameFilter } from '@onboard/shared';
import { and, asc, count, desc, eq, exists, inArray, or, sql } from 'drizzle-orm';
import { db } from '../../db/client.js';
import { users } from '../../db/schema/auth.js';
import {
  cafeGames,
  cafes,
  categories,
  gameBarcodes,
  gameCategories,
  gameRevisions,
  games,
} from '../../db/schema/index.js';
import { publicCafeWhere } from '../cafes/visibility.js';

const withRelations = { categories: { with: { category: true } }, barcodes: true } as const;

export type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/** Runs `fn` inside `tx` if given, otherwise opens a new transaction. */
function withTx<T>(tx: Tx | undefined, fn: (tx: Tx) => Promise<T>): Promise<T> {
  return tx ? fn(tx) : db.transaction(fn);
}

export type GameRow = NonNullable<Awaited<ReturnType<typeof findGameBySlug>>>;

function buildWhere(filter: GameFilter) {
  const conditions = [];

  if (filter.q) {
    const pattern = `%${filter.q}%`;
    conditions.push(
      or(
        sql`unaccent_immutable(${games.nameEn}) ilike unaccent_immutable(${pattern})`,
        sql`unaccent_immutable(coalesce(${games.nameVi}, '')) ilike unaccent_immutable(${pattern})`,
      ),
    );
  }
  if (filter.players !== undefined) {
    conditions.push(
      sql`(${games.minPlayers} is null or ${games.minPlayers} <= ${filter.players})`,
      sql`(${games.maxPlayers} is null or ${games.maxPlayers} >= ${filter.players})`,
    );
  }
  if (filter.minPlayers !== undefined) {
    conditions.push(
      sql`(${games.maxPlayers} is null or ${games.maxPlayers} >= ${filter.minPlayers})`,
    );
  }
  if (filter.maxPlayers !== undefined) {
    conditions.push(
      sql`(${games.minPlayers} is null or ${games.minPlayers} <= ${filter.maxPlayers})`,
    );
  }
  if (filter.minTime !== undefined) {
    conditions.push(
      sql`(${games.playMinutes} is null or ${games.playMinutes} >= ${filter.minTime})`,
    );
  }
  if (filter.minWeight !== undefined) {
    conditions.push(sql`(${games.weight} is null or ${games.weight} >= ${filter.minWeight})`);
  }
  if (filter.maxTime !== undefined) {
    conditions.push(
      sql`(${games.playMinutes} is null or ${games.playMinutes} <= ${filter.maxTime})`,
    );
  }
  if (filter.maxWeight !== undefined) {
    conditions.push(sql`(${games.weight} is null or ${games.weight} <= ${filter.maxWeight})`);
  }
  if (filter.categoryId) {
    conditions.push(
      sql`exists (select 1 from game_categories gc where gc.game_id = ${games.id} and gc.category_id = ${filter.categoryId})`,
    );
  }

  if (filter.isVietnamese !== undefined) {
    conditions.push(eq(games.isVietnamese, filter.isVietnamese));
  }
  if (filter.sort === 'cafes') {
    conditions.push(
      exists(
        db
          .select({ id: cafeGames.gameId })
          .from(cafeGames)
          .innerJoin(cafes, eq(cafes.id, cafeGames.cafeId))
          .where(and(eq(cafeGames.gameId, games.id), publicCafeWhere())),
      ),
    );
  }

  return conditions.length ? and(...conditions) : undefined;
}

function buildOrderBy(filter: GameFilter) {
  if (filter.sort === 'name') return [asc(games.nameEn)];
  const publicCafeCount = db
    .select({ n: count() })
    .from(cafeGames)
    .innerJoin(cafes, eq(cafes.id, cafeGames.cafeId))
    .where(and(eq(cafeGames.gameId, games.id), publicCafeWhere()));
  return [desc(sql`(${publicCafeCount})`), asc(games.nameEn)];
}

export async function listGames(filter: GameFilter) {
  const where = buildWhere(filter);

  const [rows, totalRows] = await Promise.all([
    db.query.games.findMany({
      where,
      orderBy: buildOrderBy(filter),
      limit: filter.pageSize,
      offset: (filter.page - 1) * filter.pageSize,
      with: withRelations,
    }),
    db.select({ total: count() }).from(games).where(where),
  ]);

  return { rows, total: totalRows[0]?.total ?? 0 };
}

export function findGameBySlug(slug: string) {
  return db.query.games.findFirst({ where: eq(games.slug, slug), with: withRelations });
}

export function findGameById(id: string) {
  return db.query.games.findFirst({ where: eq(games.id, id), with: withRelations });
}

export function findGamesByIds(ids: string[]) {
  if (ids.length === 0) return Promise.resolve([]);
  return db.query.games.findMany({ where: inArray(games.id, ids), with: withRelations });
}

export async function slugExists(slug: string): Promise<boolean> {
  const [row] = await db.select({ id: games.id }).from(games).where(eq(games.slug, slug)).limit(1);
  return Boolean(row);
}

export async function findAvailableSlug(base: string): Promise<string> {
  let candidate = base || 'game';
  let suffix = 1;
  while (await slugExists(candidate)) {
    suffix += 1;
    candidate = `${base}-${suffix}`;
  }
  return candidate;
}

export async function findGameByBggId(bggId: number) {
  const [row] = await db
    .select({ id: games.id })
    .from(games)
    .where(eq(games.bggId, bggId))
    .limit(1);
  return row;
}

export async function categoryIdsExist(ids: string[]): Promise<boolean> {
  if (ids.length === 0) return true;
  const rows = await db
    .select({ id: categories.id })
    .from(categories)
    .where(inArray(categories.id, ids));
  return rows.length === ids.length;
}

export async function updateGameRow(id: string, values: Partial<typeof games.$inferInsert>) {
  const [row] = await db.update(games).set(values).where(eq(games.id, id)).returning();
  return row;
}

export async function deleteGameRow(id: string): Promise<void> {
  await db.delete(games).where(eq(games.id, id));
}

async function replaceGameCategoriesTx(
  tx: Tx,
  gameId: string,
  categoryIds: string[],
): Promise<void> {
  await tx.delete(gameCategories).where(eq(gameCategories.gameId, gameId));
  if (categoryIds.length > 0) {
    await tx
      .insert(gameCategories)
      .values(categoryIds.map((categoryId) => ({ gameId, categoryId })));
  }
}

async function fetchCategoryIdsTx(tx: Tx, gameId: string): Promise<string[]> {
  const rows = await tx
    .select({ categoryId: gameCategories.categoryId })
    .from(gameCategories)
    .where(eq(gameCategories.gameId, gameId));
  return rows.map((r) => r.categoryId);
}

function buildRevisionSnapshot(row: typeof games.$inferSelect, categoryIds: string[]) {
  return {
    slug: row.slug,
    nameVi: row.nameVi,
    nameEn: row.nameEn,
    minPlayers: row.minPlayers,
    maxPlayers: row.maxPlayers,
    playMinutes: row.playMinutes,
    weight: row.weight,
    minAge: row.minAge,
    isVietnamese: row.isVietnamese,
    bggId: row.bggId,
    descriptionVi: row.descriptionVi,
    descriptionSource: row.descriptionSource,
    descriptionRightsHolder: row.descriptionRightsHolder,
    descriptionPermissionRef: row.descriptionPermissionRef,
    descriptionLicense: row.descriptionLicense,
    videoUrls: row.videoUrls,
    imageKey: row.imageKey,
    imageCredit: row.imageCredit,
    categoryIds,
  };
}

export interface RevisionMeta {
  editorId: string | null;
  licenseAcceptedAt: Date | undefined;
}

export async function insertGameWithRevision(
  values: typeof games.$inferInsert,
  categoryIds: string[] | undefined,
  revision: RevisionMeta,
  outerTx?: Tx,
) {
  return withTx(outerTx, async (tx) => {
    const [row] = await tx.insert(games).values(values).returning();
    const ids = categoryIds ?? [];
    if (ids.length > 0) await replaceGameCategoriesTx(tx, row!.id, ids);

    await tx.insert(gameRevisions).values({
      gameId: row!.id,
      editorId: revision.editorId,
      snapshot: buildRevisionSnapshot(row!, ids),
      licenseAcceptedAt: revision.licenseAcceptedAt,
    });

    return row!;
  });
}

export async function updateGameWithRevision(
  id: string,
  values: Partial<typeof games.$inferInsert>,
  categoryIds: string[] | undefined,
  revision: RevisionMeta,
  outerTx?: Tx,
) {
  return withTx(outerTx, async (tx) => {
    const [row] =
      Object.keys(values).length > 0
        ? await tx.update(games).set(values).where(eq(games.id, id)).returning()
        : await tx.select().from(games).where(eq(games.id, id));
    if (categoryIds !== undefined) await replaceGameCategoriesTx(tx, id, categoryIds);
    const finalCategoryIds = await fetchCategoryIdsTx(tx, id);

    await tx.insert(gameRevisions).values({
      gameId: id,
      editorId: revision.editorId,
      snapshot: buildRevisionSnapshot(row!, finalCategoryIds),
      licenseAcceptedAt: revision.licenseAcceptedAt,
    });

    return row!;
  });
}

export function listGameRevisions(gameId: string) {
  return db
    .select({
      id: gameRevisions.id,
      editorName: users.name,
      createdAt: gameRevisions.createdAt,
      licenseAcceptedAt: gameRevisions.licenseAcceptedAt,
    })
    .from(gameRevisions)
    .leftJoin(users, eq(gameRevisions.editorId, users.id))
    .where(eq(gameRevisions.gameId, gameId))
    .orderBy(desc(gameRevisions.createdAt));
}

export async function insertBarcode(values: typeof gameBarcodes.$inferInsert) {
  const [row] = await db.insert(gameBarcodes).values(values).returning();
  return row!;
}

export async function findBarcode(code: string) {
  const [row] = await db.select().from(gameBarcodes).where(eq(gameBarcodes.code, code)).limit(1);
  return row;
}

export async function deleteBarcode(gameId: string, code: string): Promise<void> {
  await db
    .delete(gameBarcodes)
    .where(and(eq(gameBarcodes.gameId, gameId), eq(gameBarcodes.code, code)));
}
