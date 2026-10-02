import { describe, expect, it } from 'vitest';
import {
  PLAYERS_BOUNDS,
  TIME_BOUNDS,
  WEIGHT_BOUNDS,
  buildGameQuery,
  findOption,
  fullRange,
  hasActiveFilters,
  initialGameFilters,
  localMatchesPlayers,
  rangeLabel,
  stepRange,
  suggestOptions,
  summaryMeta,
} from './filters';

describe('stepRange', () => {
  it('clamps to bounds and never crosses the other edge', () => {
    const r = { min: 3, max: 4 };
    expect(stepRange(r, PLAYERS_BOUNDS, 'min', 1)).toEqual({ min: 4, max: 4 });
    expect(stepRange({ min: 4, max: 4 }, PLAYERS_BOUNDS, 'min', 1)).toEqual({ min: 4, max: 4 });
    expect(stepRange({ min: 1, max: 4 }, PLAYERS_BOUNDS, 'min', -1)).toEqual({ min: 1, max: 4 });
    expect(stepRange({ min: 1, max: 12 }, PLAYERS_BOUNDS, 'max', 1)).toEqual({ min: 1, max: 12 });
    expect(stepRange({ min: 1, max: 2 }, PLAYERS_BOUNDS, 'max', -1)).toEqual({ min: 1, max: 1 });
  });

  it('keeps half steps exact for weight', () => {
    expect(stepRange(fullRange(WEIGHT_BOUNDS), WEIGHT_BOUNDS, 'max', -1).max).toBe(4.5);
  });
});

describe('rangeLabel', () => {
  it('describes open, one-sided and bounded ranges', () => {
    expect(rangeLabel(fullRange(TIME_BOUNDS), TIME_BOUNDS, 'phút')).toBe('Bất kỳ');
    expect(rangeLabel({ min: 15, max: 60 }, TIME_BOUNDS, 'phút')).toBe('≤ 60 phút');
    expect(rangeLabel({ min: 60, max: 300 }, TIME_BOUNDS, 'phút')).toBe('≥ 60 phút');
    expect(rangeLabel({ min: 4, max: 4 }, PLAYERS_BOUNDS, 'người')).toBe('4 người');
    expect(rangeLabel({ min: 2, max: 5 }, PLAYERS_BOUNDS, 'người')).toBe('2–5 người');
  });
});

describe('buildGameQuery', () => {
  it('is empty by default', () => {
    expect(buildGameQuery(initialGameFilters())).toEqual({});
    expect(hasActiveFilters(initialGameFilters())).toBe(false);
  });

  it('emits only narrowed edges', () => {
    const f = {
      ...initialGameFilters(),
      q: ' gang ',
      categoryId: 'c1',
      players: { min: 4, max: 12 },
      time: { min: 15, max: 60 },
      weight: { min: 2, max: 3.5 },
    };
    expect(buildGameQuery(f)).toEqual({
      q: 'gang',
      categoryId: 'c1',
      minPlayers: 4,
      maxTime: 60,
      minWeight: 2,
      maxWeight: 3.5,
    });
    expect(hasActiveFilters(f)).toBe(true);
  });
});

describe('category type-ahead', () => {
  const options = [
    { id: '1', label: 'Chiến thuật' },
    { id: '2', label: 'Thẻ bài' },
    { id: '3', label: 'Trò chơi chiến tranh' },
  ];

  it('matches exact label ignoring accents and case', () => {
    expect(findOption(options, 'chien thuat')?.id).toBe('1');
    expect(findOption(options, 'chien')).toBeUndefined();
    expect(findOption(options, '  ')).toBeUndefined();
  });

  it('suggests prefix matches first and skips the exact match', () => {
    expect(suggestOptions(options, 'chien').map((o) => o.id)).toEqual(['1', '3']);
    expect(suggestOptions(options, 'tranh').map((o) => o.id)).toEqual(['3']);
    expect(suggestOptions(options, 'chien thuat')).toEqual([]);
    expect(suggestOptions(options, '')).toEqual([]);
  });
});

describe('localMatchesPlayers', () => {
  const g = { slug: 'x', name: 'X', year: null, players: [3, 5] as [number, number], mode: null };
  it('checks overlap with the wanted range', () => {
    expect(localMatchesPlayers(g, { min: 1, max: 12 })).toBe(true);
    expect(localMatchesPlayers(g, { min: 6, max: 12 })).toBe(false);
    expect(localMatchesPlayers(g, { min: 1, max: 2 })).toBe(false);
    expect(localMatchesPlayers({ ...g, players: [null, null] }, { min: 6, max: 6 })).toBe(true);
  });
});

describe('summaryMeta', () => {
  it('joins available facts', () => {
    expect(summaryMeta({ minPlayers: 2, maxPlayers: 4, playMinutes: 45, weight: '2.31' })).toBe(
      '2-4 người · 45 phút · Độ khó 2.31',
    );
    expect(
      summaryMeta({ minPlayers: null, maxPlayers: null, playMinutes: null, weight: null }),
    ).toBe('');
  });
});
