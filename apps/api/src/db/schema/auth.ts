import { relations, sql } from 'drizzle-orm';
import { pgTable, text, timestamp, boolean, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { provinces } from './locations.js';

export const users = pgTable(
  'users',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    email: text('email').notNull().unique(),
    emailVerified: boolean('email_verified').default(false).notNull(),
    image: text('image'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    role: text('role', { enum: ['user', 'maintainer', 'admin'] })
      .default('user')
      .notNull(),
    username: text('username').unique(),
    displayUsername: text('display_username'),
    bggUsername: text('bgg_username'),
    // Default only backstops direct inserts (seed/tests); real sign-ups get one from the auth hook.
    friendCode: text('friend_code')
      .unique()
      .notNull()
      .default(sql`substr(replace(gen_random_uuid()::text, '-', ''), 1, 16)`),
    profileVisibility: text('profile_visibility', { enum: ['public', 'friends', 'private'] })
      .default('public')
      .notNull(),
    playsVisibility: text('plays_visibility', { enum: ['public', 'friends', 'private'] })
      .default('public')
      .notNull(),
    friendsVisibility: text('friends_visibility', { enum: ['public', 'friends', 'private'] })
      .default('friends')
      .notNull(),
    emailOnFriendRequest: boolean('email_on_friend_request').default(false).notNull(),
    provinceCode: text('province_code').references(() => provinces.code),
    clubShelfSuggest: boolean('club_shelf_suggest').default(true).notNull(),
    contributionBlockedAt: timestamp('contribution_blocked_at'),
  },
  (table) => [uniqueIndex('users_bgg_username_lower_idx').on(sql`lower(${table.bggUsername})`)],
);

export const sessions = pgTable(
  'sessions',
  {
    id: text('id').primaryKey(),
    expiresAt: timestamp('expires_at').notNull(),
    token: text('token').notNull().unique(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
  },
  (table) => [index('sessions_userId_idx').on(table.userId)],
);

export const accounts = pgTable(
  'accounts',
  {
    id: text('id').primaryKey(),
    accountId: text('account_id').notNull(),
    providerId: text('provider_id').notNull(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    accessToken: text('access_token'),
    refreshToken: text('refresh_token'),
    idToken: text('id_token'),
    accessTokenExpiresAt: timestamp('access_token_expires_at'),
    refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
    scope: text('scope'),
    password: text('password'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index('accounts_userId_idx').on(table.userId)],
);

export const verifications = pgTable(
  'verifications',
  {
    id: text('id').primaryKey(),
    identifier: text('identifier').notNull(),
    value: text('value').notNull(),
    expiresAt: timestamp('expires_at').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index('verifications_identifier_idx').on(table.identifier)],
);

export const usersRelations = relations(users, ({ many }) => ({
  sessions: many(sessions),
  accounts: many(accounts),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}));

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, {
    fields: [accounts.userId],
    references: [users.id],
  }),
}));
