import { describe, expect, it } from 'vitest';
import { cafeEntries, gameEntries, provinceEntries, staticEntries } from './sitemap';

describe('entry builders', () => {
  const siteUrl = 'https://onboard.vn';

  it('staticEntries lists the home, catalog and developers pages', () => {
    const urls = staticEntries(siteUrl).map((e) => e.url);
    expect(urls).toEqual([
      'https://onboard.vn',
      'https://onboard.vn/games',
      'https://onboard.vn/cafes',
      'https://onboard.vn/developers',
    ]);
  });

  it('gameEntries builds one URL per slug', () => {
    expect(gameEntries(siteUrl, ['ma-soi', 'catan'])).toEqual([
      { url: 'https://onboard.vn/games/ma-soi', changeFrequency: 'weekly', priority: 0.7 },
      { url: 'https://onboard.vn/games/catan', changeFrequency: 'weekly', priority: 0.7 },
    ]);
  });

  it('cafeEntries builds one URL per slug', () => {
    expect(cafeEntries(siteUrl, ['quan-abc'])).toEqual([
      { url: 'https://onboard.vn/cafes/quan-abc', changeFrequency: 'weekly', priority: 0.6 },
    ]);
  });

  it('provinceEntries links to the real /cafes?tinh= listing', () => {
    expect(provinceEntries(siteUrl, ['ho-chi-minh'])).toEqual([
      {
        url: 'https://onboard.vn/cafes?tinh=ho-chi-minh',
        changeFrequency: 'weekly',
        priority: 0.5,
      },
    ]);
  });
});
