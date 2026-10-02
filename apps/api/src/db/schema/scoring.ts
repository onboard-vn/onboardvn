import { sql } from 'drizzle-orm';
import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { users } from './auth.js';
import { games } from './games.js';

// Raw third-party payloads (BGG, club apps). Private: never exposed through public DTOs.
export const gameExternalMetadata = pgTable(
  'game_external_metadata',
  {
    gameId: uuid()
      .notNull()
      .references(() => games.id, { onDelete: 'cascade' }),
    source: text().notNull(),
    externalId: text().notNull(),
    bestPlayers: smallint()
      .array()
      .default(sql`'{}'::smallint[]`)
      .notNull(),
    playMinutesMax: smallint(),
    payload: jsonb().notNull(),
    fetchedAt: timestamp().notNull(),
  },
  (table) => [
    index('game_external_metadata_game_id_idx').on(table.gameId, table.source),
    uniqueIndex('game_external_metadata_source_external_uq').on(table.source, table.externalId),
  ],
);

export const scoreTemplates = pgTable(
  'score_templates',
  {
    id: uuid().primaryKey().defaultRandom(),
    gameId: uuid()
      .notNull()
      .references(() => games.id, { onDelete: 'cascade' }),
    variant: text().default('base').notNull(),
    version: integer().notNull(),
    status: text({ enum: ['draft', 'pending', 'approved', 'rejected', 'superseded'] })
      .default('draft')
      .notNull(),
    definition: jsonb().notNull(),
    scoringFamily: text(),
    confidence: text({ enum: ['high', 'medium', 'low'] }).notNull(),
    needsReview: boolean().default(true).notNull(),
    sources: jsonb().notNull(),
    createdBy: text().references(() => users.id, { onDelete: 'set null' }),
    reviewedBy: text().references(() => users.id, { onDelete: 'set null' }),
    reviewedAt: timestamp(),
    createdAt: timestamp().defaultNow().notNull(),
    updatedAt: timestamp()
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex('score_templates_game_variant_version_uq').on(
      table.gameId,
      table.variant,
      table.version,
    ),
    index('score_templates_status_idx').on(table.status),
  ],
);
