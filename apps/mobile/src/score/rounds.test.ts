import { describe, expect, it } from 'vitest';
import { applyOp, initialState, roundsConfig, roundTotal, summarize, targetReached } from './model';
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
