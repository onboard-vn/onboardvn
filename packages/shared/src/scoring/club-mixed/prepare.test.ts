import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { computeScores, type ScoreInput } from '../compute.js';
import { scoreTemplateSchema } from '../template-schema.js';
import { prepareMixedScoring } from './prepare.js';
const load = (slug: string) =>
  scoreTemplateSchema.parse(
    JSON.parse(
      readFileSync(
        new URL(`../../../../../data/staging/score-templates/${slug}.json`, import.meta.url)
          .pathname,
        'utf8',
      ),
    ),
  );
const input = (values: ScoreInput['players'][number]['values'][]): ScoreInput => ({
  playerCount: values.length,
  players: values.map((v, i) => ({ id: String(i), values: v })),
});
const run = (slug: string, raw: ScoreInput) => {
  const prepared = prepareMixedScoring(load(slug), raw);
  expect(prepared?.error).toBeUndefined();
  const result = computeScores(load(slug), raw);
  if (!result.ok) throw Error(result.error.message);
  return { result: result.value, prepared: prepared! };
};
describe('mixed game official scoring contracts', () => {
  it('does not reinterpret old pinned templates or incomplete contracts', () => {
    const template = load('vantage');
    expect(prepareMixedScoring({ ...template, templateVersion: 1 }, input([{}]))).toBeNull();
    expect(prepareMixedScoring({ ...template, categories: [] }, input([{}]))).toBeNull();
  });
  it('Venus reproduces publisher worked example 134 and rounds Vesta per card', () => {
    const p = {
      prefectOrder: 0,
      vestaSupply: { cards: 1, cash: 13, cloth: 1, tool: 3, brick: 1 },
      jupiter: { cards: 2, houses: 9 },
      saturnus: { cards: 4, provinces: 7 },
      venus: { cards: 2, provinces: 5 },
      mercurius: { cards: 2, goodTypes: 4 },
      mars: { cards: 3, colonists: 5 },
      minerva: [12],
      concordiaCard: true,
    };
    expect(run('concordia-venus', input([p, { prefectOrder: 1 }])).result.players[0]?.total).toBe(
      134,
    );
    expect(
      run(
        'concordia-venus',
        input([{ prefectOrder: 0, vestaSupply: { cards: 2, cash: 39 } }, { prefectOrder: 1 }]),
      ).result.players[0]?.total,
    ).toBe(6);
  });
  it('Age of Steam base ties, Western cash tiebreak and insolvency exclusion', () => {
    const p = { income: 20, trackSections: 12, sharesIssued: 5 };
    expect(run('age-of-steam-deluxe-2019', input([p, p])).result.winners).toEqual(['0', '1']);
    expect(
      run(
        'age-of-steam-deluxe-2019',
        input([
          { ...p, mapVariant: 1, cashRemaining: 2 },
          { ...p, cashRemaining: 3 },
        ]),
      ).result.winners,
    ).toEqual(['1']);
    expect(
      run('age-of-steam-deluxe-2019', input([{ ...p, insolvent: true }, p])).prepared.excludedIds,
    ).toEqual(['0']);
    expect(run('age-of-steam-deluxe-2019', input([p, p])).result.players[0]?.total).toBe(57);
  });
  it('Feya computes island quantities and exactly two cards without mutating stored inactive quantities', () => {
    const raw = input([
      {
        trackScore: 40,
        islandQuantities: { settlements1: 4, spirits1: 2, settlements2: 2, spirits2: 1 },
        scoreCardOne: 1,
        scoreCardTwo: 3,
        cardLargestGroup: 4,
        cardIslandMajority: 3,
        cardTemple: 99,
        fish: 3,
        manaGems: 2,
        gold: 29,
      },
      {},
    ]);
    expect(run('feya-s-swamp-2025', raw).result.players[0]?.total).toBe(82);
    expect(raw.players[0]?.values.cardTemple).toBe(99);
    expect(
      prepareMixedScoring(load('feya-s-swamp-2025'), input([{ scoreCardOne: 1, scoreCardTwo: 1 }]))
        ?.error,
    ).toBeTruthy();
  });
  it('Vantage waits for session ending and gives outcome without VP', () => {
    expect(
      prepareMixedScoring(load('vantage'), input([{ missionCompleted: true }, {}]))?.error,
    ).toContain('Phiên chưa kết thúc');
    const r = run(
      'vantage',
      input([{ missionCompleted: true, destinyCompleted: true, sessionEnded: true }, {}]),
    ).result;
    expect(r.outcome).toBe('win');
    expect(r.players[0]?.total).toBe(0);
    expect(r.winners).toEqual(['0', '1']);
  });
  it('Abomination grants every tied positive humanity leader 5 only on Captain ending', () => {
    const p = {
      bodyParts: { headAlive: 1, headVp: 8 },
      humanityValue: 7,
      captainEnded: true,
      turnOrder: 1,
    };
    const r = run(
      'abomination-the-heir-of-frankenstein-2019',
      input([p, { ...p, turnOrder: 2 }]),
    ).result;
    expect(r.players.map((x) => x.total)).toEqual([13, 13]);
    expect(r.winners).toEqual(['0']);
    expect(
      run(
        'abomination-the-heir-of-frankenstein-2019',
        input([
          { ...p, captainEnded: false },
          { ...p, captainEnded: false, turnOrder: 2 },
        ]),
      ).result.players[0]?.total,
    ).toBe(8);
  });
  it('Cloudspire sums team power and requires the immediate winner on any defeated gate', () => {
    const p = { teamMode: true, teamSeat: 1, gateHealth: 10, advancements: 5 };
    const raw = input([
      p,
      { ...p, gateHealth: 1 },
      { ...p, teamSeat: 2, gateHealth: 20 },
      { ...p, teamSeat: 2, gateHealth: 5 },
    ]);
    expect(run('cloudspire', raw).result.winners).toEqual(['2', '3']);
    raw.players[2]!.values.gateDefeated = true;
    expect(prepareMixedScoring(load('cloudspire'), raw)?.error).toBeTruthy();
    raw.players[0]!.values.earlyWinner = true;
    expect(run('cloudspire', raw).result.winners).toEqual(['0', '1']);
  });
  it('Zoo New Shores subtracts only enclosure eggs, adds sections before projects, distributes welfare points', () => {
    const r = run(
      'zoo-tycoon',
      input([
        {
          newShores: true,
          endQuantities: {
            popularity: 18,
            conservation: 20,
            offspring: 2,
            enclosureEggs: 1,
            vivariumSections: 2,
            breedingTrack: 1,
            darkGreenSpecies: 2,
          },
        },
        { endQuantities: { popularity: 10, conservation: 10, breedingTrack: 1 } },
      ]),
    );
    expect(r.prepared.input.players[0]?.values.popularity).toBe(22);
    expect(r.prepared.input.players[0]?.values.conservation).toBe(28);
    expect(r.result.players[0]?.total).toBe(22);
    expect(
      prepareMixedScoring(load('zoo-tycoon'), input([{ endQuantities: { enclosureEggs: 1 } }, {}]))
        ?.error,
    ).toBeTruthy();
  });
  it('alternates welfare penalties from equal tracks and accepts signed final building effects', () => {
    const r = run(
      'zoo-tycoon',
      input([
        {
          endQuantities: {
            popularity: 10,
            conservation: 2,
            breedingTrack: 1,
            yellowSpecies: 2,
            buildingPopularity: -1,
          },
        },
        { endQuantities: { popularity: 0, conservation: 0, breedingTrack: 0 } },
      ]),
    );
    expect(r.prepared.input.players[0]?.values.popularity).toBe(8);
    expect(r.prepared.input.players[0]?.values.conservation).toBe(9);
    expect(r.result.players[0]?.total).toBe(8);
  });
  it('Zoo welfare moves one point at a time across equal tracks, and 2p has no second welfare award', () => {
    const r = run(
      'zoo-tycoon',
      input([
        {
          endQuantities: {
            popularity: 10,
            conservation: 10,
            breedingTrack: 0,
            darkGreenSpecies: 1,
          },
        },
        {
          endQuantities: {
            popularity: 10,
            conservation: 10,
            breedingTrack: 0,
            yellowSpecies: 1,
            darkGreenSpecies: 1,
          },
        },
      ]),
    );
    expect(r.prepared.input.players[1]?.values.popularity).toBe(10);
  });
});
