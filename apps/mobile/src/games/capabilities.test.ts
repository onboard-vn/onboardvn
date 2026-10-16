import { describe, expect, it } from 'vitest';
import { capabilitySlugs, hasCapability, parseCapability } from './capabilities';

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
