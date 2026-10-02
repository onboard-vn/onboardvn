import { index, pgTable, primaryKey, text, uuid } from 'drizzle-orm/pg-core';
import { clubExternalMembers, clubs } from './clubs.js';
import { games } from './games.js';
import { meetupTables } from './meetups.js';

/** Maps an external record to the internal row it was imported into, so re-syncs update in place. */
export const externalRefs = pgTable(
  'external_refs',
  {
    source: text().notNull(),
    kind: text({ enum: ['meetup', 'meetup_table'] }).notNull(),
    externalId: text().notNull(),
    internalId: uuid().notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.source, table.kind, table.externalId] }),
    index('external_refs_kind_internal_id_idx').on(table.kind, table.internalId),
  ],
);

export const clubExternalOwnerships = pgTable(
  'club_external_ownerships',
  {
    clubId: uuid()
      .notNull()
      .references(() => clubs.id, { onDelete: 'cascade' }),
    gameId: uuid()
      .notNull()
      .references(() => games.id, { onDelete: 'cascade' }),
    externalMemberId: uuid()
      .notNull()
      .references(() => clubExternalMembers.id, { onDelete: 'cascade' }),
  },
  (table) => [
    primaryKey({ columns: [table.clubId, table.gameId, table.externalMemberId] }),
    index('club_external_ownerships_member_idx').on(table.externalMemberId),
  ],
);

/** Seats of imported tables held by external members; avoids fake users for unmatched players. */
export const meetupTableExternalPlayers = pgTable(
  'meetup_table_external_players',
  {
    tableId: uuid()
      .notNull()
      .references(() => meetupTables.id, { onDelete: 'cascade' }),
    externalMemberId: uuid()
      .notNull()
      .references(() => clubExternalMembers.id, { onDelete: 'cascade' }),
  },
  (table) => [
    primaryKey({ columns: [table.tableId, table.externalMemberId] }),
    index('meetup_table_external_players_member_idx').on(table.externalMemberId),
  ],
);
