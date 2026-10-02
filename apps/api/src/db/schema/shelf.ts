import { boolean, index, pgTable, primaryKey, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { users } from './auth.js';
import { games } from './games.js';

export const userGames = pgTable(
  'user_games',
  {
    userId: text()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    gameId: uuid()
      .notNull()
      .references(() => games.id, { onDelete: 'cascade' }),
    note: text(),
    condition: text({ enum: ['new', 'like_new', 'good', 'worn'] }),
    sleeved: boolean().default(false).notNull(),
    boxProtected: boolean().default(false).notNull(),
    edition: text(),
    createdAt: timestamp().defaultNow().notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.gameId] }),
    index('user_games_game_id_idx').on(table.gameId),
  ],
);

export const userWishlist = pgTable(
  'user_wishlist',
  {
    userId: text()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    gameId: uuid()
      .notNull()
      .references(() => games.id, { onDelete: 'cascade' }),
    createdAt: timestamp().defaultNow().notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.gameId] }),
    index('user_wishlist_game_id_idx').on(table.gameId),
  ],
);
