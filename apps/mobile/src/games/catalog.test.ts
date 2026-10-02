import { describe, expect, it } from 'vitest';
import { games, getGame, normalize, playersLabel, searchGames } from './catalog';

describe('normalize', () => {
  it('strips Vietnamese diacritics and lowercases', () => {
    expect(normalize('Đường Đến Hà Nội')).toBe('duong den ha noi');
    expect(normalize('  ÁÀẢÃẠ  ')).toBe('aaaaa');
  });
});

describe('searchGames', () => {
  it('returns first items for empty query, respecting limit', () => {
    expect(searchGames('', 5)).toHaveLength(5);
    expect(searchGames('   ', 3)).toHaveLength(3);
  });

  it('ranks prefix matches before substring matches', () => {
    const results = searchGames('gang', 100);
    const firstSubstring = results.findIndex((g) => !normalize(g.name).startsWith('gang'));
    const lastPrefix = results.map((g) => normalize(g.name).startsWith('gang')).lastIndexOf(true);
    if (firstSubstring !== -1) expect(lastPrefix).toBeLessThan(firstSubstring);
    expect(results.some((g) => g.slug === 'the-gang-2024')).toBe(true);
  });

  it('is case and accent insensitive', () => {
    expect(searchGames('THE GANG').map((g) => g.slug)).toContain('the-gang-2024');
  });

  it('returns empty for no match', () => {
    expect(searchGames('zzzzqqqq')).toEqual([]);
  });
});

describe('catalog data', () => {
  it('has unique slugs and lookup works', () => {
    expect(new Set(games.map((g) => g.slug)).size).toBe(games.length);
    expect(getGame('the-gang-2024')?.name).toBe('The Gang');
    expect(getGame('nope')).toBeUndefined();
  });

  it('formats player range', () => {
    expect(playersLabel([3, 6])).toBe('3-6 người');
    expect(playersLabel([2, 2])).toBe('2 người');
    expect(playersLabel([null, null])).toBe('');
  });
});
