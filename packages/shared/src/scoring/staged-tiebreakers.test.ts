import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { computeScores } from './compute.js';
import { scoreTemplateSchema } from './template-schema.js';

it.each([
  ['everdell', { events: 8, eventCount: 1, leftoverResources: 9 }, { events: 8, eventCount: 2 }, 8],
  [
    'everdell',
    { events: 8, eventCount: 2, leftoverResources: 1 },
    { events: 8, eventCount: 2, leftoverResources: 3 },
    8,
  ],
  ['wingspan', { birdPoints: 60, unusedFood: 2 }, { birdPoints: 60, unusedFood: 5 }, 60],
  ['wyrmspan', { visibleDragons: 2 }, { visibleDragons: 5 }, 0],
  [
    'a-game-of-thrones-the-board-game-second-edition-2011',
    { castleAreas: 5, landAreas: 7, supplyPosition: 6, ironThronePlace: 1 },
    { castleAreas: 5, landAreas: 8, supplyPosition: 2, ironThronePlace: 2 },
    5,
  ],
] as const)('preserves the tiebreak inputs without adding VP in %s', (slug, a, b, total) => {
  const template = scoreTemplateSchema.parse(
    JSON.parse(
      readFileSync(
        decodeURIComponent(
          new URL(`../../../../data/staging/score-templates/${slug}.json`, import.meta.url)
            .pathname,
        ),
        'utf8',
      ),
    ),
  );
  const values = slug.startsWith('a-game-of-thrones') ? [a, b, { ironThronePlace: 3 }] : [a, b];
  const result = computeScores(template, {
    players: values.map((value, index) => ({ id: String(index), values: value })),
    playerCount: values.length,
  });
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error(result.error.message);
  expect(result.value.winners).toEqual(['1']);
  expect(result.value.players.slice(0, 2).map((p) => p.total)).toEqual([total, total]);
});
