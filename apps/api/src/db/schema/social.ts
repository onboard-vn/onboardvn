import { sql } from 'drizzle-orm';
import { check, index, pgTable, primaryKey, text, timestamp } from 'drizzle-orm/pg-core';
import { users } from './auth.js';

export const friendships = pgTable(
  'friendships',
  {
    userA: text()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    userB: text()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    createdAt: timestamp().defaultNow().notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.userA, table.userB] }),
    index('friendships_user_b_idx').on(table.userB),
    check('friendships_order_chk', sql`${table.userA} < ${table.userB}`),
  ],
);

export const friendRequests = pgTable(
  'friend_requests',
  {
    fromUserId: text()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    toUserId: text()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    status: text({ enum: ['pending', 'declined'] })
      .default('pending')
      .notNull(),
    createdAt: timestamp().defaultNow().notNull(),
    respondedAt: timestamp(),
  },
  (table) => [
    primaryKey({ columns: [table.fromUserId, table.toUserId] }),
    index('friend_requests_to_user_status_idx').on(table.toUserId, table.status),
  ],
);

export const userBlocks = pgTable(
  'user_blocks',
  {
    blockerId: text()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    blockedId: text()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    createdAt: timestamp().defaultNow().notNull(),
  },
  (table) => [primaryKey({ columns: [table.blockerId, table.blockedId] })],
);
