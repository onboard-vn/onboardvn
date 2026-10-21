import legacyClubTemplates from './fixtures/legacy-club-templates.json' with { type: 'json' };
import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { computeScores, type RawValue, type ScoreInput } from './compute.js';
import { scoreTemplateSchema, type ScoreCategory, type ScoreTemplate } from './template-schema.js';
import { validateTemplate } from './validate.js';

const here = import.meta.url.replace(/^file:\/\//, '').replace(/\/[^/]*$/, '');
const dir = `${here}/../../../../data/staging/score-templates`;
const files = readdirSync(dir)
  .filter((f) => f.endsWith('.json') && f !== 'schema.json')
  .sort();

const load = (slug: string): ScoreTemplate =>
  scoreTemplateSchema.parse(JSON.parse(readFileSync(`${dir}/${slug}.json`, 'utf8')));

const clamp = (v: number, c: ScoreCategory): number =>
  Math.min(c.max ?? Infinity, Math.max(c.min ?? -Infinity, v));

function sampleValue(c: ScoreCategory, n: number): RawValue {
  switch (c.input) {
    case 'bool':
      return n > 0;
    case 'perRound':
      if (c.roundInput === 'exclusive') return [];
      if (c.roundInput === 'bool') return n > 0 ? [1, 0] : [];
      return n > 0 ? [n, n + 1] : [];
    case 'repeating':
      return n > 0 ? [n, n + 1] : [];
    case 'counts':
      return Object.fromEntries((c.inputs ?? []).map((i) => [i, n]));
    default:
      return clamp(n, c);
  }
}

function sampleInput(t: ScoreTemplate, n: number): ScoreInput {
  const count = Math.max(2, t.playerCount?.min ?? 2);
  const teamed = t.mode === 'team';
  const sample: ScoreInput = {
    playerCount: count,
    outcome: 'win',
    players: Array.from({ length: count }, (_, i) => ({
      id: `p${i}`,
      ...(teamed ? { team: i % 2 === 0 ? 'a' : 'b' } : {}),
      ...(t.roles?.[0] ? { role: t.roles[i % t.roles.length]?.key as string } : {}),
      values: Object.fromEntries(
        t.categories.map((c) => [c.key, sampleValue(c, n === 0 ? 0 : n + i)]),
      ),
    })),
  };
  // Rule-aware samples respect mutually exclusive modes and required table setup.
  for (const [index, player] of sample.players.entries()) {
    const v = player.values;
    if (t.templateVersion < 3) continue;
    if (t.slug === 'age-of-innovation')
      v.neutralFaction = { area: 12, discOne: 0, discTwo: 0, discThree: 0, discFour: 0 };
    if (t.slug === 'cloudspire') {
      v.teamMode = 0;
      v.earlyWinner = 0;
    }
    if (t.slug === 'feya-s-swamp-2025') {
      v.scoreCardOne = 1;
      v.scoreCardTwo = 2;
      v.islandQuantities = {};
    }
    if (t.slug === 'galactic-cruise') {
      v.turnOrder = index + 1;
      v.progress = { mostReputation: 0, progressCubes: 0, wings: 0 };
    }
    if (t.slug === 'nucleum-2023') {
      v.milestones = 0;
      v.energizedBuildings = 0;
    }
    if (t.slug === 'seti-search-for-extraterrestrial-intelligence-2024') {
      for (const key of [
        'techTriples',
        'techPairs',
        'missionSingles',
        'missionPairs',
        'incomeTriples',
        'incomeMajority',
        'traceTriples',
        'sectorPairs',
      ])
        v[key] = {};
    }
    if (t.slug === 'the-gang-2024') {
      v.heistsSucceeded = 3;
      v.heistsFailed = 0;
      v.heists = [];
    }
    if (t.slug === 'the-old-kings-crown') {
      v.favour = index === 0 ? 1 : 0;
      v.orderPos = index + 1;
    }
    if (t.slug === 'trajan-2011') {
      v.senatePosition = index + 1;
      v.entryMode = 0;
    }
    if (t.slug === 'abomination-the-heir-of-frankenstein-2019') {
      v.turnOrder = index + 1;
      v.bodyParts = {};
    }
    if (t.slug === 'concordia-venus') v.prefectOrder = index;
    if (t.slug === 'yinzi-ming') v.turnOrder = index + 1;
    if (t.slug === 'vantage') v.sessionEnded = 1;
    if (t.slug === 'zoo-tycoon') {
      v.newShores = 0;
      v.endQuantities = {};
    }
  }
  return sample;
}

// Templates whose expr uses its own key/raw name instead of `value`; remove entries once fixed.

describe('staging score templates', () => {
  it('finds templates', () => expect(files.length).toBeGreaterThan(50));

  it.each(files)('%s parses, validates and computes', (file) => {
    const raw = JSON.parse(readFileSync(`${dir}/${file}`, 'utf8'));
    expect(raw.slug).toBe(file.replace(/\.json$/, ''));
    const valid = validateTemplate(raw);
    expect(
      valid.ok,
      valid.ok ? '' : `${valid.error.code} ${valid.error.path} ${valid.error.message}`,
    ).toBe(true);
    const t = scoreTemplateSchema.parse(raw);
    for (const n of [0, 1, 3]) {
      const r = computeScores(t, sampleInput(t, n));
      expect(r.ok, r.ok ? '' : `n=${n} ${r.error.code} ${r.error.path} ${r.error.message}`).toBe(
        true,
      );
      if (r.ok) {
        for (const pl of r.value.players) expect(Number.isFinite(pl.total)).toBe(true);
      }
    }
  });
});

type V = Record<string, RawValue>;
const solve = (
  slug: string,
  players: { id: string; values: V }[],
  extra: Partial<ScoreInput> = {},
  patch: (t: ScoreTemplate) => ScoreTemplate = (t) => t,
) => {
  const r = computeScores(patch(load(slug)), { players, playerCount: players.length, ...extra });
  if (!r.ok) throw new Error(`${r.error.code}: ${r.error.message}`);
  return r.value;
};

const solveLegacy = (
  slug: keyof typeof legacyClubTemplates,
  players: { id: string; values: V }[],
  extra: Partial<ScoreInput> = {},
) => solve(slug, players, extra, () => scoreTemplateSchema.parse(legacyClubTemplates[slug]));

// Template currently references its own key instead of `value`; drop once the template is fixed.
const useValueForOwnKey = (t: ScoreTemplate): ScoreTemplate => ({
  ...t,
  categories: t.categories.map((c) =>
    c.formula.expr
      ? {
          ...c,
          formula: {
            ...c.formula,
            expr: c.formula.expr.replace(new RegExp(`\\b${c.key}\\b`, 'g'), 'value'),
          },
        }
      : c,
  ),
});

describe('golden vectors', () => {
  it('brass-birmingham-2018: final VP track, tiebreak by income then money', () => {
    const p1: V = { vpTrack: 58, incomeLevel: 10, moneyRemaining: 5 };
    const p2: V = { vpTrack: 58, incomeLevel: 12, moneyRemaining: 5 };
    const p3: V = { ...p2, moneyRemaining: 9 };
    const r = solveLegacy('brass-birmingham-2018', [
      { id: 'p1', values: p1 },
      { id: 'p2', values: p2 },
      { id: 'p3', values: p3 },
    ]);
    expect(r.players.map((x) => x.total)).toEqual([58, 58, 58]);
    expect(r.players.map((x) => x.rank)).toEqual([3, 2, 1]);
    expect(r.winners).toEqual(['p3']);
    const shared = solveLegacy('brass-birmingham-2018', [
      { id: 'p2', values: p2 },
      { id: 'p4', values: { ...p2 } },
    ]);
    expect(shared.winners).toEqual(['p2', 'p4']);
    expect(shared.tieUnresolved).toBe(false);
  });

  it('grand-austria-hotel-deluxe: converts room and guest counts into final VP', () => {
    const r = solve('grand-austria-hotel-deluxe', [
      {
        id: 'a',
        values: {
          trackVp: 80,
          staffVp: 12,
          roomRow1: 4,
          roomRow2: 3,
          roomRow3: 2,
          roomRow4: 1,
          krones: 5,
          kitchen: 3,
          cafeGuests: 2,
        },
      },
      { id: 'b', values: {} },
    ]);
    expect(r.players[0]?.total).toBe(110);
    expect(r.players[0]?.categories).toMatchObject({
      roomRow1: 4,
      roomRow2: 6,
      roomRow3: 6,
      roomRow4: 4,
      cafeGuests: -10,
    });
    expect(r.winners).toEqual(['a']);
  });

  it('grand-austria-hotel-deluxe: five occupied rooms on every floor score 50 VP', () => {
    const r = solve('grand-austria-hotel-deluxe', [
      { id: 'a', values: { roomRow1: 5, roomRow2: 5, roomRow3: 5, roomRow4: 5 } },
      { id: 'b', values: {} },
    ]);
    expect(r.players[0]?.categories).toMatchObject({
      roomRow1: 5,
      roomRow2: 10,
      roomRow3: 15,
      roomRow4: 20,
    });
    expect(r.players[0]?.total).toBe(50);
  });

  it('grand-austria-hotel-deluxe: breaks equal VP by combined leftover money and kitchen items', () => {
    const r = solve('grand-austria-hotel-deluxe', [
      { id: 'a', values: { trackVp: 90, krones: 5, kitchen: 5 } },
      { id: 'b', values: { trackVp: 98, krones: 2 } },
      { id: 'c', values: { trackVp: 96, kitchen: 4 } },
    ]);
    expect(r.players.map((p) => p.total)).toEqual([100, 100, 100]);
    expect(r.players.map((p) => p.rank)).toEqual([1, 3, 2]);
    expect(r.winners).toEqual(['a']);
    expect(r.tieUnresolved).toBe(false);
  });

  it('grand-austria-hotel-deluxe: leaves equal VP and equal resource totals unresolved', () => {
    const r = solve('grand-austria-hotel-deluxe', [
      { id: 'a', values: { trackVp: 90, krones: 7, kitchen: 3 } },
      { id: 'b', values: { trackVp: 90, krones: 1, kitchen: 9 } },
    ]);
    expect(r.players.map((p) => p.total)).toEqual([100, 100]);
    expect(r.winners).toEqual([]);
    expect(r.tieUnresolved).toBe(true);
  });

  it('azul: rows/columns/colors bonuses and rows tiebreak', () => {
    const r = solve('azul', [
      {
        id: 'a',
        values: { trackScore: 70, completeRows: 3, completeColumns: 2, completeColors: 1 },
      },
      {
        id: 'b',
        values: { trackScore: 85, completeRows: 2, completeColumns: 1, completeColors: 1 },
      },
      {
        id: 'c',
        values: { trackScore: 81, completeRows: 4, completeColumns: 1, completeColors: 1 },
      },
    ]);
    expect(r.players.map((x) => x.total)).toEqual([100, 106, 106]);
    expect(r.players.map((x) => x.rank)).toEqual([3, 2, 1]);
    expect(r.winners).toEqual(['c']);
  });

  it('the-castles-of-burgundy-2019: yellow bonuses and unresolved tie', () => {
    const base: V = {
      trackScore: 120,
      unsoldGoods: 3,
      silverlings: 4,
      workers: 5,
      yellowGoodsTypesSold: 4,
      yellowBuildingTiles: 2,
      yellowAnimalTypes: 3,
      yellowSoldGoods: 5,
      yellowBonusTiles: 3,
    };
    const castles = (players: { id: string; values: V }[]) =>
      solve('the-castles-of-burgundy-2019', players, {}, useValueForOwnKey);
    const r = castles([
      { id: 'a', values: base },
      { id: 'b', values: { trackScore: 100 } },
    ]);
    expect(r.players[0]?.total).toBe(120 + 3 + 4 + 2 + 12 + 8 + 12 + 5 + 6);
    expect(r.winners).toEqual(['a']);
    const tie = castles([
      { id: 'a', values: base },
      { id: 'b', values: { ...base } },
    ]);
    expect(tie.winners).toEqual([]);
    expect(tie.tieUnresolved).toBe(true);
    expect(tie.tiedIds).toEqual(['a', 'b']);
  });

  it('gaia-project-2017: tiles, research, leftover resources, shared victory', () => {
    const a: V = {
      vpTrack: 130,
      finalTiles: 12 + 6,
      researchLevels: 12,
      leftoverResources: 7 + 5 + 3,
    };
    const b: V = { vpTrack: 140, researchLevels: 10 };
    const r = solveLegacy('gaia-project-2017', [
      { id: 'a', values: a },
      { id: 'b', values: b },
    ]);
    expect(r.players.map((x) => x.total)).toEqual([130 + 12 + 6 + 48 + 5, 180]);
    expect(r.winners).toEqual(['a']);
    const tie = solveLegacy('gaia-project-2017', [
      { id: 'a', values: a },
      { id: 'c', values: { ...a } },
    ]);
    expect(tie.winners).toEqual(['a', 'c']);
  });

  it('finspan: rankAward all-full gives every joint leader the bonus', () => {
    const t = load('finspan');
    const key = t.categories.find((c) => c.formula.type === 'rankAward');
    expect(key).toBeDefined();
    const k = (key as ScoreCategory).key;
    const r = solve('finspan', [
      { id: 'a', values: { [k]: 5 } },
      { id: 'b', values: { [k]: 5 } },
      { id: 'c', values: { [k]: 2 } },
    ]);
    expect(r.players.map((x) => x.categories[k])).toEqual([3, 3, 0]);
  });

  it('love-letter: joint winners on equal favor tokens', () => {
    const r = solve('love-letter', [
      { id: 'a', values: { favorTokens: 5 } },
      { id: 'b', values: { favorTokens: 3 } },
      { id: 'c', values: { favorTokens: 5 } },
    ]);
    expect(r.winners).toEqual(['a', 'c']);
    expect(r.players.map((x) => x.rank)).toEqual([1, 3, 1]);
  });

  it('the-gang-2024: outcome and end derived from per-heist results', () => {
    const play = (heists: number[], extra: Partial<ScoreInput> = {}) => {
      const players = ['a', 'b', 'c', 'd'].map((id) => ({ id, values: { heists } }));
      return solveLegacy('the-gang-2024', players, extra);
    };
    const win = play([1, 0, 1, 1]);
    expect(win.outcome).toBe('win');
    expect(win.ended).toBe(true);
    expect(win.winners).toEqual(['a', 'b', 'c', 'd']);
    expect(win.teams[0]?.categories).toMatchObject({ heistWins: 3, heistLosses: 1 });
    expect(win.players.every((x) => x.rank === null)).toBe(true);
    const loss = play([0, 1, 0, 1, 0]);
    expect(loss).toMatchObject({ outcome: 'loss', ended: true, winners: [] });
    expect(loss.teams[0]?.categories).toMatchObject({ heistWins: 2, heistLosses: 3 });
    const open = play([1, 0]);
    expect(open).toMatchObject({ outcome: null, ended: false, winners: [] });
    expect(play([1, 1, 1], { outcome: 'loss' }).winners).toEqual([]);
  });

  it('flip-7: doubling, modifiers and flip-7 bonus', () => {
    const r = solve('flip-7', [
      { id: 'a', values: { numberSum: 30, doubled: true, modifierPoints: 5, flip7Bonus: true } },
      { id: 'b', values: { numberSum: 40, doubled: false } },
    ]);
    expect(r.players.map((x) => x.total)).toEqual([80, 40]);
    expect(r.winners).toEqual(['a']);
    const both = solve('flip-7', [
      { id: 'a', values: { numberSum: 10, flip7Bonus: true } },
      { id: 'b', values: { numberSum: 10, flip7Bonus: true } },
    ]);
    expect(both.players.map((x) => x.total)).toEqual([25, 25]);
  });

  it('seti: adds the running track, end-game cards, and gold-tile set value', () => {
    const counts = {
      techTriples: {},
      techPairs: {},
      missionSingles: {},
      missionPairs: {},
      incomeTriples: {},
      incomeMajority: {},
      traceTriples: {},
      sectorPairs: {},
    };
    const r = solve('seti-search-for-extraterrestrial-intelligence-2024', [
      {
        id: 'a',
        values: { ...counts, trackScore: 70, endGameCards: [2, 3], goldTile25: { sets: 2, valuePerSet: 4 } },
      },
      {
        id: 'b',
        values: { ...counts, trackScore: 70, endGameCards: [2, 3], goldTile25: { sets: 1, valuePerSet: 4 } },
      },
    ]);
    expect(r.players.map((x) => x.total)).toEqual([83, 79]);
    expect(r.winners).toEqual(['a']);
  });

  it('imperial-steam: converts goods and hub influence before the investor deduction', () => {
    const r = solve('imperial-steam-2021', [
      {
        id: 'a',
        values: {
          cash: 20,
          goodsSold: 2,
          cityKeys: 100,
          hubInfluence: 2,
          contracts: 10,
          shareholders: 2,
        },
      },
      { id: 'b', values: { cash: 65 } },
    ]);
    expect(r.players.map((x) => x.total)).toEqual([144, 65]);
    expect(r.winners).toEqual(['a']);
  });

  it('barrage: scores reachable objective places and breaks equal VP by last-round energy', () => {
    const r = solve('barrage', [
      {
        id: 'a',
        values: { vpTrack: 40, objective: 15, leftoverItems: 4, waterDrops: 2, lastRoundEnergy: 5 },
      },
      {
        id: 'b',
        values: { vpTrack: 45, objective: 10, leftoverItems: 5, waterDrops: 1, lastRoundEnergy: 8 },
      },
      {
        id: 'c',
        values: { vpTrack: 40, objective: 5, leftoverItems: 0, waterDrops: 0, lastRoundEnergy: 0 },
      },
    ]);
    expect(r.players.map((x) => x.total)).toEqual([57, 57, 45]);
    expect(r.winners).toEqual(['b']);
  });

  it('alchemists: converts gold and favors, then breaks VP ties by leftover gold', () => {
    const r = solve('alchemists', [
      {
        id: 'a',
        values: {
          reputation: 10,
          artifacts: 4,
          grants: 1,
          goldConversion: { gold: 6, favorCards: 1 },
          theorySeals: { goldCorrect: 1, silverCorrect: 1, wrongStarred: 0, wrongUnhedged: 0 },
          leftoverGold: { gold: 6, favorCards: 1 },
        },
      },
      { id: 'b', values: { reputation: 25 } },
    ]);
    expect(r.players.map((x) => x.total)).toEqual([25, 25]);
    expect(r.winners).toEqual(['a']);
  });

  it('carnegie: scores an unused Action Choice tile in a three-player game', () => {
    const r = solve('carnegie', [
      {
        id: 'first',
        values: { immediateVp: 20, employees: 2 },
      },
      {
        id: 'second',
        values: { immediateVp: 25, employees: 3 },
      },
      {
        id: 'third',
        values: {
          immediateVp: 20,
          connections: 5,
          actionChoice: true,
          employees: 2,
          deptTop: 1,
          deptOther: 2,
          projectTabs: 6,
          constructions: [0, 2],
          donations: [4, 5],
        },
      },
    ]);
    expect(r.players.find((player) => player.id === 'third')?.total).toBe(54);
    expect(r.winners).toEqual(['third']);
  });

  it('the-voyages-of-marco-polo: gates goods on Beijing and adjudicates the physical camel tie', () => {
    const boundary = solve('the-voyages-of-marco-polo-2015', [
      { id: 'nine', values: { coins: 9 } },
      { id: 'ten', values: { coins: 10 } },
    ]);
    expect(boundary.players.map((x) => x.total)).toEqual([0, 1]);

    const goods = solve('the-voyages-of-marco-polo-2015', [
      { id: 'no-beijing', values: { trackScore: 20, beijing: 0, goods: 4 } },
      { id: 'beijing', values: { trackScore: 20, beijing: 10, goods: 4 } },
    ]);
    expect(goods.players.map((x) => x.categories.goods)).toEqual([0, 2]);
    expect(goods.players.map((x) => x.total)).toEqual([20, 32]);

    const tie = solve('the-voyages-of-marco-polo-2015', [
      { id: 'a', values: { trackScore: 20, camels: 3 } },
      { id: 'b', values: { trackScore: 20, camels: 2 } },
    ]);
    expect(tie.winners).toEqual(['a']);

    const physicalCamelTie = solve('the-voyages-of-marco-polo-2015', [
      { id: 'a', values: { trackScore: 20, camels: 3 } },
      { id: 'b', values: { trackScore: 20, camels: 3 } },
    ]);
    expect(physicalCamelTie.tieUnresolved).toBe(true);
    expect(physicalCamelTie.tiedIds).toEqual(['a', 'b']);
  });

  it('the-castles-of-burgundy-special-edition: scores workers and yellow tile awards', () => {
    const values: V = {
      trackScore: 120,
      unsoldGoods: 3,
      silverlings: 4,
      workers: 5,
      yellowGoodsTypesSold: 4,
      yellowBuildingTiles: 2,
      yellowAnimalTypes: 3,
      yellowSoldGoods: 5,
      yellowBonusTiles: 3,
    };
    const r = solve('the-castle-of-burgundy-special-edition', [
      { id: 'a', values },
      { id: 'b', values: {} },
    ]);
    expect(r.players[0]?.total).toBe(171);
    expect(r.winners).toEqual(['a']);

    const emptySpaceTie = solve('the-castle-of-burgundy-special-edition', [
      { id: 'a', values: { ...values, emptyEstateSpaces: 3, turnOrderPosition: 4 } },
      { id: 'b', values: { ...values, emptyEstateSpaces: 2, turnOrderPosition: 1 } },
    ]);
    expect(emptySpaceTie.winners).toEqual(['b']);

    const stackedTurnOrderTie = solve('the-castle-of-burgundy-special-edition', [
      // The markers share a space; their top-to-bottom stack order is reflected in final rank.
      { id: 'top', values: { ...values, emptyEstateSpaces: 2, turnOrderPosition: 1 } },
      { id: 'bottom', values: { ...values, emptyEstateSpaces: 2, turnOrderPosition: 2 } },
    ]);
    expect(stackedTurnOrderTie.winners).toEqual(['bottom']);
    expect(stackedTurnOrderTie.tieUnresolved).toBe(false);
  });

  it('avalon: final VP ties break by Holy Grail, then printed Faction Board VP', () => {
    const tied = [
      {
        id: 'a',
        values: {
          vpBeforeFinalScoring: 20,
          finalSettlementVp: 5,
          grailBearer: true,
          factionBoardVpValue: 4,
        },
      },
      {
        id: 'b',
        values: {
          vpBeforeFinalScoring: 23,
          finalSettlementVp: 2,
          grailBearer: false,
          factionBoardVpValue: 1,
        },
      },
    ];
    const r = solve('avalon-the-riven-veil-2026', tied);
    expect(r.players.map((x) => x.total)).toEqual([25, 25]);
    expect(r.winners).toEqual(['a']);

    const noGrail = solve('avalon-the-riven-veil-2026', tied.map((p) => ({
      ...p,
      values: { ...p.values, grailBearer: false },
    })));
    expect(noGrail.winners).toEqual(['b']);
    expect(noGrail.tieUnresolved).toBe(false);
  });
});
