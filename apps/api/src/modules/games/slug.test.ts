import { describe, expect, it } from 'vitest';
import { slugify } from './slug.js';

describe('slugify', () => {
  it('strips Vietnamese diacritics and đ', () => {
    expect(slugify('Ma Sói Đêm')).toBe('ma-soi-dem');
  });

  it('collapses non alphanumeric runs into single dashes and trims edges', () => {
    expect(slugify('Catan: Trò Chơi Mở Rộng!')).toBe('catan-tro-choi-mo-rong');
  });
});
