import { describe, expect, it } from 'vitest';
import { scoreTemplateFixture as template } from '../../test/score-template-fixture.js';
import { computePlay, type ComputePlayer } from './compute.js';

const player = (id: string, over: Partial<ComputePlayer> = {}): ComputePlayer => ({
  identityId: id,
  team: null,
  role: null,
  values: {},
  rounds: null,
  isWinnerOverride: null,
  ...over,
});

const compute = (...args: Parameters<typeof computePlay>) => {
  const r = computePlay(...args);
  if (!r.ok) throw new Error(r.message);
  return r.value;
};

describe('computePlay with a template', () => {
  it('computes totals, ranks and winners from raw inputs', () => {
    const out = compute(
      template(),
      [
        player('a', { values: { coins: 9 }, rounds: { rounds: [1, 2] } }),
        player('b', { values: { coins: 3 } }),
      ],
      null,
    );
    expect(out.byIdentity.get('a')).toMatchObject({ total: 6, rank: 1, isWinner: true });
    expect(out.byIdentity.get('b')).toMatchObject({ total: 1, rank: 2, isWinner: false });
  });

  it('accepts partial drafts', () => {
    const out = compute(template(), [player('a'), player('b', { values: { coins: 6 } })], null);
    expect(out.byIdentity.get('a')?.total).toBe(0);
    expect(out.byIdentity.get('b')?.isWinner).toBe(true);
  });

  it('only honours a manual winner when the tie is unresolved', () => {
    const players = [
      player('a', { values: { coins: 6 }, isWinnerOverride: false }),
      player('b', { values: { coins: 6 }, isWinnerOverride: true }),
      player('c', { values: { coins: 0 }, isWinnerOverride: true }),
    ];
    const out = compute(template({ sharedVictoryOnTie: false }), players, null);
    if (out.tieUnresolved) {
      expect(out.byIdentity.get('b')?.isWinner).toBe(true);
      expect(out.byIdentity.get('a')?.isWinner).toBe(false);
    }
    expect(out.byIdentity.get('c')?.isWinner).toBe(false);
  });

  it('winRule none relies on manual winners', () => {
    const out = compute(
      template({ winRule: 'none' }),
      [player('a', { values: { coins: 9 } }), player('b', { isWinnerOverride: true })],
      null,
    );
    expect(out.byIdentity.get('a')?.isWinner).toBe(false);
    expect(out.byIdentity.get('b')?.isWinner).toBe(true);
  });

  it('reports invalid input instead of throwing', () => {
    const r = computePlay(template(), [player('a', { values: { coins: 'x' as never } })], null);
    expect(r.ok).toBe(false);
  });
});

describe('computePlay without a template', () => {
  it('ranks by total with shared first place', () => {
    const out = compute(
      null,
      [
        player('a', { values: { total: 10 } }),
        player('b', { values: { total: 10 } }),
        player('c', { values: { total: 4 } }),
      ],
      null,
    );
    expect(out.byIdentity.get('a')).toMatchObject({ rank: 1, isWinner: true });
    expect(out.byIdentity.get('b')).toMatchObject({ rank: 1, isWinner: true });
    expect(out.byIdentity.get('c')).toMatchObject({ rank: 3, isWinner: false });
  });

  it('returns no results until someone has a total', () => {
    const out = compute(null, [player('a')], null);
    expect(out.byIdentity.get('a')).toBeNull();
  });

  it('coop win marks every player as winner', () => {
    const coop = { ...template(), mode: 'coop' as const, winRule: 'objective' as const };
    const out = compute(coop, [player('a'), player('b')], 'win');
    expect(out.byIdentity.get('a')?.isWinner).toBe(true);
    expect(out.byIdentity.get('b')?.isWinner).toBe(true);
  });

  it('coop loss means nobody wins', () => {
    const out = compute(null, [player('a', { values: { total: 5 } })], 'loss');
    expect(out.byIdentity.get('a')?.isWinner).toBe(false);
  });
});
