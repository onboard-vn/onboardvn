import { describe, expect, it } from 'vitest';
import { computeScores, type RawValue, type ScoreInput, type ScoreResult } from './compute.js';
import type { ScoreCategory, ScoreTemplate } from './template-schema.js';
import { compileTemplate } from './validate.js';

export const cat = (key: string, over: Partial<ScoreCategory> = {}): ScoreCategory => ({
  key,
  label: key,
  scope: 'player',
  input: 'number',
  formula: { type: 'sum' },
  countsToTotal: true,
  ...over,
});

export const tpl = (categories: ScoreCategory[], over: Partial<ScoreTemplate> = {}): ScoreTemplate => ({
  slug: 't',
  name: 'T',
  templateVersion: 1,
  mode: 'competitive',
  winRule: 'highest',
  categories,
  sources: [{ url: 'https://example.com', title: 'x', type: 'other' }],
  confidence: 'high',
  ...over,
});

type P = ScoreInput['players'][number];
const p = (id: string, values: Record<string, RawValue> = {}, extra: Partial<P> = {}): P => ({ id, values, ...extra });

const run = (t: ScoreTemplate, players: P[], extra: Partial<ScoreInput> = {}): ScoreResult => {
  const r = computeScores(t, { players, playerCount: players.length, ...extra });
  if (!r.ok) throw new Error(`${r.error.code}: ${r.error.message}`);
  return r.value;
};

const fails = (t: ScoreTemplate, players: P[], extra: Partial<ScoreInput> = {}): string => {
  const r = computeScores(t, { players, playerCount: players.length, ...extra });
  return r.ok ? 'OK' : r.error.code;
};

const pts = (r: ScoreResult, id: string, key: string): number | undefined =>
  r.players.find((x) => x.id === id)?.categories[key];

