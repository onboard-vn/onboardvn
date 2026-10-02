// Fills BGG cover links and translated descriptions; never overwrites uploaded or written content.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { TransactionRollbackError, and, eq, isNull } from 'drizzle-orm';
import { db, pool } from './client.js';
import { games } from './schema/index.js';

interface BggContent {
  bggId: number;
  imageUrl: string | null;
  descriptionVi: string | null;
}

const DATA_DIR = resolve(process.env.DATA_DIR ?? '../../data');
const FILE = resolve(process.env.BGG_CONTENT_FILE ?? `${DATA_DIR}/private/bgg/bgg-content-vi.json`);
const dryRun = process.argv.includes('--dry-run');

const rows = JSON.parse(readFileSync(FILE, 'utf8')) as BggContent[];
let images = 0;
let descriptions = 0;
let unmatched = 0;

await db
  .transaction(async (tx) => {
    for (const r of rows) {
      const [game] = await tx
        .select({ id: games.id })
        .from(games)
        .where(eq(games.bggId, r.bggId))
        .limit(1);
      if (!game) {
        unmatched++;
        continue;
      }
      if (r.imageUrl?.startsWith('https://')) {
        const done = await tx
          .update(games)
          .set({ externalImageUrl: r.imageUrl, imageCredit: 'BoardGameGeek' })
          .where(and(eq(games.id, game.id), isNull(games.imageKey)))
          .returning({ id: games.id });
        images += done.length;
      }
      const text = r.descriptionVi?.trim();
      if (text) {
        const done = await tx
          .update(games)
          .set({
            descriptionVi: text,
            descriptionSource: 'translated_from_bgg',
            descriptionLicense: 'permission-only',
            descriptionRightsHolder: 'BoardGameGeek / nhà phát hành',
          })
          .where(and(eq(games.id, game.id), isNull(games.descriptionVi)))
          .returning({ id: games.id });
        descriptions += done.length;
      }
    }
    if (dryRun) tx.rollback();
  })
  .catch((e: unknown) => {
    if (!(dryRun && e instanceof TransactionRollbackError)) throw e;
  });

console.log(
  `${dryRun ? '[dry-run] ' : ''}rows=${rows.length} images=${images} descriptions=${descriptions} unmatched=${unmatched}`,
);
await pool.end();
