import { sql } from 'drizzle-orm';
import {
  check,
  index,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  type AnyPgColumn,
} from 'drizzle-orm/pg-core';
import { users } from './auth.js';
import { clubs } from './clubs.js';
import { meetupTables } from './meetups.js';

/** Who sits at a table or plays a game: a signed-up user (member), an unregistered guest, or an
 * imported external-club member. Claimed guests keep a tombstone row (`claimedAt` set). */
export const identities = pgTable(
  'identities',
  {
    id: uuid().primaryKey().defaultRandom(),
    kind: text({ enum: ['member', 'guest', 'external'] }).notNull(),
    userId: text().references(() => users.id, { onDelete: 'set null' }),
    clubId: uuid().references(() => clubs.id, { onDelete: 'cascade' }),
    displayName: text().notNull(),
    birthYear: smallint(),
    invitedByIdentityId: uuid().references((): AnyPgColumn => identities.id, {
      onDelete: 'set null',
    }),
    externalSource: text(),
    externalId: text(),
    claimedAt: timestamp({ withTimezone: true }),
    createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    check('identities_birth_year_chk', sql`${table.birthYear} is null or ${table.kind} = 'guest'`),
    check(
      'identities_external_chk',
      sql`${table.kind} <> 'external' or (${table.externalId} is not null and ${table.clubId} is not null)`,
    ),
    uniqueIndex('identities_member_user_uidx')
      .on(table.userId)
      .where(sql`${table.kind} = 'member'`),
    uniqueIndex('identities_external_uidx')
      .on(table.clubId, table.externalId)
      .where(sql`${table.kind} = 'external'`),
    index('identities_user_id_idx').on(table.userId),
    index('identities_club_id_idx').on(table.clubId),
    index('identities_invited_by_idx').on(table.invitedByIdentityId),
  ],
);

/** Non-user seats (guests, external members) at a table; user seats stay on
 * `meetup_participants.table_id`. */
export const meetupTableIdentities = pgTable(
  'meetup_table_identities',
  {
    tableId: uuid()
      .notNull()
      .references(() => meetupTables.id, { onDelete: 'cascade' }),
    identityId: uuid()
      .notNull()
      .references(() => identities.id, { onDelete: 'cascade' }),
  },
  (table) => [
    primaryKey({ columns: [table.tableId, table.identityId] }),
    index('meetup_table_identities_identity_idx').on(table.identityId),
  ],
);

/** Only the sha256 of the token is stored; the raw token is returned once on creation. */
export const identityClaimTokens = pgTable(
  'identity_claim_tokens',
  {
    id: uuid().primaryKey().defaultRandom(),
    identityId: uuid()
      .notNull()
      .references(() => identities.id, { onDelete: 'cascade' }),
    tokenHash: text().notNull().unique(),
    createdBy: text()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    expiresAt: timestamp({ withTimezone: true }).notNull(),
    usedAt: timestamp({ withTimezone: true }),
    createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index('identity_claim_tokens_identity_idx').on(table.identityId)],
);

export const identityClaimRequests = pgTable(
  'identity_claim_requests',
  {
    id: uuid().primaryKey().defaultRandom(),
    identityId: uuid()
      .notNull()
      .references(() => identities.id, { onDelete: 'cascade' }),
    requesterUserId: text()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    tableId: uuid().references(() => meetupTables.id, { onDelete: 'set null' }),
    note: text(),
    status: text({ enum: ['pending', 'approved', 'rejected'] })
      .default('pending')
      .notNull(),
    decidedBy: text().references(() => users.id, { onDelete: 'set null' }),
    decidedAt: timestamp({ withTimezone: true }),
    createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('identity_claim_requests_pending_uidx')
      .on(table.identityId, table.requesterUserId)
      .where(sql`${table.status} = 'pending'`),
    index('identity_claim_requests_identity_idx').on(table.identityId, table.status),
  ],
);
