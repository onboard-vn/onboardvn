import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { users } from './auth.js';
import { clubs } from './clubs.js';
import { games } from './games.js';
import { identities } from './identities.js';
import { meetupTables } from './meetups.js';
import { scoreTemplates } from './scoring.js';

export interface PlayComputed {
  categories: Record<string, number>;
  total: number;
  rank: number | null;
  isWinner: boolean;
}

export const plays = pgTable(
  'plays',
  {
    /** Client-generated so offline creates are idempotent. */
    id: uuid().primaryKey(),
    clubId: uuid().references(() => clubs.id, { onDelete: 'set null' }),
    meetupTableId: uuid().references(() => meetupTables.id, { onDelete: 'set null' }),
    gameId: uuid()
      .notNull()
      .references(() => games.id, { onDelete: 'cascade' }),
    scoreTemplateId: uuid().references(() => scoreTemplates.id, { onDelete: 'restrict' }),
    templateVersion: integer(),
    status: text({ enum: ['draft', 'final'] })
      .default('draft')
      .notNull(),
    outcome: text({ enum: ['win', 'loss'] }),
    rev: integer().default(0).notNull(),
    editedAfterFinal: boolean().default(false).notNull(),
    startedAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
    endedAt: timestamp({ withTimezone: true }),
    createdBy: text()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp({ withTimezone: true })
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    check(
      'plays_template_pin_chk',
      sql`(${table.scoreTemplateId} is null) = (${table.templateVersion} is null)`,
    ),
    index('plays_created_by_idx').on(table.createdBy, table.startedAt),
    index('plays_club_started_idx').on(table.clubId, table.startedAt),
    index('plays_meetup_table_idx').on(table.meetupTableId),
    index('plays_game_idx').on(table.gameId),
  ],
);

export const playPlayers = pgTable(
  'play_players',
  {
    playId: uuid()
      .notNull()
      .references(() => plays.id, { onDelete: 'cascade' }),
    identityId: uuid()
      .notNull()
      .references(() => identities.id, { onDelete: 'restrict' }),
    seat: smallint().notNull(),
    team: text(),
    role: text(),
    values: jsonb().$type<Record<string, unknown>>().default({}).notNull(),
    rounds: jsonb().$type<Record<string, number[]>>(),
    computed: jsonb().$type<PlayComputed>(),
    isWinnerOverride: boolean(),
  },
  (table) => [
    primaryKey({ columns: [table.playId, table.identityId] }),
    index('play_players_identity_idx').on(table.identityId),
  ],
);

/** Append-only audit of every play mutation; `clientOpId` makes field ops idempotent. */
export const playEvents = pgTable(
  'play_events',
  {
    id: uuid().primaryKey().defaultRandom(),
    playId: uuid()
      .notNull()
      .references(() => plays.id, { onDelete: 'cascade' }),
    rev: integer().notNull(),
    actorUserId: text().references(() => users.id, { onDelete: 'set null' }),
    identityId: uuid().references(() => identities.id, { onDelete: 'set null' }),
    action: text().notNull(),
    categoryKey: text(),
    roundIndex: smallint(),
    oldValue: jsonb(),
    newValue: jsonb(),
    clientOpId: uuid(),
    createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('play_events_play_op_uidx')
      .on(table.playId, table.clientOpId)
      .where(sql`${table.clientOpId} is not null`),
    index('play_events_play_rev_idx').on(table.playId, table.rev),
  ],
);