describe('formulas', () => {
  it('sum, multiply, repeating and bool', () => {
    const t = tpl([
      cat('a'),
      cat('b', { input: 'count', formula: { type: 'multiply', points: 3 } }),
      cat('c', { input: 'repeating' }),
      cat('d', { input: 'bool', formula: { type: 'multiply', points: 5 } }),
    ]);
    const r = run(t, [p('x', { a: 4, b: 2, c: [1, 2, 3], d: true }), p('y', { a: 1 })]);
    expect(r.players[0]).toMatchObject({ total: 4 + 6 + 6 + 5, rank: 1 });
    expect(r.players[1]).toMatchObject({ total: 1, rank: 2 });
    expect(r.winners).toEqual(['x']);
  });

  it('table with N+ keys', () => {
    const t = tpl([cat('n', { input: 'count', formula: { type: 'table', table: { '0': 0, '1': 1, '2': 3, '7+': 20 } } })]);
    const r = run(t, [p('a', { n: 2 }), p('b', { n: 7 }), p('c', { n: 12 }), p('d', { n: 0 })]);
    expect(r.players.map((x) => x.total)).toEqual([3, 20, 20, 0]);
    const gap = run(t, [p('a', { n: 5 })]);
    expect(gap.players[0]?.total).toBe(0);
    expect(gap.warnings).toHaveLength(1);
  });

  it('expr with counts inputs, players and cat_ references regardless of order', () => {
    const t = tpl([
      cat('late', { formula: { type: 'expr', expr: 'cat_early * 2 + players' } }),
      cat('early', { input: 'counts', inputs: ['x', 'y'], formula: { type: 'expr', expr: 'floor((x + y) / 3)' } }),
    ]);
    const r = run(t, [p('a', { early: { x: 4, y: 3 } }), p('b')]);
    expect(pts(r, 'a', 'early')).toBe(2);
    expect(pts(r, 'a', 'late')).toBe(2 * 2 + 2);
  });

  it('repeating with sum(value) expr', () => {
    const t = tpl([cat('r', { input: 'repeating', formula: { type: 'expr', expr: 'sum(value) + count(value)' } })]);
    expect(run(t, [p('a', { r: [2, 3] })]).players[0]?.total).toBe(7);
  });

  it('setCollection via table or expr', () => {
    const t = tpl([
      cat('s1', { input: 'count', formula: { type: 'setCollection', table: { '1': 1, '2': 3, '3+': 6 } } }),
      cat('s2', { input: 'counts', inputs: ['a', 'b'], formula: { type: 'setCollection', expr: 'min(a, b) * 4' } }),
    ]);
    const r = run(t, [p('a', { s1: 5, s2: { a: 2, b: 3 } })]);
    expect(r.players[0]?.total).toBe(6 + 8);
  });

  it('exclusiveBonus: highest takes it, ties share, zero gives nothing', () => {
    const t = tpl([cat('e', { input: 'exclusive', formula: { type: 'exclusiveBonus', points: 4 } })]);
    expect(run(t, [p('a', { e: 3 }), p('b', { e: 1 })]).players.map((x) => x.total)).toEqual([4, 0]);
    expect(run(t, [p('a', { e: 2 }), p('b', { e: 2 })]).players.map((x) => x.total)).toEqual([4, 4]);
    expect(run(t, [p('a', { e: false }), p('b')]).players.map((x) => x.total)).toEqual([0, 0]);
    expect(run(t, [p('a', { e: true }), p('b', { e: false })]).players.map((x) => x.total)).toEqual([4, 0]);
  });

  describe('rankAward ties', () => {
    const award = (tieMode: string, points = [10, 6, 3]) =>
      tpl([
        cat('r', {
          formula: { type: 'rankAward', rankAward: { points, tieMode: tieMode as 'none', compare: 'highest', excludeZero: true } },
        }),
      ]);
    const players = [p('a', { r: 5 }), p('b', { r: 5 }), p('c', { r: 3 }), p('d', { r: 0 })];
    const totals = (mode: string, pts?: number[]) => run(award(mode, pts), players).players.map((x) => x.total);

    it('split-floor', () => expect(totals('split-floor')).toEqual([8, 8, 3, 0]));
    it('split-floor rounds down', () => expect(totals('split-floor', [5, 2, 1])).toEqual([3, 3, 1, 0]));
    it('split-exact', () => expect(totals('split-exact', [5, 2, 1])).toEqual([3.5, 3.5, 1, 0]));
    it('all-full', () => expect(totals('all-full')).toEqual([10, 10, 3, 0]));
    it('all-next-lower', () => expect(totals('all-next-lower')).toEqual([6, 6, 3, 0]));
    it('none', () => expect(totals('none')).toEqual([0, 0, 3, 0]));

    it('defaults to split-floor, lowest compare and minValueToScore', () => {
      const t = tpl([cat('r', { formula: { type: 'rankAward', rankAward: { points: [4, 2], compare: 'lowest', minValueToScore: 1 } } })]);
      const r = run(t, [p('a', { r: 0 }), p('b', { r: 2 }), p('c', { r: 3 })]);
      expect(r.players.map((x) => x.total)).toEqual([0, 4, 2]);
    });

    it('over count and bool', () => {
      const t = tpl([cat('r', { input: 'repeating', formula: { type: 'rankAward', rankAward: { points: [5, 1], over: 'count' } } })]);
      expect(run(t, [p('a', { r: [9] }), p('b', { r: [1, 1] })]).players.map((x) => x.total)).toEqual([1, 5]);
      const b = tpl([cat('r', { input: 'bool', formula: { type: 'rankAward', rankAward: { points: [7], over: 'bool', tieMode: 'all-full', excludeZero: true } } })]);
      expect(run(b, [p('a', { r: true }), p('b', { r: true }), p('c', { r: false })]).players.map((x) => x.total)).toEqual([7, 7, 0]);
    });
  });

  it('byPlayerCount overrides by exact and N+ key', () => {
    const t = tpl([
      cat('m', {
        input: 'count',
        formula: { type: 'multiply', points: 1, byPlayerCount: { '2': { points: 5 }, '4+': { points: 10 } } },
      }),
    ]);
    const mk = (n: number) => Array.from({ length: n }, (_, i) => p(`p${i}`, { m: 1 }));
    expect(run(t, mk(2)).players[0]?.total).toBe(5);
    expect(run(t, mk(3)).players[0]?.total).toBe(1);
    expect(run(t, mk(6)).players[0]?.total).toBe(10);
  });

  it('appliesWhen and roleKey gate categories', () => {
    const t = tpl([
      cat('bonus', { appliesWhen: 'players >= 4', formula: { type: 'multiply', points: 2 }, input: 'count' }),
      cat('spy', { roleKey: 'spy' }),
    ]);
    const four = run(t, [p('a', { bonus: 1, spy: 3 }, { role: 'spy' }), p('b', { bonus: 1, spy: 3 }), p('c'), p('d')]);
    expect(four.players.map((x) => x.total)).toEqual([5, 2, 0, 0]);
    expect(run(t, [p('a', { bonus: 1 }), p('b')]).players[0]?.total).toBe(0);
  });

  it('appliesWhen can reference another category', () => {
    const t = tpl([
      cat('won', { input: 'bool' }),
      cat('prize', { appliesWhen: 'cat_won == 1', formula: { type: 'sum' } }),
    ]);
    const r = run(t, [p('a', { won: true, prize: 9 }), p('b', { won: false, prize: 9 })]);
    expect(r.players.map((x) => x.total)).toEqual([10, 0]);
  });

  it('multiplierOf scales targets and is not summed', () => {
    const t = tpl([
      cat('cards'),
      cat('doubler', { input: 'bool', formula: { type: 'expr', expr: 'if(value, 2, 1)' }, multiplierOf: ['cards'] }),
      cat('extra'),
    ]);
    const r = run(t, [p('a', { cards: 10, doubler: true, extra: 1 }), p('b', { cards: 10, extra: 1 })]);
    expect(r.players.map((x) => x.total)).toEqual([21, 11]);
  });

  it('countsToTotal=false is shown but not summed', () => {
    const t = tpl([cat('a'), cat('hidden', { countsToTotal: false })]);
    const r = run(t, [p('x', { a: 1, hidden: 50 })]);
    expect(r.players[0]).toMatchObject({ total: 1, categories: { a: 1, hidden: 50 } });
  });

  it('perRound aggregates', () => {
    const cats = [cat('r', { input: 'perRound' })];
    const players = [p('a', { r: [3, 9, 1] }), p('b', { r: [5, 2, 1] })];
    const sum = run(tpl(cats, { rounds: { aggregate: 'sum' } }), players);
    expect(sum.players.map((x) => x.total)).toEqual([13, 8]);
    const best = run(tpl(cats, { rounds: { aggregate: 'best' } }), players);
    expect(best.players.map((x) => x.total)).toEqual([9, 5]);
    const won = run(tpl(cats, { rounds: { aggregate: 'rounds-won' } }), players);
    expect(won.players.map((x) => x.total)).toEqual([2, 2]);
  });
});

