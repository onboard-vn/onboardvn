import { relations } from 'drizzle-orm';
import {
  index,
  jsonb,
  numeric,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { users } from './auth.js';
import { games } from './games.js';
import { provinces, wards } from './locations.js';

export const cafes = pgTable('cafes', {
  id: uuid().primaryKey().defaultRandom(),
  slug: text().notNull().unique(),
  name: text().notNull(),
  provinceCode: text()
    .notNull()
    .references(() => provinces.code),
  wardCode: text()
    .notNull()
    .references(() => wards.code),
  addressLine: text().notNull(),
  legacyDistrict: text(),
  lat: numeric({ precision: 9, scale: 6 }),
  lng: numeric({ precision: 9, scale: 6 }),
  openingHours: jsonb().$type<Record<string, string>>(),
  links: jsonb().$type<{ fanpage?: string; maps?: string }>(),
  sourceUrl: text(),
  consentStatus: text({ enum: ['granted', 'pending', 'public_info_only', 'declined'] }).notNull(),
  consentNote: text(),
  verifiedAt: timestamp(),
  createdBy: text().references(() => users.id),
  createdAt: timestamp().defaultNow().notNull(),
  updatedAt: timestamp()
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
});

export const cafeGames = pgTable(
  'cafe_games',
  {
    cafeId: uuid()
      .notNull()
      .references(() => cafes.id, { onDelete: 'cascade' }),
    gameId: uuid()
      .notNull()
      .references(() => games.id, { onDelete: 'cascade' }),
    copies: smallint().default(1).notNull(),
    addedBy: text().references(() => users.id),
    addedVia: text({ enum: ['manual', 'scan', 'import'] })
      .notNull()
      .default('manual'),
  },
  (table) => [
    primaryKey({ columns: [table.cafeId, table.gameId] }),
    index('cafe_games_game_id_idx').on(table.gameId),
  ],
);

export const cafesRelations = relations(cafes, ({ one, many }) => ({
  province: one(provinces, { fields: [cafes.provinceCode], references: [provinces.code] }),
  ward: one(wards, { fields: [cafes.wardCode], references: [wards.code] }),
  inventory: many(cafeGames),
}));

export const cafeGamesRelations = relations(cafeGames, ({ one }) => ({
  cafe: one(cafes, { fields: [cafeGames.cafeId], references: [cafes.id] }),
  game: one(games, { fields: [cafeGames.gameId], references: [games.id] }),
}));
