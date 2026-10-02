import { describe, expect, it } from 'vitest';
import { normalizeFilterParam } from './filter-param';

describe('normalizeFilterParam', () => {
  it('trims, takes first of array, drops empties', () => {
    expect(normalizeFilterParam(' abc ')).toBe('abc');
    expect(normalizeFilterParam(['x', 'y'])).toBe('x');
    expect(normalizeFilterParam('  ')).toBeUndefined();
    expect(normalizeFilterParam(undefined)).toBeUndefined();
  });
});