describe('win rules, ranking and tiebreakers', () => {
  it('lowest wins', () => {
    const r = run(tpl([cat('s')], { winRule: 'lowest' }), [p('a', { s: 30 }), p('b', { s: 12 }), p('c', { s: 40 })]);
    expect(r.players.map((x) => x.rank)).toEqual([2, 1, 3]);
    expect(r.winners).toEqual(['b']);
  });

  it('tiebreakers apply in order', () => {
    const t = tpl([cat('s'), cat('t1', { countsToTotal: false }), cat('t2', { countsToTotal: false })], {
      tiebreakers: [
        { categoryKey: 't1', dir: 'highest', description: '' },
        { categoryKey: 't2', dir: 'lowest', description: '' },
      ],
    });
    const r = run(t, [
      p('a', { s: 10, t1: 2, t2: 5 }),
      p('b', { s: 10, t1: 2, t2: 3 }),
      p('c', { s: 10, t1: 1, t2: 0 }),
      p('d', { s: 5 }),
    ]);
    expect(r.players.map((x) => x.rank)).toEqual([2, 1, 3, 4]);
    expect(r.winners).toEqual(['b']);
    expect(r.tieUnresolved).toBe(false);
  });

  it('unresolved tie: shared victory vs tieUnresolved', () => {
    const players = [p('a', { s: 5 }), p('b', { s: 5 }), p('c', { s: 1 })];
    const shared = run(tpl([cat('s')], { sharedVictoryOnTie: true }), players);
    expect(shared.winners).toEqual(['a', 'b']);
    expect(shared.tieUnresolved).toBe(false);
    const open = run(tpl([cat('s')]), players);
    expect(open.winners).toEqual([]);
    expect(open.tieUnresolved).toBe(true);
    expect(open.tiedIds).toEqual(['a', 'b']);
    expect(open.players.map((x) => x.rank)).toEqual([1, 1, 3]);
  });

  it('manual winners override a tie', () => {
    const r = run(tpl([cat('s')]), [p('a', { s: 5 }), p('b', { s: 5 })], { winners: ['b'] });
    expect(r.winners).toEqual(['b']);
    expect(r.tieUnresolved).toBe(false);
  });

  it('winRule none yields no winners or ranks', () => {
    const r = run(tpl([cat('s')], { winRule: 'none' }), [p('a', { s: 5 })]);
    expect(r.winners).toEqual([]);
    expect(r.players[0]?.rank).toBeNull();
  });

  it('objective uses won category or manual winners', () => {
    const t = tpl([cat('won', { input: 'bool', countsToTotal: false })], { winRule: 'objective', mode: 'hidden-traitor' });
    expect(run(t, [p('a', { won: true }), p('b', { won: false }), p('c', { won: true })]).winners).toEqual(['a', 'c']);
    expect(run(t, [p('a'), p('b')], { winners: ['b'] }).winners).toEqual(['b']);
  });
});

