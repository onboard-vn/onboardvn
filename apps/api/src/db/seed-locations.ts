import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { sql } from 'drizzle-orm';
import { db, pool } from './client.js';
import { provinces, wards } from './schema/index.js';

interface AdminUnitsSnapshot {
  provinces: { code: string; name: string; slug: string }[];
  wards: { code: string; provinceCode: string; name: string; slug: string }[];
}

// Resolves to apps/api/data from both src/db and dist/db.
const dataPath = resolve(import.meta.dirname, '../../data/admin-units.json');
const snapshot: AdminUnitsSnapshot = JSON.parse(readFileSync(dataPath, 'utf-8'));

const CHUNK_SIZE = 500;
function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

for (const batch of chunk(snapshot.provinces, CHUNK_SIZE)) {
  await db
    .insert(provinces)
    .values(batch)
    .onConflictDoUpdate({
      target: provinces.code,
      set: { name: sql`excluded.name`, slug: sql`excluded.slug` },
    });
}

for (const batch of chunk(snapshot.wards, CHUNK_SIZE)) {
  await db
    .insert(wards)
    .values(batch)
    .onConflictDoUpdate({
      target: wards.code,
      set: {
        name: sql`excluded.name`,
        slug: sql`excluded.slug`,
        provinceCode: sql`excluded.province_code`,
      },
    });
}

await pool.end();
console.log(`seeded ${snapshot.provinces.length} provinces, ${snapshot.wards.length} wards`);
