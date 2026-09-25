import { describe, expect, it } from 'vitest';
import { parseCafeTab } from './cafe-tabs';

describe('parseCafeTab', () => {
  it('defaults to "about" when tab is missing', () => {
    expect(parseCafeTab({})).toBe('about');
  });

  it('defaults to "about" for an unrecognized value', () => {
    expect(parseCafeTab({ tab: 'bogus' })).toBe('about');
  });

  it('accepts a valid tab value', () => {
    expect(parseCafeTab({ tab: 'photos' })).toBe('photos');
  });

  it('uses the first value when tab is an array', () => {
    expect(parseCafeTab({ tab: ['games', 'photos'] })).toBe('games');
  });
});