describe('team and coop', () => {
  it('team mode sums members plus team categories and ranks teams', () => {
    const t = tpl([cat('s'), cat('teamBonus', { scope: 'team' })], { mode: 'team' });
    const r = run(t, [
      p('a', { s: 10, teamBonus: 5 }, { team: 'red' }),
      p('b', { s: 8 }, { team: 'red' }),
      p('c', { s: 30 }, { team: 'blue' }),
      p('d', { s: 1 }, { team: 'blue' }),
    ]);
    expect(r.teams.map((x) => [x.id, x.total, x.rank])).toEqual([
      ['red', 23, 2],
      ['blue', 31, 1],
    ]);
    expect(r.winnerTeams).toEqual(['blue']);
    expect(r.winners).toEqual(['c', 'd']);
    expect(r.players.map((x) => x.rank)).toEqual([2, 2, 1, 1]);
  });

  it('team mode requires a team on each player', () => {
    expect(fails(tpl([cat('s')], { mode: 'team' }), [p('a')])).toBe('INPUT_INVALID');
  });

  it('coop winners follow outcome and scoreOnlyIfWin zeroes totals', () => {
    const t = tpl([cat('s')], { mode: 'coop', winRule: 'objective', outcome: { winLose: true, scoreOnlyIfWin: true } });
    const players = [p('a', { s: 10 }), p('b', { s: 5 })];
    const win = run(t, players, { outcome: 'win' });
    expect(win.winners).toEqual(['a', 'b']);
    expect(win.teams[0]?.total).toBe(15);
    const loss = run(t, players, { outcome: 'loss' });
    expect(loss.winners).toEqual([]);
    expect(loss.teams[0]?.total).toBe(0);
    expect(fails(t, players)).toBe('INPUT_INVALID');
  });

  it('team-scope category reads value from any member', () => {
    const t = tpl([cat('team', { scope: 'team' }), cat('mine', { formula: { type: 'expr', expr: 'cat_team + 1' } })], { mode: 'coop' });
    const r = run(t, [p('a', { team: 7 }), p('b')], { outcome: 'win' });
    expect(r.players.map((x) => x.total)).toEqual([8, 8]);
    expect(r.teams[0]?.total).toBe(7 + 16);
  });
});

describe('boundary validation', () => {
  const t = tpl([cat('n', { input: 'count', min: 0, max: 5 }), cat('c', { input: 'counts', inputs: ['x'] })]);

  it('rejects bad input', () => {
    expect(fails(t, [p('a', { n: -1 })])).toBe('INPUT_INVALID');
    expect(fails(t, [p('a', { n: 6 })])).toBe('INPUT_INVALID');
    expect(fails(t, [p('a', { n: Number.NaN })])).toBe('INPUT_INVALID');
    expect(fails(t, [p('a', { n: [1] })])).toBe('INPUT_INVALID');
    expect(fails(t, [p('a', { c: 3 })])).toBe('INPUT_INVALID');
    expect(fails(t, [p('a'), p('a')])).toBe('INPUT_INVALID');
    expect(fails(t, [p('a')], { winners: ['zzz'] })).toBe('INPUT_INVALID');
    expect(fails(t, [])).toBe('INPUT_INVALID');
    expect(fails(t, [p('a')], { playerCount: 0 })).toBe('INPUT_INVALID');
    expect(computeScores(t, { nope: true } as never).ok).toBe(false);
  });

  it('ignores unknown and prototype-ish value keys', () => {
    const r = run(t, [p('a', { n: 1, constructor: 5, zzz: 9 } as Record<string, RawValue>)]);
    expect(r.players[0]?.total).toBe(1);
  });

  it('is deterministic', () => {
    const players = [p('a', { n: 2 }), p('b', { n: 3 })];
    expect(run(t, players)).toEqual(run(t, players));
  });
});

