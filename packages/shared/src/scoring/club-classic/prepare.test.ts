import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { scoreTemplateSchema } from '../template-schema.js';
import { computeScores } from '../compute.js';
const template = (slug: string) =>
  scoreTemplateSchema.parse(
    JSON.parse(
      readFileSync(
        new URL(`../../../../../data/staging/score-templates/${slug}.json`, import.meta.url)
          .pathname,
        'utf8',
      ),
    ),
  );
describe('Classic authoritative results', () => {
  it('includes the two-player market without paying its bonus to real players', () => {
    const result = computeScores(template('acquire-1963'), {
      playerCount: 2,
      players: [
        {
          id: 'a',
          values: {
            cash: 6000,
            chainPrices: { tower: 400 },
            marketShares: { tower: 9 },
            chainShares: { tower: 5 },
            endBonuses: 99999,
          },
        },
        { id: 'b', values: { cash: 6000, chainShares: { tower: 3 } } },
      ],
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(
      result.value.players.map((p) => [p.categories.endBonuses, p.categories.stockSales, p.total]),
    ).toEqual([
      [2000, 2000, 10000],
      [0, 1200, 7200],
    ]);
  });
  it('requires the actual market draw for every active two-player chain', () => {
    expect(
      computeScores(template('acquire-1963'), {
        playerCount: 2,
        players: [
          { id: 'a', values: { chainPrices: { tower: 400 } } },
          { id: 'b', values: {} },
        ],
      }).ok,
    ).toBe(false);
  });
  it('retains legacy manual Acquire totals', () => {
    const t = template('acquire-1963');
    t.templateVersion = 1;
    const r = computeScores(t, {
      playerCount: 2,
      players: [
        { id: 'a', values: { cash: 100, endBonuses: 500, stockSales: 1000 } },
        { id: 'b', values: { cash: 200 } },
      ],
    });
    expect(r.ok && r.value.players[0]?.total).toBe(1600);
  });
  it('requires an explicit quick-result choice when counters are absent', () => {
    const t = template('the-gang-2024');
    expect(
      computeScores(t, { playerCount: 3, players: [{ id: 'a', values: {} }], outcome: 'win' }).ok,
    ).toBe(false);
    const r = computeScores(t, {
      playerCount: 3,
      players: [{ id: 'a', values: { manualResult: true, heistsSucceeded: 0, heistsFailed: 0 } }],
      outcome: 'win',
    });
    expect(r.ok && r.value.winners).toEqual(['a']);
  });
  it('rejects contradictory detailed Gang counters and accepts a terminal win', () => {
    const t = template('the-gang-2024');
    const players = [{ id: 'a', values: { heistsSucceeded: 3, heistsFailed: 2 } }];
    expect(computeScores(t, { playerCount: 3, players, outcome: 'loss' }).ok).toBe(false);
    const r = computeScores(t, { playerCount: 3, players, outcome: 'win' });
    expect(r.ok && r.value.winners).toEqual(['a']);
  });
});
