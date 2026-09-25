import { relations, sql } from 'drizzle-orm';
import {
  check,
  index,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { users } from './auth.js';
import { cafes } from './cafes.js';
import { games } from './games.js';
import { provinces, wards } from './locations.js';

/** 1 Kèo = 1 session (ngày, địa điểm) chứa 1..n bàn. "meetups*" vì `sessions` đã là bảng Better
 * Auth (auth.ts) — "session" ở đây chỉ là thuật ngữ nghiệp vụ. */
export const meetups = pgTable(
  'meetups',
  {
    id: uuid().primaryKey().defaultRandom(),
    slug: text().notNull().unique(),
    title: text().notNull(),
    description: text(),
    startsAt: timestamp({ withTimezone: true }).notNull(),
    endsAt: timestamp({ withTimezone: true }),
    cafeId: uuid().references(() => cafes.id),
    addressLine: text(),
    provinceCode: text()
      .notNull()
      .references(() => provinces.code),
    wardCode: text().references(() => wards.code),
    capacity: smallint(),
    visibility: text({ enum: ['public', 'friends', 'private'] })
      .default('public')
      .notNull(),
    /** Raw invite token is never stored — only its sha256 hash; the raw value is returned once
     * on create/rotate. */
    inviteCodeHash: text().notNull().unique(),
    status: text({ enum: ['scheduled', 'cancelled'] })
      .default('scheduled')
      .notNull(),
    createdBy: text()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    createdAt: timestamp().defaultNow().notNull(),
    updatedAt: timestamp()
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    check(
      'meetups_location_chk',
      sql`${table.cafeId} is not null or ${table.addressLine} is not null`,
    ),
    index('meetups_province_starts_at_idx').on(table.provinceCode, table.startsAt),
    index('meetups_starts_at_idx').on(table.startsAt),
  ],
);

export const meetupTables = pgTable(
  'meetup_tables',
  {
    id: uuid().primaryKey().defaultRandom(),
    meetupId: uuid()
      .notNull()
      .references(() => meetups.id, { onDelete: 'cascade' }),
    hostUserId: text()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    gameId: uuid().references(() => games.id, { onDelete: 'set null' }),
    /** Seats include the host: a 4-seat table = host + 3 others. */
    seats: smallint(),
    broughtByUserId: text().references(() => users.id, { onDelete: 'set null' }),
    note: text(),
    position: smallint().notNull(),
    createdAt: timestamp().defaultNow().notNull(),
  },
  (table) => [
    check(
      'meetup_tables_seats_chk',
      sql`${table.seats} is null or (${table.seats} between 2 and 20)`,
    ),
    index('meetup_tables_meetup_id_idx').on(table.meetupId),
    index('meetup_tables_host_user_id_idx').on(table.hostUserId),
    index('meetup_tables_brought_by_user_id_idx').on(table.broughtByUserId),
  ],
);

export const meetupParticipants = pgTable(
  'meetup_participants',
  {
    meetupId: uuid()
      .notNull()
      .references(() => meetups.id, { onDelete: 'cascade' }),
    userId: text()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    status: text({ enum: ['going', 'maybe', 'declined', 'waitlist', 'invited'] }).notNull(),
    tableId: uuid().references(() => meetupTables.id, { onDelete: 'set null' }),
    waitlistedAt: timestamp(),
    respondedAt: timestamp(),
  },
  (table) => [
    primaryKey({ columns: [table.meetupId, table.userId] }),
    index('meetup_participants_user_id_idx').on(table.userId),
    index('meetup_participants_table_id_idx').on(table.tableId),
  ],
);

export const meetupsRelations = relations(meetups, ({ one, many }) => ({
  cafe: one(cafes, { fields: [meetups.cafeId], references: [cafes.id] }),
  province: one(provinces, { fields: [meetups.provinceCode], references: [provinces.code] }),
  ward: one(wards, { fields: [meetups.wardCode], references: [wards.code] }),
  creator: one(users, { fields: [meetups.createdBy], references: [users.id] }),
  tables: many(meetupTables),
  participants: many(meetupParticipants),
}));

export const meetupTablesRelations = relations(meetupTables, ({ one, many }) => ({
  meetup: one(meetups, { fields: [meetupTables.meetupId], references: [meetups.id] }),
  host: one(users, { fields: [meetupTables.hostUserId], references: [users.id] }),
  game: one(games, { fields: [meetupTables.gameId], references: [games.id] }),
  broughtBy: one(users, { fields: [meetupTables.broughtByUserId], references: [users.id] }),
  seatedParticipants: many(meetupParticipants),
}));

export const meetupParticipantsRelations = relations(meetupParticipants, ({ one }) => ({
  meetup: one(meetups, { fields: [meetupParticipants.meetupId], references: [meetups.id] }),
  user: one(users, { fields: [meetupParticipants.userId], references: [users.id] }),
  table: one(meetupTables, { fields: [meetupParticipants.tableId], references: [meetupTables.id] }),
}));
