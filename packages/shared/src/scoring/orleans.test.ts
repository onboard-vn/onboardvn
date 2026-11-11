import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { computeScores, type RawValue, type ScoreInput } from './compute.js';
import { scoreTemplateSchema } from './template-schema.js';
import { validateTemplate } from './validate.js';

const template = scoreTemplateSchema.parse(
  JSON.parse(
    readFileSync(
      decodeURIComponent(
        new URL('../../../../data/staging/score-templates/orleans.json', import.meta.url).pathname,
      ),
      'utf8',
    ),
  ),
);
const example = {
  coins: 10,
  grain: 2,
  cheese: 1,
  wine: 1,
  brocade: 1,
  tradingStations: 5,
  citizens: 2,
  developmentStatus: 4,
};
const input = (...values: Record<string, RawValue>[]): ScoreInput => ({
  playerCount: values.length,
  players: values.map((value, i) => ({ id: `p${i + 1}`, values: value })),
});
function score(game: ScoreInput) {
  const result = computeScores(template, game);
  if (!result.ok) throw new Error(result.error.message);
  return result.value;
}

describe('Orléans base scoring', () => {
  it('validates the template and scores the 50 VP example', () => {
    expect(validateTemplate(template).ok).toBe(true);
    const result = score(input(example, { tradingStations: 6 }));
    expect(result.players[0]).toMatchObject({
      total: 50,
      categories: {
        coins: 10,
        grain: 2,
        cheese: 2,
        wine: 3,
        wool: 0,
        brocade: 5,
        tradingStations: 20,
        citizens: 8,
        bonusCitizen: 0,
      },
    });
  });

  it('scores 54 VP when the sole station leader receives the bonus', () => {
    const result = score(input(example, { tradingStations: 4 }));
    expect(result.players[0]).toMatchObject({ total: 54, categories: { bonusCitizen: 4 } });
  });

  it('uses Development Status 1 at the start and ignores a caller-supplied bonus', () => {
    const result = score(input({ tradingStations: 1 }, { bonusCitizen: 1 }));
    expect(result.players.map(({ total }) => total)).toEqual([2, 0]);
  });

  it('suppresses the bonus when the physical bonus was already entered', () => {
    const result = score(input({ ...example, citizens: 3, manualCitizenBonus: true }, {}));
    expect(result.players[0]).toMatchObject({ total: 54, categories: { bonusCitizen: 0 } });
  });

  it('awards nobody when several players tie for the most stations', () => {
    const result = score(input(example, { tradingStations: 5 }, { tradingStations: 2 }, {}));
    expect(result.players.map(({ categories }) => categories.bonusCitizen)).toEqual([0, 0, 0, 0]);
  });

  it('breaks a 60 VP tie by track position, independent of development status', () => {
    const result = score(
      input(
        { coins: 60, developmentStatus: 5, developmentTrackPosition: 20 },
        { coins: 60, developmentStatus: 4, developmentTrackPosition: 22 },
      ),
    );
    expect(result.winners).toEqual(['p2']);
    expect(result.players.map(({ rank }) => rank)).toEqual([2, 1]);
  });

  it('declares joint winners when both VP and track position match', () => {
    const result = score(
      input(
        { coins: 60, developmentTrackPosition: 20 },
        { coins: 60, developmentTrackPosition: 20 },
      ),
    );
    expect(result.winners).toEqual(['p1', 'p2']);
  });

  it('reassigns the bonus after a change without mutating or accumulating it', () => {
    const game = input(example, { tradingStations: 4, developmentStatus: 2 });
    expect(score(game).players.map(({ categories }) => categories.bonusCitizen)).toEqual([4, 0]);
    game.players[1]!.values.tradingStations = 6;
    expect(score(game).players.map(({ categories }) => categories.bonusCitizen)).toEqual([0, 2]);
    expect(score(game).players.map(({ categories }) => categories.bonusCitizen)).toEqual([0, 2]);
    expect(game.players.every(({ values }) => values.bonusCitizen === undefined)).toBe(true);
  });

  it.each([-1, 1.5, NaN, Infinity, true])('rejects invalid resource counts (%s)', (value) => {
    expect(computeScores(template, input({ grain: value }, {}))).toMatchObject({
      ok: false,
      error: { code: 'INPUT_INVALID' },
    });
  });
});
