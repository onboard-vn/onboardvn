import { describe, expect, it } from 'vitest';
import { leftoverIngredientTypes } from './critter-kitchen-leftovers';
describe('combined Critter Kitchen leftover controls', () => {
  it('keeps carrots and wine available for To Go with Wine Cellar', () => {
    const available = leftoverIngredientTypes(
      new Set(['leftover-wine', 'leftover-ingredients']),
      false,
    );
    expect(available).toContain('carrot');
    expect(available).toContain('wine');
    expect(available).not.toContain('gelato');
  });
  it('includes gelato only when its module is available', () => {
    expect(
      leftoverIngredientTypes(new Set(['leftover-ingredients', 'leftover-wine']), true),
    ).toContain('gelato');
  });
  it('keeps Wine Cellar alone restricted to wine', () => {
    expect(leftoverIngredientTypes(new Set(['leftover-wine']), true)).toEqual(['wine']);
  });
  it('does not expose ingredients for spice-only leftovers', () => {
    expect(leftoverIngredientTypes(new Set(['leftover-spices']), false)).toEqual([]);
  });
});
