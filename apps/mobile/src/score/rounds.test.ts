import { scoreTemplateSchema } from '@onboard/shared';
import thronesTemplate from '../../../../data/staging/score-templates/a-game-of-thrones-the-board-game-second-edition-2011.json';
import { describe, expect, it } from 'vitest';
import {
  applyOp,
  initialState,
  isRoundsGame,
  roundsConfig,
  roundTotal,
  summarize,
  targetReached,
} from './model';
import { scoreTemplates } from './templates';

const flip7 = scoreTemplates['flip-7'];
const players = ['a', 'b', 'c'].map((id) => ({ id, name: id.toUpperCase() }));

describe('rounds scoring', () => {
  it('parses the target from endCondition text and sums rounds', () => {
    expect(flip7).toBeDefined();
    if (!flip7) return;
    expect(roundsConfig(flip7)).toMatchObject({ target: 200, aggregate: 'sum' });
    let s = initialState(players);
    s = applyOp(s, {
      opId: '1',
      actorId: 'a',
      identityId: 'a',
      categoryKey: '$round',
      roundIndex: 0,
      value: 120,
    });
    s = applyOp(s, {
      opId: '2',
      actorId: 'a',
      identityId: 'a',
      categoryKey: '$round',
      roundIndex: 1,
      value: 85,
    });
    s = applyOp(s, {
      opId: '3',
      actorId: 'b',
      identityId: 'b',
      categoryKey: '$round',
      roundIndex: 0,
      value: 60,
    });
    expect(s.roundCount).toBe(2);
    expect(roundTotal(flip7, s, 'a')).toBe(205);
    const sum = summarize(flip7, s);
    expect(sum.winners).toEqual(['a']);
    expect(targetReached(flip7, sum.rows)).toBe(true);
  });

  it('keeps every Flip 7 player in play when leaders tie above the target', () => {
    if (!flip7) throw new Error('Missing Flip 7 template');
    const initial = initialState(players);
    const tied = {
      ...initial,
      roundCount: 2,
      rounds: { a: [105, 105], b: [105, 105], c: [90, 90] },
    };
    expect(summarize(flip7, tied).winners).toEqual([]);
    expect(
      summarize(flip7, { ...tied, mode: 'quick', quickTotals: { a: 210, b: 210, c: 180 } }).winners,
    ).toEqual([]);
    expect(
      summarize(flip7, {
        ...tied,
        roundCount: 3,
        rounds: { a: [105, 105, 0], b: [105, 105, 0], c: [90, 90, 31] },
      }).winners,
    ).toEqual(['c']);
    expect(
      summarize(flip7, { ...initial, rounds: { a: [105], b: [90], c: [60] } }).winners,
    ).toEqual([]);
  });

  it('keeps Game of Thrones in end-game scoring despite its immediate win threshold', () => {
    expect(isRoundsGame(scoreTemplateSchema.parse(thronesTemplate))).toBe(false);
  });

  it('ignores remote ops for unseated players', () => {
    const s = initialState(players);
    const next = applyOp(s, {
      opId: '1',
      actorId: 'x',
      identityId: 'zzz',
      categoryKey: 'cash',
      value: 5,
    });
    expect(next).toBe(s);
  });
});
