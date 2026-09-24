import { relations } from 'drizzle-orm';
import { index, pgTable, text, uniqueIndex } from 'drizzle-orm/pg-core';

export const provinces = pgTable('provinces', {
  code: text().primaryKey(),
  name: text().notNull(),
  slug: text().notNull().unique(),
});

export const wards = pgTable(
  'wards',
  {
    code: text().primaryKey(),
    provinceCode: text()
      .notNull()
      .references(() => provinces.code),
    name: text().notNull(),
    slug: text().notNull(),
  },
  (table) => [
    index('wards_province_code_idx').on(table.provinceCode),
    uniqueIndex('wards_province_slug_uq').on(table.provinceCode, table.slug),
  ],
);

export const provincesRelations = relations(provinces, ({ many }) => ({
  wards: many(wards),
}));

export const wardsRelations = relations(wards, ({ one }) => ({
  province: one(provinces, { fields: [wards.provinceCode], references: [provinces.code] }),
}));
