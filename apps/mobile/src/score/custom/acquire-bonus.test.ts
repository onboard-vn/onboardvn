import { describe, expect, it } from 'vitest';
import { chainBonuses, endBonus, stockSales } from './acquire-bonus';

const ids = ['a', 'b', 'c'];

describe('acquire bonuses', () => {
  it('pays majority and minority', () => {
    const b = chainBonuses({ tower: 400 }, { a: { tower: 5 }, b: { tower: 3 } }, ids);
    expect(endBonus(b, 'a')).toBe(4000);
    expect(endBonus(b, 'b')).toBe(2000);
    expect(endBonus(b, 'c')).toBe(0);
  });

  it('gives both bonuses to a sole holder', () => {
    const b = chainBonuses({ tower: 400 }, { c: { tower: 2 } }, ids);
    expect(endBonus(b, 'c')).toBe(6000);
  });

  it('splits both bonuses on a majority tie, rounded up to $100', () => {
    const b = chainBonuses(
      { tower: 300 },
      { a: { tower: 4 }, b: { tower: 4 }, c: { tower: 1 } },
      ids,
    );
    expect(endBonus(b, 'a')).toBe(2300);
    expect(endBonus(b, 'b')).toBe(2300);
    expect(endBonus(b, 'c')).toBe(0);
  });

  it('splits the minority bonus on a minority tie', () => {
    const b = chainBonuses(
      { tower: 300 },
      { a: { tower: 6 }, b: { tower: 2 }, c: { tower: 2 } },
      ids,
    );
    expect(endBonus(b, 'a')).toBe(3000);
    expect(endBonus(b, 'b')).toBe(800);
    expect(endBonus(b, 'c')).toBe(800);
  });

  it('ignores chains without a price and sums sales across chains', () => {
    const shares = { a: { tower: 2, luxor: 3 } };
    expect(chainBonuses({ luxor: 0 }, shares, ids)).toEqual([]);
    expect(stockSales({ tower: 200, luxor: 100 }, shares, 'a')).toBe(700);
  });
});
