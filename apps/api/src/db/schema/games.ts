import { relations, sql } from 'drizzle-orm';
import {
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { users } from './auth.js';

export const games = pgTable('games', {
  id: uuid().primaryKey().defaultRandom(),
  slug: text().notNull().unique(),
  nameVi: text(),
  nameEn: text().notNull(),
  minPlayers: smallint(),
  maxPlayers: smallint(),
  playMinutes: smallint(),
  weight: numeric({ precision: 3, scale: 2 }),
  minAge: smallint(),
  isVietnamese: boolean().default(false).notNull(),
  bggId: integer().unique(),
  descriptionVi: text(),
  descriptionSource: text({ enum: ['original', 'translated_with_permission'] })
    .default('original')
    .notNull(),
  descriptionRightsHolder: text(),
  descriptionPermissionRef: text(),
  descriptionLicense: text({ enum: ['CC-BY-SA-4.0', 'permission-only'] })
    .default('CC-BY-SA-4.0')
    .notNull(),
  videoUrls: text()
    .array()
    .default(sql`'{}'::text[]`)
    .notNull(),
  imageKey: text(),
  imageCredit: text(),
  createdBy: text().references(() => users.id),
  createdAt: timestamp().defaultNow().notNull(),
  updatedAt: timestamp()
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
});

export const categories = pgTable(
  'categories',
  {
    id: uuid().primaryKey().defaultRandom(),
    name: text().notNull().unique(),
    nameVi: text(),
    kind: text({ enum: ['category', 'mechanic'] })
      .default('category')
      .notNull(),
    bggId: integer(),
  },
  (table) => [uniqueIndex('categories_kind_bgg_id_uq').on(table.kind, table.bggId)],
);

export const gameRevisions = pgTable(
  'game_revisions',
  {
    id: uuid().primaryKey().defaultRandom(),
    gameId: uuid()
      .notNull()
      .references(() => games.id, { onDelete: 'cascade' }),
    editorId: text().references(() => users.id, { onDelete: 'set null' }),
    snapshot: jsonb().notNull(),
    licenseAcceptedAt: timestamp(),
    createdAt: timestamp().defaultNow().notNull(),
  },
  (table) => [index('game_revisions_game_id_idx').on(table.gameId, table.createdAt)],
);

export const barcodeLookups = pgTable('barcode_lookups', {
  code: text().primaryKey(),
  provider: text().notNull(),
  result: jsonb().notNull(),
  fetchedAt: timestamp().defaultNow().notNull(),
  expiresAt: timestamp().notNull(),
});

export const gameCategories = pgTable(
  'game_categories',
  {
    gameId: uuid()
      .notNull()
      .references(() => games.id, { onDelete: 'cascade' }),
    categoryId: uuid()
      .notNull()
      .references(() => categories.id, { onDelete: 'cascade' }),
  },
  (table) => [
    primaryKey({ columns: [table.gameId, table.categoryId] }),
    index('game_categories_category_id_idx').on(table.categoryId),
  ],
);

export const gameBarcodes = pgTable(
  'game_barcodes',
  {
    code: text().primaryKey(),
    gameId: uuid()
      .notNull()
      .references(() => games.id, { onDelete: 'cascade' }),
    edition: text(),
    source: text({ enum: ['manual', 'gameupc'] }).notNull(),
  },
  (table) => [index('game_barcodes_game_id_idx').on(table.gameId)],
);

export const gamesRelations = relations(games, ({ many }) => ({
  categories: many(gameCategories),
  barcodes: many(gameBarcodes),
  revisions: many(gameRevisions),
}));

export const gameRevisionsRelations = relations(gameRevisions, ({ one }) => ({
  game: one(games, { fields: [gameRevisions.gameId], references: [games.id] }),
}));

export const categoriesRelations = relations(categories, ({ many }) => ({
  games: many(gameCategories),
}));

export const gameCategoriesRelations = relations(gameCategories, ({ one }) => ({
  game: one(games, { fields: [gameCategories.gameId], references: [games.id] }),
  category: one(categories, { fields: [gameCategories.categoryId], references: [categories.id] }),
}));

export const gameBarcodesRelations = relations(gameBarcodes, ({ one }) => ({
  game: one(games, { fields: [gameBarcodes.gameId], references: [games.id] }),
}));
