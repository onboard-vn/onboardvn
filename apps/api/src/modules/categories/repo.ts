import type { CategoryFilter } from '@onboard/shared';
import { eq } from 'drizzle-orm';
import { db } from '../../db/client.js';
import { categories } from '../../db/schema/index.js';

export function listCategories(filter: CategoryFilter = {}) {
  return db
    .select()
    .from(categories)
    .where(filter.kind ? eq(categories.kind, filter.kind) : undefined)
    .orderBy(categories.name);
}

export async function insertCategory(values: typeof categories.$inferInsert) {
  const [row] = await db.insert(categories).values(values).returning();
  return row!;
}

export async function updateCategoryRow(
  id: string,
  values: Partial<typeof categories.$inferInsert>,
) {
  if (Object.keys(values).length === 0) {
    const [row] = await db.select().from(categories).where(eq(categories.id, id)).limit(1);
    return row;
  }
  const [row] = await db.update(categories).set(values).where(eq(categories.id, id)).returning();
  return row;
}

export async function findCategoryById(id: string) {
  const [row] = await db.select().from(categories).where(eq(categories.id, id)).limit(1);
  return row;
}

export async function deleteCategoryRow(id: string): Promise<void> {
  await db.delete(categories).where(eq(categories.id, id));
}
