import { describe, expect, it } from 'vitest';
import { gangCards } from './cards';
import { drawExtra, resolveHeist, startGame, totalDifficulty, type GameConfig } from './engine';

function seeded(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const cfg = (mode: GameConfig['mode'], shuffled = false): GameConfig => ({
  mode,
  shuffled,
  includeBaseInHomebrew: true,
});
const codes = (s: { active: { code: string }[] }) => s.active.map((a) => a.code);

describe('card data', () => {
  it('has 10 challenges, 10 specialists and 110 homebrew cards', () => {
    const count = (k: string) => Object.values(gangCards).filter((c) => c.kind === k).length;
    expect(count('challenge')).toBe(10);
    expect(count('specialist')).toBe(10);
    expect(count('hbBad') + count('hbGood')).toBe(110);
  });
});

describe('advanced mode', () => {
  it('starts without cards, then reveals a challenge after success and a specialist after failure', () => {
    let s = startGame(cfg('advanced'));
    expect(s.active).toEqual([]);
    s = resolveHeist(s, 'success');
    expect(codes(s)).toEqual(['C1']);
    s = resolveHeist(s, 'fail');
    expect(codes(s)).toEqual(['S1']);
    expect(s.stacks.bad.at(-1)).toBe('C1');
  });

  it('ends after 3 vaults or 3 alarms', () => {
    let s = startGame(cfg('advanced'));
    for (let i = 0; i < 3; i++) s = resolveHeist(s, 'fail');
    expect(s.status).toBe('lost');
    expect(resolveHeist(s, 'success')).toBe(s);
  });
});

describe('professional mode', () => {
  it('drops Quick Access and keeps one game-long challenge', () => {
    let s = startGame(cfg('professional'), seeded(1));
    expect(s.active).toHaveLength(1);
    expect(s.active[0]!.scope).toBe('game');
    expect([...s.stacks.bad, ...codes(s)]).not.toContain('C1');
    const permanent = s.active[0]!.code;
    s = resolveHeist(s, 'fail');
    expect(codes(s)).toContain(permanent);
    expect(s.active).toHaveLength(2);
  });
});

describe('master thief mode', () => {
  it('always keeps two challenges, drops the lowest number each heist, and loses on 2 alarms', () => {
    let s = startGame(cfg('master'), seeded(7));
    expect(s.stacks.good).toEqual([]);
    expect(s.active).toHaveLength(2);
    const before = codes(s).sort((a, b) => Number(a.slice(1)) - Number(b.slice(1)));
    s = resolveHeist(s, 'success');
    expect(s.active).toHaveLength(2);
    expect(codes(s)).toContain(before[1]);
    expect(codes(s)).not.toContain(before[0]);
    s = resolveHeist(resolveHeist(s, 'fail'), 'fail');
    expect(s.status).toBe('lost');
  });
});

describe('homebrew mode', () => {
  it('keeps a permanent detrimental and rerolls the temporary pair', () => {
    let s = startGame(cfg('homebrew'), seeded(3));
    expect(s.active.map((a) => a.scope)).toEqual(['game', 'heist', 'heist']);
    const permanent = s.active[0]!.code;
    s = drawExtra(s, 'good');
    expect(s.active).toHaveLength(4);
    expect(typeof totalDifficulty(s)).toBe('number');
    s = resolveHeist(s, 'success');
    expect(s.active).toHaveLength(3);
    expect(s.active[0]!.code).toBe(permanent);
  });
});