describe('template validation', () => {
  const bad = (t: ScoreTemplate): string => {
    const r = compileTemplate(t);
    return r.ok ? 'OK' : r.error.message;
  };

  it('rejects malformed templates', () => {
    expect(bad(tpl([cat('a'), cat('a')]))).toMatch(/duplicate/);
    expect(bad(tpl([cat('a', { formula: { type: 'expr', expr: 'nope + 1' } })]))).toMatch(/unknown identifier/);
    expect(bad(tpl([cat('a', { formula: { type: 'expr', expr: 'cat_missing' } })]))).toMatch(/unknown identifier/);
    expect(bad(tpl([cat('a', { formula: { type: 'expr', expr: 'x.y' } })]))).toMatch(/EXPR_SYNTAX/);
    expect(bad(tpl([cat('a', { formula: { type: 'expr', expr: 'cat_b' } }), cat('b', { formula: { type: 'expr', expr: 'cat_a' } })]))).toMatch(/circular/);
    expect(bad(tpl([cat('a', { formula: { type: 'expr', expr: 'cat_a' } })]))).toMatch(/circular/);
    expect(bad(tpl([cat('a', { formula: { type: 'multiply' } })]))).toMatch(/points/);
    expect(bad(tpl([cat('a', { input: 'counts' })]))).toMatch(/inputs/);
    expect(bad(tpl([cat('a', { input: 'counts', inputs: ['value'] })]))).toMatch(/invalid/);
    expect(bad(tpl([cat('a')], { tiebreakers: [{ categoryKey: 'zzz', description: '' }] }))).toMatch(/tiebreaker/);
    expect(bad(tpl([cat('a', { multiplierOf: ['zzz'] })]))).toMatch(/multiplierOf/);
  });

  it('computeScores surfaces template errors as results', () => {
    expect(fails(tpl([cat('a', { formula: { type: 'expr', expr: 'process' } })]), [p('a')])).toBe('TEMPLATE_INVALID');
  });
});

describe('derived categories and outcome expressions', () => {
  const heists = cat('heists', { scope: 'team', input: 'perRound', roundInput: 'bool', countsToTotal: false });
  const t = tpl(
    [
      heists,
      cat('wins', { scope: 'team', input: 'derived', countsToTotal: false, formula: { type: 'expr', expr: 'countTrue(cat_heists)' } }),
      cat('losses', { scope: 'team', input: 'derived', countsToTotal: false, formula: { type: 'expr', expr: 'sumRounds(cat_heists) * 0 + count(cat_heists) - cat_wins' } }),
    ],
    {
      mode: 'coop',
      winRule: 'objective',
      outcome: { winWhen: 'cat_wins >= 2', loseWhen: 'cat_losses >= 2' },
      endCondition: { when: 'cat_wins >= 2 || cat_losses >= 2' },
    },
  );
  const team = (h: RawValue) => [p('a', { heists: h }), p('b', { heists: h })];

  it('derives wins, losses, outcome and end', () => {
    const r = run(t, team([1, 0, 1]));
    expect(r.teams[0]?.categories).toMatchObject({ wins: 2, losses: 1 });
    expect(r).toMatchObject({ outcome: 'win', ended: true, winners: ['a', 'b'] });
    expect(run(t, team([0, 0]))).toMatchObject({ outcome: 'loss', ended: true, winners: [] });
    expect(run(t, team([1]))).toMatchObject({ outcome: null, ended: false });
  });

  it('explicit outcome overrides derived outcome', () => {
    expect(run(t, team([1, 1]), { outcome: 'loss' }).outcome).toBe('loss');
  });

  it('rejects non 0/1 per-round values and exclusive collisions', () => {
    expect(fails(t, team([2]))).toBe('INPUT_INVALID');
    const ex = tpl([cat('w', { input: 'perRound', roundInput: 'exclusive' })]);
    expect(fails(ex, [p('a', { w: [1] }), p('b', { w: [1] })])).toBe('INPUT_INVALID');
    expect(fails(ex, [p('a', { w: [1, 0] }), p('b', { w: [0, 1] })])).toBe('OK');
  });

  it('rejects malformed derived or roundInput categories and unknown outcome identifiers', () => {
    const compile = (u: ScoreTemplate) => compileTemplate(u).ok;
    expect(compile(tpl([cat('d', { input: 'derived' })]))).toBe(false);
    expect(compile(tpl([cat('n', { roundInput: 'bool' })]))).toBe(false);
    expect(compile(tpl([cat('n')], { outcome: { winWhen: 'cat_missing > 0' } }))).toBe(false);
    expect(compile(tpl([cat('n')], { endCondition: { when: 'cat_n >' } }))).toBe(false);
  });
});
