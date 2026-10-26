import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { computeScores, type RawValue } from './compute.js';
import { scoreTemplateSchema, type ScoreTemplate } from './template-schema.js';
import { validateTemplate } from './validate.js';

const load = (slug: string): ScoreTemplate =>
  scoreTemplateSchema.parse(
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
const applejack = load('applejack-2022');
const harmonies = load('harmonies');
type Values = Record<string, RawValue>;
const honeyKeys = [
  'honeyBrown',
  'honeyDarkGreen',
  'honeyLightGreen',
  'honeyRed',
  'honeyPink',
  'honeyOrange',
  'honeyYellow',
] as const;
const honey = (...counts: number[]): Values =>
  Object.fromEntries(honeyKeys.map((key, i) => [key, counts[i] ?? 0]));
const score = (template: ScoreTemplate, ...values: Values[]) => {
  const result = computeScores(template, {
    playerCount: values.length,
    players: values.map((v, i) => ({ id: `p${i + 1}`, values: v })),
  });
  if (!result.ok) throw new Error(`${result.error.code}: ${result.error.message}`);
  return result.value;
};
const invalid = (template: ScoreTemplate, values: Values) =>
  computeScores(template, {
    playerCount: 2,
    players: [
      { id: 'p1', values },
      { id: 'p2', values: {} },
    ],
  });

const landscape: Values = {
  trees: { height1: 2, height2: 1, height3: 1 },
  mountains: { height1: 1, height2: 2, height3: 1 },
  fields: 3,
  buildings: 2,
  riverSideA: 8,
  islandsSideB: 3,
  animalCards: [3, 0, 8, 2],
  natureSpirit: 5,
  animalCubesPlaced: 7,
};

it.each([applejack, harmonies])('$name v2 validates for competitive 2–4 players', (template) => {
  expect(validateTemplate(template).ok).toBe(true);
  expect(template).toMatchObject({
    templateVersion: 2,
    playerCount: { min: 2, max: 4 },
    mode: 'competitive',
    sharedVictoryOnTie: true,
  });
});

describe('Applejack honey counters', () => {
  it('scores the official final-scoring example as 121', () => {
    const result = score(
      applejack,
      { ...honey(2, 2, 0, 3, 8, 3, 0), blossoms: 12, honeySupply: 62 },
      {},
    );
    expect(result.players[0]).toMatchObject({
      total: 121,
      categories: {
        honeyBrown: 4,
        honeyDarkGreen: 4,
        honeyLightGreen: 0,
        honeyRed: 6,
        honeyPink: 16,
        honeyOrange: 6,
        honeyYellow: 0,
        profitableVarieties: 5,
        varietyBonus: 11,
        blossoms: 12,
        honeySupply: 62,
      },
    });
    expect(result.winners).toEqual(['p1']);
    expect(result.warnings).toEqual([]);
  });

  it.each([
    [0, 0],
    [1, 0],
    [2, 0],
    [3, 0],
    [4, 4],
    [5, 11],
    [6, 21],
    [7, 35],
  ])('derives the bonus for %i profitable varieties as %i', (varieties, bonus) => {
    const result = score(applejack, honey(...Array<number>(varieties).fill(1)), {});
    expect(result.players[0]?.categories).toMatchObject({
      profitableVarieties: varieties,
      varietyBonus: bonus,
    });
    expect(result.players[0]?.total).toBe(varieties * 2 + bonus);
  });

  it('ignores raw derived values and doubles only harvested honey', () => {
    const result = score(
      applejack,
      {
        ...honey(1, 1, 1, 1),
        profitableVarieties: 7,
        varietyBonus: 35,
        blossoms: 5,
        honeySupply: 9,
      },
      {},
    );
    expect(result.players[0]?.total).toBe(8 + 4 + 5 + 9);
    expect(result.players[0]?.categories).toMatchObject({
      profitableVarieties: 4,
      varietyBonus: 4,
      blossoms: 5,
      honeySupply: 9,
    });
  });

  it('gives each color one variety regardless of its honey amount', () => {
    const result = score(applejack, honey(20), {});
    expect(result.players[0]).toMatchObject({
      total: 40,
      categories: { profitableVarieties: 1, varietyBonus: 0 },
    });
  });

  it('shares victory at zero or equal totals', () => {
    const empty = score(applejack, {}, {});
    expect(empty.players.map((p) => p.total)).toEqual([0, 0]);
    expect(empty.winners).toEqual(['p1', 'p2']);
    const tie = score(applejack, { honeyBrown: 2 }, { blossoms: 4 });
    expect(tie.players.map((p) => p.rank)).toEqual([1, 1]);
    expect(tie.winners).toEqual(['p1', 'p2']);
    expect(tie.tieUnresolved).toBe(false);
  });

  it.each(honeyKeys)('rejects negative honey in %s', (key) => {
    expect(invalid(applejack, { [key]: -1 })).toMatchObject({
      ok: false,
      error: { code: 'INPUT_INVALID' },
    });
  });
});

describe('Harmonies landscape counters', () => {
  it.each([
    [0, 92, 23, 0],
    [1, 84, 0, 15],
  ])('scores the golden vector on side %i as %i', (boardSide, total, river, islands) => {
    const result = score(harmonies, { ...landscape, boardSide }, {});
    expect(result.players[0]).toMatchObject({
      total,
      categories: {
        boardSide,
        trees: 12,
        mountains: 14,
        fields: 15,
        buildings: 10,
        riverSideA: river,
        islandsSideB: islands,
        animalCards: 13,
        natureSpirit: 5,
        animalCubesPlaced: 7,
      },
    });
    expect(result.warnings).toEqual([]);
  });

  it('defaults to side A and excludes stale island data', () => {
    const result = score(harmonies, { riverSideA: 8, islandsSideB: 10 }, {});
    expect(result.players[0]).toMatchObject({
      total: 23,
      categories: { boardSide: 0, riverSideA: 23, islandsSideB: 0 },
    });
  });

  it('uses the shared side for all players and excludes their stale river data', () => {
    const result = score(
      harmonies,
      { boardSide: 1, islandsSideB: 3, riverSideA: 15 },
      { islandsSideB: 2, riverSideA: 8 },
    );
    expect(result.players.map((p) => p.total)).toEqual([15, 10]);
    for (const player of result.players)
      expect(player.categories).toMatchObject({ boardSide: 1, riverSideA: 0 });
    expect(result.winners).toEqual(['p1']);
  });

  it('defaults to one island on side B when its counter is absent', () => {
    const result = score(harmonies, { boardSide: 1 }, {});
    expect(result.players.map((p) => p.total)).toEqual([5, 5]);
    expect(result.players.map((p) => p.categories.islandsSideB)).toEqual([5, 5]);
  });

  it('rejects an explicit zero islands instead of treating it as a valid default', () => {
    expect(invalid(harmonies, { boardSide: 1, islandsSideB: 0 })).toMatchObject({
      ok: false,
      error: { code: 'INPUT_INVALID' },
    });
  });

  it.each([
    [0, 0],
    [1, 0],
    [2, 2],
    [3, 5],
    [4, 8],
    [5, 11],
    [6, 15],
    [7, 19],
    [8, 23],
    [14, 47],
    [15, 51],
  ])('scores a river of length %i as %i with no cap at 14', (riverSideA, points) => {
    expect(score(harmonies, { riverSideA }, {}).players[0]?.total).toBe(points);
  });

  it('sums unfinished, untouched and completed animal card values and allows edits', () => {
    expect(score(harmonies, { animalCards: [3, 0, 8, 2] }, {}).players[0]?.total).toBe(13);
    expect(score(harmonies, { animalCards: [3, 8, 5] }, {}).players[0]?.total).toBe(16);
    expect(score(harmonies, { animalCards: [] }, {}).players[0]?.total).toBe(0);
  });

  it('breaks equal totals by placed animal cubes without adding cubes to the total', () => {
    const result = score(
      harmonies,
      { animalCards: [8], animalCubesPlaced: 2 },
      { animalCards: [8], animalCubesPlaced: 7 },
    );
    expect(result.players.map((p) => p.total)).toEqual([8, 8]);
    expect(result.players.map((p) => p.rank)).toEqual([2, 1]);
    expect(result.winners).toEqual(['p2']);
  });

  it('shares victory when totals and placed animal cubes are equal', () => {
    const result = score(harmonies, { ...landscape }, { ...landscape });
    expect(result.players.map((p) => p.rank)).toEqual([1, 1]);
    expect(result.winners).toEqual(['p1', 'p2']);
    expect(result.tieUnresolved).toBe(false);
  });

  it.each<Values>([{ boardSide: -1 }, { boardSide: 2 }, { riverSideA: -1 }])(
    'rejects out-of-range scalar counts %j',
    (values) => {
      expect(invalid(harmonies, values)).toMatchObject({
        ok: false,
        error: { code: 'INPUT_INVALID' },
      });
    },
  );
});
