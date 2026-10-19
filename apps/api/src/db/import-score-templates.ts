import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { inArray } from 'drizzle-orm';
import { scoreTemplateSchema, validateTemplate } from '@onboard/shared';
import { db, pool } from './client.js';
import { games, scoreTemplates } from './schema/index.js';

// Explicit manifest, immutable versions: never re-import games or alter pinned definitions.
const dataDir = resolve(process.env.DATA_DIR ?? '../../data');
const manifest = JSON.parse(
  readFileSync(resolve(dataDir, 'staging/club-scoring-release.json'), 'utf8'),
) as { slugs: string[] };
const apply = process.argv.includes('--apply');
const slugs = manifest.slugs;
if (
  !Array.isArray(slugs) ||
  !slugs.length ||
  new Set(slugs).size !== slugs.length ||
  slugs.some((slug) => !/^[a-z0-9-]+$/.test(slug))
)
  throw new Error('Invalid release manifest');
const definitions = slugs.map((slug) => {
  const raw: unknown = JSON.parse(
    readFileSync(resolve(dataDir, `staging/score-templates/${slug}.json`), 'utf8'),
  );
  const result = validateTemplate(raw);
  if (!result.ok) throw new Error(`${slug}: ${result.error.message}`);
  const definition = scoreTemplateSchema.parse(raw);
  if (definition.slug !== slug || definition.templateVersion < 3)
    throw new Error(`Unexpected release contract: ${slug}`);
  return definition;
});
const canonicalJson = (value: unknown): string =>
  JSON.stringify(value, (_key, entry: unknown) =>
    entry && typeof entry === 'object' && !Array.isArray(entry)
      ? Object.fromEntries(Object.entries(entry).sort(([a], [b]) => a.localeCompare(b)))
      : entry,
  );
try {
  await db.transaction(async (tx) => {
    const catalog = await tx
      .select({ id: games.id, slug: games.slug })
      .from(games)
      .where(inArray(games.slug, slugs));
    const bySlug = new Map(catalog.map((game) => [game.slug, game.id]));
    const missing = slugs.filter((slug) => !bySlug.has(slug));
    if (missing.length)
      throw new Error(`Missing catalog games; no import performed: ${missing.join(', ')}`);
    const existing = await tx
      .select()
      .from(scoreTemplates)
      .where(
        inArray(
          scoreTemplates.gameId,
          catalog.map((game) => game.id),
        ),
      );
    const additions = definitions.map((definition) => {
      const gameId = bySlug.get(definition.slug)!;
      const previous = existing.find(
        (row) =>
          row.gameId === gameId &&
          row.variant === (definition.variant ?? 'base') &&
          row.version === definition.templateVersion,
      );
      if (
        previous &&
        canonicalJson(scoreTemplateSchema.parse(previous.definition)) !== canonicalJson(definition)
      )
        throw new Error(`Immutable template version conflict: ${definition.slug}`);
      return { definition, gameId, previous };
    });
    let inserted = 0;
    for (const { definition, gameId, previous } of additions) {
      const approved = definition.confidence === 'high' && !definition.needsReview;
      const status = approved ? ('approved' as const) : ('pending' as const);
      if (!previous && apply) {
        await tx.insert(scoreTemplates).values({
          gameId,
          variant: definition.variant ?? 'base',
          version: definition.templateVersion,
          definition,
          status,
          confidence: definition.confidence,
          needsReview: definition.needsReview ?? !approved,
          sources: definition.sources,
          scoringFamily: null,
        });
        inserted++;
      }
      console.log(
        `${definition.slug}: v${definition.templateVersion} ${status} ${previous ? 'existing' : apply ? 'inserted' : 'planned'}`,
      );
    }
    console.log(
      JSON.stringify({
        apply,
        checked: definitions.length,
        inserted,
        existing: additions.filter((row) => row.previous).length,
      }),
    );
  });
} finally {
  await pool.end();
}
