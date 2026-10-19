import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { computeScores, type RawValue, type ScoreInput } from '../compute.js';
import { scoreTemplateSchema, type ScoreTemplate } from '../template-schema.js';
import { validateTemplate } from '../validate.js';
import { prepareStrategyScoring, rankWithNeutral } from './prepare.js';

const slugs = [
  'seti-search-for-extraterrestrial-intelligence-2024',
  'nucleum-2023',
  'agricola-2007',
  'agricola-15-2022',
  'amsterdam',
  'great-western-trail',
  'dune-imperium-uprising-2023',
  'terra-mystica',
  'age-of-innovation',
];
const load = (slug: string): ScoreTemplate =>
  scoreTemplateSchema.parse(
    JSON.parse(
      readFileSync(
        new URL(`../../../../../data/staging/score-templates/${slug}.json`, import.meta.url)
          .pathname,
        'utf8',
      ),
    ),
  );
const input = (values: Record<string, RawValue>[]): ScoreInput => ({
  players: values.map((values, i) => ({ id: String(i), values })),
  playerCount: values.length,
});
const solve = (slug: string, values: Record<string, RawValue>[]) => {
  const original = load(slug);
  const raw = input(values);
  const result = computeScores(original, raw);
  if (!result.ok) throw new Error(result.error.message);
  return result.value;
};

