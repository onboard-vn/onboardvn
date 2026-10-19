import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { computeScores, type ScoreInput } from '../compute.js';
import { scoreTemplateSchema } from '../template-schema.js';
import { prepareEuroScoring } from './prepare.js';

const template = (slug: string) =>
  scoreTemplateSchema.parse(
    JSON.parse(
      readFileSync(
        fileURLToPath(
          new URL(`../../../../../data/staging/score-templates/${slug}.json`, import.meta.url),
        ),
        'utf8',
      ),
    ),
  );
const solve = (
  slug: string,
  values: ScoreInput['players'][number]['values'][],
  count = values.length,
) => {
  const t = template(slug);
  const input: ScoreInput = {
    playerCount: count,
    players: values.map((v, i) => ({ id: String(i), values: v })),
  };
  const prepared = prepareEuroScoring(t, input)!;
  expect(prepared.error).toBeUndefined();
  const scored = computeScores(prepared.template, prepared.input);
  if (!scored.ok) throw new Error(JSON.stringify(scored.error));
  return scored.value;
};

describe('club euro quantity scoring', () => {
  it('resolves Barrage tied totals by energy without adding energy to VP', () => {
    const result = solve('barrage', [
      {
        vpTrack: 100,
        objective: 13,
        supplyQuantities: { excavators: 5, mixers: 5, credits: 4 },
        waterDrops: 3,
        lastRoundEnergy: 30,
      },
      {
        vpTrack: 100,
        objective: 13,
        supplyQuantities: { excavators: 5, mixers: 5, credits: 4 },
        waterDrops: 3,
        lastRoundEnergy: 20,
      },
    ]);
    expect(result.players.map((p) => p.total)).toEqual([118, 118]);
    expect(result.winners).toEqual(['0']);
  });
  it('adds Leeghwater activated Private Building VP only when selected', () => {
    const result = solve('barrage', [{ vpTrack: 10, leeghwaterEnabled: 1, privateBuildingVp: 8 }]);
    expect(result.players[0]?.total).toBe(18);
    const t = template('barrage');
    expect(
      prepareEuroScoring(t, {
        playerCount: 1,
        players: [{ id: 'p', values: { privateBuildingVp: 8 } }],
      })?.error,
    ).toContain('Leeghwater');
  });
  it('preserves Trajan final-total mode and provides detailed endgame quantities', () => {
    expect(
      solve('trajan-2011', [{ victoryPoints: 125, senatePosition: 1 }]).players[0]?.total,
    ).toBe(125);
    expect(
      solve('trajan-2011', [
        {
          entryMode: 1,
          victoryPoints: 999,
          trackBeforeFinal: 80,
          handCards: 3,
          campWorkers: 2,
          campLegionnaires: 1,
          constructionTriples: 1,
          constructionQuadruples: 1,
          bonusTileVp: 9,
          senatePosition: 1,
        },
      ]).players[0]?.total,
    ).toBe(125);
    expect(solve('trajan-2011', [{ victoryPoints: -2, senatePosition: 1 }]).players[0]?.total).toBe(
      -2,
    );
  });
  it('scores Galactic manual p28 worked final awards and derives Cockpit tiebreak', () => {
    const result = solve('galactic-cruise', [
      {
        trackVp: 100,
        cockpits: 20,
        cockpitVp: 999,
        segments: 17,
        progress: { cubes: 3, wings: 4, mostReputation: 1 },
        reputation: 15,
        developments: 5,
        supplyQuantities: { money: 4, resources: 5, ads: 1, agendaCards: 0, blueprints: 1 },
        turnOrder: 1,
      },
    ]);
    expect(result.players[0]?.total).toBe(176);
    expect(result.players[0]?.categories.cockpitVp).toBe(20);
  });
  it('accepts negative Cockpit VP and resolves the last turn-order tie', () => {
    const result = solve('galactic-cruise', [
      { trackVp: 10, cockpits: -4, turnOrder: 1 },
      { trackVp: 10, cockpits: -4, turnOrder: 2 },
    ]);
    expect(result.players.map((p) => p.total)).toEqual([6, 6]);
    expect(result.winners).toEqual(['1']);
  });
  it('reproduces visually verified Luthier p26 24-prestige example', () => {
    const result = solve(
      'luthier',
      [
        {
          trackScore: 0,
          chairCount: 6,
          finishingInstruments: [3],
          personalGoals: 8,
          resourceQuantities: { money: 16 },
          leftoverMoney: 6,
          patronPenalty: 4,
        },
      ],
      4,
    );
    expect(result.players[0]?.total).toBe(24);
    expect(result.players[0]?.categories.firstChairs).toBe(0);
    expect(result.players[0]?.categories.firstChairs4p).toBe(13);
  });
  it('rounds instruments separately and never leaks one player formula into another', () => {
    const result = solve('luthier', [
      { finishingInstruments: [3, 3], leftoverMoney: 0 },
      { unfinishedPrestige: 3, leftoverMoney: 0 },
    ]);
    expect(result.players.map((p) => p.total)).toEqual([4, 2]);
    expect(solve('luthier', [{ chairCount: 8, leftoverMoney: 0 }], 4).players[0]?.total).toBe(24);
    expect(solve('luthier', [{ chairCount: 8, leftoverMoney: 0 }], 3).players[0]?.total).toBe(18);
  });
  it('reproduces official Entropy p13 134 VP example and shared ties', () => {
    const values = {
      vpTokens: 43,
      lifeformObjectives: 44,
      mainObjective: 45,
      resourceQuantities: { lifeCards: 3, mass: 2, entropy: 2, energy: 4 },
    };
    const result = solve('entropy-2026', [values, values]);
    expect(result.players.map((p) => p.total)).toEqual([134, 134]);
    expect(result.winners).toEqual(['0', '1']);
  });
  it('gates Old King Lore by empty Site and preserves Favour before Order', () => {
    const result = solve('the-old-kings-crown', [
      {
        supplyTokens: { ones: 0, fives: 4 },
        siteEmpty: 1,
        loreBonus: 5,
        favour: true,
        orderPos: 2,
      },
      { supplyTokens: { ones: 2, fives: 4 }, siteEmpty: 0, loreBonus: 99, orderPos: 1 },
    ]);
    expect(result.players.map((p) => p.total)).toEqual([22, 22]);
    expect(result.winners).toEqual(['0']);
  });
  it('scores Gaia levels and combined leftovers once', () => {
    const result = solve('gaia-project-2017', [
      {
        vpTrack: 100,
        finalTile1: 15,
        finalTile2: 12,
        researchTrackLevels: {
          terraforming: 5,
          navigation: 4,
          ai: 3,
          gaiaforming: 2,
          economy: 1,
          science: 0,
        },
        leftoverResources: { credits: 4, knowledge: 2, ore: 2 },
      },
    ]);
    expect(result.players[0]?.total).toBe(153);
  });
  it('keeps Yinzi manual awards and makes the declared final order executable', () => {
    const base = {
      transport: 3,
      workshopsI: 2,
      workshopsII: 1,
      workshopsIII: 1,
      goods: 4,
      negotiation: { level: 2, destinations: 3 },
      silver: 5,
      misfortune: 2,
    };
    const result = solve('yinzi-ming', [
      { ...base, turnOrder: 2 },
      { ...base, turnOrder: 1 },
    ]);
    expect(result.players.map((p) => p.total)).toEqual([27, 27]);
    expect(result.winners).toEqual(['1']);
  });
  it('rejects invalid quantities/orders, leaves inputs immutable and gates legacy definitions', () => {
    const t = template('gaia-project-2017');
    const input: ScoreInput = {
      playerCount: 1,
      players: [{ id: 'p', values: { researchTrackLevels: { science: 6 } } }],
    };
    const before = JSON.stringify(input);
    expect(prepareEuroScoring(t, input)?.error).toContain('0–5');
    expect(JSON.stringify(input)).toBe(before);
    expect(prepareEuroScoring({ ...t, templateVersion: 1 }, input)).toBeNull();
    expect(
      prepareEuroScoring(
        { ...t, categories: t.categories.filter((c) => c.key !== 'researchTrackLevels') },
        input,
      ),
    ).toBeNull();
    const trajan = template('trajan-2011');
    expect(
      prepareEuroScoring(trajan, {
        playerCount: 2,
        players: [
          { id: 'a', values: { senatePosition: 1 } },
          { id: 'b', values: { senatePosition: 1 } },
        ],
      })?.error,
    ).toContain('khác nhau');
  });
});
