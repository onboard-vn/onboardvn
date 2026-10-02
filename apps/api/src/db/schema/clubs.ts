import { relations, sql } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { users } from './auth.js';
import { provinces } from './locations.js';

export const clubs = pgTable(
  'clubs',
  {
    id: uuid().primaryKey().defaultRandom(),
    slug: text().notNull().unique(),
    name: text().notNull(),
    description: text(),
    provinceCode: text().references(() => provinces.code),
    visibility: text({ enum: ['public', 'private'] })
      .default('private')
      .notNull(),
    /** Raw invite code is never stored; it is returned once on create/rotate. */
    inviteCodeHash: text().notNull().unique(),
    externalSource: text(),
    externalId: text(),
    createdBy: text().references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp().defaultNow().notNull(),
    updatedAt: timestamp()
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [uniqueIndex('clubs_external_uidx').on(table.externalSource, table.externalId)],
);

export const clubMembers = pgTable(
  'club_members',
  {
    clubId: uuid()
      .notNull()
      .references(() => clubs.id, { onDelete: 'cascade' }),
    userId: text()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    role: text({ enum: ['owner', 'admin', 'member'] })
      .default('member')
      .notNull(),
    joinedAt: timestamp().defaultNow().notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.clubId, table.userId] }),
    index('club_members_user_id_idx').on(table.userId),
  ],
);

/** Members imported from an external club app. `externalLoginId` exists only for invite-time
 * matching and must never be selected into a DTO. */
export const clubExternalMembers = pgTable(
  'club_external_members',
  {
    id: uuid().primaryKey().defaultRandom(),
    clubId: uuid()
      .notNull()
      .references(() => clubs.id, { onDelete: 'cascade' }),
    externalId: text().notNull(),
    nickname: text().notNull(),
    stats: jsonb().$type<Record<string, unknown>>().default({}).notNull(),
    externalLoginId: text(),
    userId: text().references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp().defaultNow().notNull(),
    updatedAt: timestamp()
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex('club_external_members_club_external_uidx').on(table.clubId, table.externalId),
    uniqueIndex('club_external_members_club_user_uidx')
      .on(table.clubId, table.userId)
      .where(sql`${table.userId} is not null`),
    index('club_external_members_user_id_idx').on(table.userId),
  ],
);

export const clubsRelations = relations(clubs, ({ many }) => ({
  members: many(clubMembers),
  externalMembers: many(clubExternalMembers),
}));

export const clubMembersRelations = relations(clubMembers, ({ one }) => ({
  club: one(clubs, { fields: [clubMembers.clubId], references: [clubs.id] }),
  user: one(users, { fields: [clubMembers.userId], references: [users.id] }),
}));

export const clubExternalMembersRelations = relations(clubExternalMembers, ({ one }) => ({
  club: one(clubs, { fields: [clubExternalMembers.clubId], references: [clubs.id] }),
  user: one(users, { fields: [clubExternalMembers.userId], references: [users.id] }),
}));