describe('club strategy quantities', () => {
  it.each(slugs)('%s validates the complete versioned contract', (slug) => {
    expect(validateTemplate(load(slug)).ok).toBe(true);
    expect(load(slug).templateVersion).toBe(3);
  });

  it('retains legacy pinned definitions without preparation', () => {
    for (const slug of slugs) {
      const old = { ...load(slug), templateVersion: 1 };
      expect(prepareStrategyScoring(old, input([{}, {}]))).toBeNull();
    }
    const incomplete = load('terra-mystica');
    incomplete.categories = incomplete.categories.filter((c) => c.key !== 'alchemists');
    expect(prepareStrategyScoring(incomplete, input([{}, {}]))).toBeNull();
  });

  it.each(['agricola-2007', 'agricola-15-2022'])(
    '%s converts farm quantities and breaks ties with resources',
    (slug) => {
      const farm = {
        fields: 5,
        pastures: 4,
        grain: 8,
        vegetables: 4,
        sheep: 8,
        wildBoar: 7,
        cattle: 6,
        fencedStables: 4,
        stoneRooms: 4,
        familyMembers: 5,
      };
      const result = solve(slug, [
        { ...farm, buildingResources: 7 },
        { ...farm, buildingResources: 4 },
      ]);
      expect(result.players.map((p) => p.total)).toEqual([55, 55]);
      expect(result.winners).toEqual(['0']);
      expect(
        solve(slug, [
          { ...farm, buildingResources: 7 },
          { ...farm, buildingResources: 7 },
        ]).winners,
      ).toEqual(['0', '1']);
    },
  );

  it('uses the Agricola field boundaries and penalties', () => {
    const values = [0, 1, 2, 4].map((fields) => ({ fields, beggingCards: 2 }));
    const result = solve('agricola-15-2022', values);
    expect(result.players.map((p) => p.categories.fields)).toEqual([-1, -1, 1, 3]);
    expect(result.players[0]!.categories.beggingCards).toBe(-6);
  });

  it('scores Amsterdam publisher leftovers example, penalties and Amstel tie', () => {
    const base = {
      trackScore: 50,
      penaltyTokens: 4,
      cityCrests: 6,
      leftovers: { commodities: 2, dockWorkers: 1, gulden: 5, resources: 4 },
    };
    const result = solve('amsterdam', [
      { ...base, amstelPosition: 8 },
      { ...base, amstelPosition: 5 },
    ]);
    expect(result.players[0]!.categories).toMatchObject({
      penaltyTokens: -22,
      cityCrests: 18,
      leftovers: 6,
    });
    expect(result.players.map((p) => p.total)).toEqual([52, 52]);
    expect(result.winners).toEqual(['0']);
    expect(
      solve('amsterdam', [{ leftovers: { commodities: 1 } }, {}]).players[0]!.categories.leftovers,
    ).toBe(0);
  });

  it('uses the GWT Second Edition final board quantities', () => {
    const result = solve('great-western-trail', [
      { dollars: 14, workers: 2, discSpace: true, jobMarket: true, objectives: -3 },
      {},
    ]);
    expect(result.players[0]!.total).toBe(12);
    expect(result.players[0]!.categories).toMatchObject({
      dollars: 2,
      workers: 8,
      discSpace: 3,
      jobMarket: 2,
    });
  });

  it('adds only additional Uprising intrigue VP then follows resource tiebreakers', () => {
    const result = solve('dune-imperium-uprising-2023', [
      { vpTrack: 9, endgameIntrigueVp: 2, spice: 4 },
      { vpTrack: 11, spice: 3 },
      { vpTrack: 10, spice: 99 },
    ]);
    expect(result.players.map((p) => p.total)).toEqual([11, 11, 10]);
    expect(result.winners).toEqual(['0']);
    for (const key of ['solari', 'water', 'troops']) {
      expect(
        solve('dune-imperium-uprising-2023', [
          { vpTrack: 10, [key]: 2 },
          { vpTrack: 10, [key]: 1 },
          {},
        ]).winners,
      ).toEqual(['0']);
    }
  });

  it('does not advertise Uprising six-player teams as standard competitive scoring', () => {
    expect(
      prepareStrategyScoring(
        load('dune-imperium-uprising-2023'),
        input(Array.from({ length: 6 }, () => ({}))),
      )?.error,
    ).toMatch(/player count/);
  });

  it('uses Alchemists coin conversion and pooled Terra Mystica ranks', () => {
    const result = solve('terra-mystica', [
      { coins: 8, alchemists: true, network: 10, fireCult: 9 },
      { coins: 8, network: 9, fireCult: 9 },
      { network: 9 },
      { network: 9 },
    ]);
    expect(result.players.map((p) => p.categories.network)).toEqual([18, 6, 6, 6]);
    expect(result.players.slice(0, 2).map((p) => p.categories.coins)).toEqual([4, 2]);
    expect(result.players.map((p) => p.categories.fireCult)).toEqual([6, 6, 0, 0]);
  });

  it('ranks real Age of Innovation players against a neutral faction without adding an identity', () => {
    const template = load('age-of-innovation');
    const neutralFaction = { area: 15, discOne: 7, discTwo: 2, discThree: 2, discFour: 2 };
    const raw = input([
      { area: 14, discOne: 6, neutralFaction },
      { area: 10, discOne: 3, neutralFaction },
    ]);
    const snapshot = structuredClone({ template, raw });
    const prepared = prepareStrategyScoring(template, raw)!;
    expect(prepared.error).toBeUndefined();
    expect(prepared.input.players.map((p) => p.values.area)).toEqual([12, 6]);
    expect(prepared.input.players.map((p) => p.values.discOne)).toEqual([4, 2]);
    expect(prepared.input.players).toHaveLength(2);
    expect({ template, raw }).toEqual(snapshot);
    expect(prepared.excludedIds).toBeUndefined();
    expect(rankWithNeutral([14, 10], 14, [18, 12, 6], true)).toEqual([15, 6]);
  });

  it('rejects missing, inconsistent or impossible neutral quantities', () => {
    const template = load('age-of-innovation');
    expect(prepareStrategyScoring(template, input([{}, {}]))?.error).toMatch(/requires/);
    const neutral = { area: 15, discOne: 7, discTwo: 2, discThree: 2, discFour: 2 };
    expect(
      prepareStrategyScoring(
        template,
        input([{ neutralFaction: neutral }, { neutralFaction: { ...neutral, area: 14 } }]),
      )?.error,
    ).toMatch(/agree/);
    expect(
      prepareStrategyScoring(template, input([{ neutralFaction: { ...neutral, area: 19 } }, {}]))
        ?.error,
    ).toMatch(/12–15/);
  });

  it('does not require neutral input in three-player Age of Innovation', () => {
    const result = solve('age-of-innovation', [{ area: 10 }, { area: 9 }, { area: 9 }]);
    expect(result.players.map((p) => p.categories.area)).toEqual([18, 9, 9]);
  });

  const seti = slugs[0]!;
  it.each([
    ['techTriples', { probe: 5, telescope: 2, computer: 3, rate: 3 }, 6],
    ['techPairs', { techs: 5, rate: 3 }, 6],
    ['missionSingles', { missions: 3, rate: 2 }, 6],
    ['missionPairs', { missions: 3, endCards: 2, rate: 3 }, 6],
    ['incomeTriples', { credits: 4, energy: 2, cards: 3, rate: 2 }, 4],
    ['incomeMajority', { credits: 4, energy: 2, rate: 2 }, 8],
    ['traceTriples', { red: 4, yellow: 3, blue: 2, rate: 3 }, 6],
    ['sectorPairs', { wins: 4, orbiters: 1, landers: 2, rate: 3 }, 9],
  ] as const)('calculates SETI %s from actual quantities', (key, quantities, expected) => {
    const result = solve(seti, [{ trackScore: 70, [key]: quantities }, {}]);
    expect(result.players[0]!.categories[key]).toBe(expected);
  });

  it('retains SETI legacy sets, rejects duplicate physical sides and scoring methods', () => {
    expect(
      solve(seti, [{ trackScore: 25, goldTile25: { sets: 2, valuePerSet: 3 } }, {}]).players[0]!
        .total,
    ).toBe(31);
    expect(
      prepareStrategyScoring(
        load(seti),
        input([{ trackScore: 70, techTriples: { rate: 3 }, techPairs: { rate: 3 } }, {}]),
      )?.error,
    ).toMatch(/one side/);
    expect(
      prepareStrategyScoring(
        load(seti),
        input([
          { trackScore: 70, techPairs: { rate: 3 }, goldTile25: { sets: 2, valuePerSet: 3 } },
          {},
        ]),
      )?.error,
    ).toMatch(/not both/);
    expect(
      prepareStrategyScoring(load(seti), input([{ trackScore: 0, techPairs: { rate: 3 } }, {}]))
        ?.error,
    ).toMatch(/milestones/);
  });

  it('records Space Agencies organizations as four rounds numbered 2–5', () => {
    const template = load(seti);
    const prepared = prepareStrategyScoring(
      template,
      input([{ organizations: true }, { organizations: true }]),
    )!;
    expect(prepared.template.rounds?.count).toBe(4);
    expect(prepared.template.rounds?.endCondition).toMatch(/2, 3, 4 and 5/);
    expect(template.rounds?.count).toBe(5);
  });

  it('uses printed Nucleum milestone multipliers, floor sets and final conversions', () => {
    const result = solve('nucleum-2023', [
      {
        milestone1: { quantity: 5, perSet: 2, multiplier: 7 },
        zeroMarkers: 2,
        leftoverUranium: 5,
        leftoverWorkers: 3,
        leftoverThaler: 14,
        incomeThaler: 1,
        incomeWorker: 2,
        incomeVp: 3,
      },
      {},
    ]);
    expect(result.players[0]!.categories).toMatchObject({
      milestone1: 14,
      zeroMarkers: -6,
      leftoverUranium: 2,
      leftoverWorkers: 1,
      leftoverThaler: 2,
    });
    expect(result.players[0]!.total).toBe(32);
  });

  it('scores the Nucleum publisher building example and rejects incomplete or duplicate calculations', () => {
    const result = solve('nucleum-2023', [
      {
        ordinaryBuildings: { normalVp: 2, prahaVp: 4 },
        governmentBuildings: { normalCount: 0, normalRate: 0, prahaCount: 5, prahaRate: 2 },
      },
      {},
    ]);
    expect(result.players[0]!.total).toBe(30);
    expect(
      prepareStrategyScoring(load('nucleum-2023'), input([{ milestone1: { quantity: 5 } }, {}]))
        ?.error,
    ).toMatch(/set size/);
    expect(
      prepareStrategyScoring(
        load('nucleum-2023'),
        input([{ milestones: [4], milestone1: { quantity: 2, perSet: 1, multiplier: 4 } }, {}]),
      )?.error,
    ).toMatch(/both/);
  });

  it('rejects fractional, negative, unknown nested quantities and invalid booleans', () => {
    for (const leftovers of [{ gulden: 1.5 }, { gulden: -1 }, { nonexistent: 1 }] as Record<
      string,
      number
    >[]) {
      expect(
        prepareStrategyScoring(load('amsterdam'), input([{ leftovers }, {}]))?.error,
      ).toBeTruthy();
    }
    expect(
      prepareStrategyScoring(load('terra-mystica'), input([{ alchemists: 2 }, {}]))?.error,
    ).toMatch(/yes or no/);
  });
});
