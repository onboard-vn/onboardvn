import { describe, expect, it } from 'vitest';
import { capabilitySlugs, gameDestination, hasCapability, parseCapability } from './capabilities';

describe('game capabilities', () => {
  it('includes unreviewed scoring templates and distinguishes tools', () => {
    expect(hasCapability('acquire-1963', 'scoring')).toBe(true);
    expect(hasCapability('acquire-1963', 'tools')).toBe(false);
    expect(hasCapability('the-gang-2024', 'scoring')).toBe(true);
    expect(hasCapability('the-gang-2024', 'tools')).toBe(true);
    expect(hasCapability('unknown', 'any')).toBe(false);
  });
  it('unites both capabilities without duplicates', () => {
    const all = capabilitySlugs('any');
    expect(all).toContain('scout-2019');
    expect(all.filter((slug) => slug === 'the-gang-2024')).toHaveLength(1);
    expect(capabilitySlugs('tools')).toEqual(['the-gang-2024']);
  });
  it('accepts filtered links and safely defaults unknown values', () => {
    expect(parseCapability('scoring')).toBe('scoring');
    expect(parseCapability('any')).toBe('any');
    expect(parseCapability('bogus')).toBe('all');
    expect(parseCapability(undefined)).toBe('all');
  });
});

describe('capability navigation', () => {
  it('opens scoring or tools directly according to the selected section', () => {
    expect(gameDestination('the-gang-2024', 'scoring')).toEqual({
      pathname: '/score/[slug]',
      params: { slug: 'the-gang-2024' },
    });
    expect(gameDestination('the-gang-2024', 'tools')).toBe('/games/the-gang-2024/missions');
    expect(gameDestination('acquire-1963', 'scoring')).toEqual({
      pathname: '/score/[slug]',
      params: { slug: 'acquire-1963' },
    });
  });
  it('keeps ordinary catalog and unavailable capability links on game detail', () => {
    for (const capability of ['all', 'any', 'tools'] as const) {
      expect(gameDestination('acquire-1963', capability)).toEqual({
        pathname: '/games/[slug]',
        params: { slug: 'acquire-1963' },
      });
    }
  });
});
