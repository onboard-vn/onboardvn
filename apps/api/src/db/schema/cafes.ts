import { relations } from 'drizzle-orm';
import type { CafeAmenities, CafeLinks, CafeOpeningHours } from '@onboard/shared';
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

export const cafes = pgTable(
  'cafes',
  {
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
    openingHours: jsonb().$type<CafeOpeningHours>(),
    links: jsonb().$type<CafeLinks>(),
    logoPath: text(),
    coverPath: text(),
    sourceUrl: text(),
    consentStatus: text({ enum: ['granted', 'pending', 'public_info_only', 'declined'] }).notNull(),
    consentNote: text(),
    verifiedAt: timestamp(),
    createdBy: text().references(() => users.id),
    venueType: text({ enum: ['boardgame_cafe', 'byog_cafe', 'event_space'] })
      .notNull()
      .default('boardgame_cafe'),
    amenities: jsonb().$type<CafeAmenities>(),
    feeModel: text({
      enum: ['free', 'with_drink', 'hourly', 'per_person', 'game_rental', 'unknown'],
    })
      .notNull()
      .default('unknown'),
    feeNote: text(),
    createdAt: timestamp().defaultNow().notNull(),
    updatedAt: timestamp()
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index('cafes_venue_type_idx').on(table.venueType),
    index('cafes_fee_model_idx').on(table.feeModel),
    // Supports the `byog`/`food`/`privateRoom`/`largeTables` tri-state containment filters
    // (`amenities @> '{"byogAllowed":true}'`), the only amenity lookups the API performs.
    index('cafes_amenities_gin_idx').using('gin', table.amenities.op('jsonb_path_ops')),
  ],
);

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
    source: text({ enum: ['staff', 'owner', 'community'] })
      .notNull()
      .default('staff'),
  },
  (table) => [
    primaryKey({ columns: [table.cafeId, table.gameId] }),
    index('cafe_games_game_id_idx').on(table.gameId),
  ],
);

/** Audit trail for community-contributed inventory rows: one row per add/remove/confirm action,
 * used to decide whether a community re-add is blocked (see community.ts). */
export const cafeGameEvents = pgTable(
  'cafe_game_events',
  {
    id: uuid().primaryKey().defaultRandom(),
    cafeId: uuid()
      .notNull()
      .references(() => cafes.id, { onDelete: 'cascade' }),
    gameId: uuid()
      .notNull()
      .references(() => games.id, { onDelete: 'cascade' }),
    userId: text().references(() => users.id, { onDelete: 'set null' }),
    action: text({ enum: ['add', 'remove', 'confirm'] }).notNull(),
    source: text({ enum: ['staff', 'owner', 'community'] }).notNull(),
    createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('cafe_game_events_cafe_game_idx').on(table.cafeId, table.gameId),
    index('cafe_game_events_user_created_at_idx').on(table.userId, table.createdAt),
  ],
);

export const cafePhotos = pgTable(
  'cafe_photos',
  {
    id: uuid().primaryKey().defaultRandom(),
    cafeId: uuid()
      .notNull()
      .references(() => cafes.id, { onDelete: 'cascade' }),
    path: text().notNull(),
    caption: text(),
    sortOrder: smallint().notNull().default(0),
    uploadedBy: text().references(() => users.id),
    createdAt: timestamp().defaultNow().notNull(),
  },
  (table) => [index('cafe_photos_cafe_id_idx').on(table.cafeId, table.sortOrder)],
);

export const cafesRelations = relations(cafes, ({ one, many }) => ({
  province: one(provinces, { fields: [cafes.provinceCode], references: [provinces.code] }),
  ward: one(wards, { fields: [cafes.wardCode], references: [wards.code] }),
  inventory: many(cafeGames),
  photos: many(cafePhotos),
}));

export const cafeGamesRelations = relations(cafeGames, ({ one }) => ({
  cafe: one(cafes, { fields: [cafeGames.cafeId], references: [cafes.id] }),
  game: one(games, { fields: [cafeGames.gameId], references: [games.id] }),
}));

export const cafePhotosRelations = relations(cafePhotos, ({ one }) => ({
  cafe: one(cafes, { fields: [cafePhotos.cafeId], references: [cafes.id] }),
}));
