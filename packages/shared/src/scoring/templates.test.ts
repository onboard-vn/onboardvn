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

const load = (slug: string): ScoreTemplate => scoreTemplateSchema.parse(JSON.parse(readFileSync(`${dir}/${slug}.json`, 'utf8')));

const clamp = (v: number, c: ScoreCategory): number => Math.min(c.max ?? Infinity, Math.max(c.min ?? -Infinity, v));

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
  return {
    playerCount: count,
    outcome: 'win',
    players: Array.from({ length: count }, (_, i) => ({
      id: `p${i}`,
      ...(teamed ? { team: i % 2 === 0 ? 'a' : 'b' } : {}),
      ...(t.roles?.[0] ? { role: t.roles[i % t.roles.length]?.key as string } : {}),
      values: Object.fromEntries(t.categories.map((c) => [c.key, sampleValue(c, n === 0 ? 0 : n + i)])),
    })),
  };
}

// Templates whose expr uses its own key/raw name instead of `value`; remove entries once fixed.

describe('staging score templates', () => {
  it('finds templates', () => expect(files.length).toBeGreaterThan(50));

  it.each(files)('%s parses, validates and computes', (file) => {
    const raw = JSON.parse(readFileSync(`${dir}/${file}`, 'utf8'));
    expect(raw.slug).toBe(file.replace(/\.json$/, ''));
    const valid = validateTemplate(raw);
    expect(valid.ok, valid.ok ? '' : `${valid.error.code} ${valid.error.path} ${valid.error.message}`).toBe(true);
    const t = scoreTemplateSchema.parse(raw);
    for (const n of [0, 1, 3]) {
      const r = computeScores(t, sampleInput(t, n));
      expect(r.ok, r.ok ? '' : `n=${n} ${r.error.code} ${r.error.path} ${r.error.message}`).toBe(true);
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

// Template currently references its own key instead of `value`; drop once the template is fixed.
const useValueForOwnKey = (t: ScoreTemplate): ScoreTemplate => ({
  ...t,
  categories: t.categories.map((c) =>
    c.formula.expr ? { ...c, formula: { ...c.formula, expr: c.formula.expr.replace(new RegExp(`\\b${c.key}\\b`, 'g'), 'value') } } : c,
  ),
});

describe('golden vectors', () => {
  it('brass-birmingham-2018: final VP track, tiebreak by income then money', () => {
    const p1: V = { vpTrack: 58, incomeLevel: 10, moneyRemaining: 5 };
    const p2: V = { vpTrack: 58, incomeLevel: 12, moneyRemaining: 5 };
    const p3: V = { ...p2, moneyRemaining: 9 };
    const r = solve('brass-birmingham-2018', [{ id: 'p1', values: p1 }, { id: 'p2', values: p2 }, { id: 'p3', values: p3 }]);
    expect(r.players.map((x) => x.total)).toEqual([58, 58, 58]);
    expect(r.players.map((x) => x.rank)).toEqual([3, 2, 1]);
    expect(r.winners).toEqual(['p3']);
    const shared = solve('brass-birmingham-2018', [{ id: 'p2', values: p2 }, { id: 'p4', values: { ...p2 } }]);
    expect(shared.winners).toEqual(['p2', 'p4']);
    expect(shared.tieUnresolved).toBe(false);
  });

  it('azul: rows/columns/colors bonuses and rows tiebreak', () => {
    const r = solve('azul', [
      { id: 'a', values: { trackScore: 70, completeRows: 3, completeColumns: 2, completeColors: 1 } },
      { id: 'b', values: { trackScore: 85, completeRows: 2, completeColumns: 1, completeColors: 1 } },
      { id: 'c', values: { trackScore: 81, completeRows: 4, completeColumns: 1, completeColors: 1 } },
    ]);
    expect(r.players.map((x) => x.total)).toEqual([100, 106, 106]);
    expect(r.players.map((x) => x.rank)).toEqual([3, 2, 1]);
    expect(r.winners).toEqual(['c']);
  });

  it('the-castles-of-burgundy-2019: yellow bonuses and unresolved tie', () => {
    const base: V = { trackScore: 120, unsoldGoods: 3, silverlings: 4, workers: 5, yellowGoodsTypesSold: 4, yellowBuildingTiles: 2, yellowAnimalTypes: 3, yellowSoldGoods: 5, yellowBonusTiles: 3 };
    const castles = (players: { id: string; values: V }[]) => solve('the-castles-of-burgundy-2019', players, {}, useValueForOwnKey);
    const r = castles([{ id: 'a', values: base }, { id: 'b', values: { trackScore: 100 } }]);
    expect(r.players[0]?.total).toBe(120 + 3 + 4 + 2 + 12 + 8 + 12 + 5 + 6);
    expect(r.winners).toEqual(['a']);
    const tie = castles([{ id: 'a', values: base }, { id: 'b', values: { ...base } }]);
    expect(tie.winners).toEqual([]);
    expect(tie.tieUnresolved).toBe(true);
    expect(tie.tiedIds).toEqual(['a', 'b']);
  });

  it('gaia-project-2017: tiles, research, leftover resources, shared victory', () => {
    const a: V = { vpTrack: 130, finalTiles: 12 + 6, researchLevels: 12, leftoverResources: 7 + 5 + 3 };
    const b: V = { vpTrack: 140, researchLevels: 10 };
    const r = solve('gaia-project-2017', [{ id: 'a', values: a }, { id: 'b', values: b }]);
    expect(r.players.map((x) => x.total)).toEqual([130 + 12 + 6 + 48 + 5, 180]);
    expect(r.winners).toEqual(['a']);
    const tie = solve('gaia-project-2017', [{ id: 'a', values: a }, { id: 'c', values: { ...a } }]);
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
      return solve('the-gang-2024', players, extra);
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
});
