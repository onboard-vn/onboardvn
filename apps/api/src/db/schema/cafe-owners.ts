import { relations, sql } from 'drizzle-orm';
import {
  index,
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { users } from './auth.js';
import { cafes } from './cafes.js';

export const cafeMembers = pgTable(
  'cafe_members',
  {
    cafeId: uuid()
      .notNull()
      .references(() => cafes.id, { onDelete: 'cascade' }),
    userId: text()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    role: text({ enum: ['owner', 'staff'] }).notNull(),
    createdAt: timestamp().defaultNow().notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.cafeId, table.userId] }),
    index('cafe_members_user_id_idx').on(table.userId),
  ],
);

export const cafeOwnerInvites = pgTable(
  'cafe_owner_invites',
  {
    id: uuid().primaryKey().defaultRandom(),
    tokenHash: text().notNull().unique(),
    cafeId: uuid()
      .notNull()
      .references(() => cafes.id, { onDelete: 'cascade' }),
    createdBy: text()
      .notNull()
      .references(() => users.id),
    createdAt: timestamp().defaultNow().notNull(),
    expiresAt: timestamp().notNull(),
    usedAt: timestamp(),
    usedBy: text().references(() => users.id),
    revokedAt: timestamp(),
  },
  (table) => [
    // Only one active (unused, unrevoked) invite per café at a time; issuing a new one revokes it.
    uniqueIndex('cafe_owner_invites_active_cafe_idx')
      .on(table.cafeId)
      .where(sql`${table.usedAt} is null and ${table.revokedAt} is null`),
  ],
);

export const cafeInventoryImports = pgTable('cafe_inventory_imports', {
  id: uuid().primaryKey().defaultRandom(),
  cafeId: uuid()
    .notNull()
    .references(() => cafes.id, { onDelete: 'cascade' }),
  userId: text()
    .notNull()
    .references(() => users.id),
  rowsApplied: integer().notNull(),
  createdAt: timestamp().defaultNow().notNull(),
});

export const cafeMembersRelations = relations(cafeMembers, ({ one }) => ({
  cafe: one(cafes, { fields: [cafeMembers.cafeId], references: [cafes.id] }),
  user: one(users, { fields: [cafeMembers.userId], references: [users.id] }),
}));

export const cafeOwnerInvitesRelations = relations(cafeOwnerInvites, ({ one }) => ({
  cafe: one(cafes, { fields: [cafeOwnerInvites.cafeId], references: [cafes.id] }),
}));

export const cafeInventoryImportsRelations = relations(cafeInventoryImports, ({ one }) => ({
  cafe: one(cafes, { fields: [cafeInventoryImports.cafeId], references: [cafes.id] }),
  user: one(users, { fields: [cafeInventoryImports.userId], references: [users.id] }),
}));
