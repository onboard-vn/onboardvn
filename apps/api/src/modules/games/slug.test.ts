import { describe, expect, it } from 'vitest';
import { slugify } from './slug.js';

describe('slugify', () => {
  it('strips Vietnamese diacritics and đ', () => {
    expect(slugify('Ma Sói Đêm')).toBe('ma-soi-dem');
  });

  it('collapses non alphanumeric runs into single dashes and trims edges', () => {
    expect(slugify('Catan: Trò Chơi Mở Rộng!')).toBe('catan-tro-choi-mo-rong');
  });

  it('always outputs ASCII kebab-case, even for non-Latin scripts', () => {
    const inputs = ['Ma Sói Đêm', 'Café Sài Gòn — Quận 1', '株式会社', 'Résumé (Ver. 2)'];
    for (const input of inputs) {
      expect(slugify(input)).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$|^$/);
    }
  });
});
