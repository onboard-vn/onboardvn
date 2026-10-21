import { integer, pgTable, text, timestamp } from 'drizzle-orm/pg-core';

export const clubLinkAttempts = pgTable('club_link_attempts', {
  scopeKey: text().primaryKey(),
  failures: integer().default(0).notNull(),
  windowStartedAt: timestamp({ withTimezone: true }).notNull(),
  lockedUntil: timestamp({ withTimezone: true }),
  updatedAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
});
