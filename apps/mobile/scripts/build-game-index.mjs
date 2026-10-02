import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const srcDir = join(here, '../../../data/staging/score-templates');
const outFile = join(here, '../src/games/game-index.json');

const games = readdirSync(srcDir)
  .filter((f) => f.endsWith('.json') && f !== 'schema.json')
  .map((f) => {
    const t = JSON.parse(readFileSync(join(srcDir, f), 'utf8'));
    if (!t.slug || !t.name) throw new Error(`${f}: missing slug or name`);
    return {
      slug: t.slug,
      name: t.name,
      year: t.year ?? null,
      players: [t.playerCount?.min ?? null, t.playerCount?.max ?? null],
      mode: t.mode ?? null,
    };
  })
  .sort((a, b) => a.name.localeCompare(b.name, 'vi'));

writeFileSync(outFile, JSON.stringify(games) + '\n');
console.log(`Wrote ${games.length} games to ${outFile}`);
