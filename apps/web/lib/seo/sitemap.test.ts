import { describe, expect, it } from 'vitest';
import { cafeEntries, gameEntries, provinceEntries, staticEntries } from './sitemap';

describe('entry builders', () => {
  const siteUrl = 'https://onboard.j2teamnnl.com';

  it('staticEntries lists the home, catalog, developers and data-sources pages', () => {
    const urls = staticEntries(siteUrl).map((e) => e.url);
    expect(urls).toEqual([
      'https://onboard.j2teamnnl.com',
      'https://onboard.j2teamnnl.com/games',
      'https://onboard.j2teamnnl.com/cafes',
      'https://onboard.j2teamnnl.com/developers',
      'https://onboard.j2teamnnl.com/data-sources',
    ]);
  });

  it('gameEntries builds one URL per slug', () => {
    expect(gameEntries(siteUrl, ['ma-soi', 'catan'])).toEqual([
      {
        url: 'https://onboard.j2teamnnl.com/games/ma-soi',
        changeFrequency: 'weekly',
        priority: 0.7,
      },
      {
        url: 'https://onboard.j2teamnnl.com/games/catan',
        changeFrequency: 'weekly',
        priority: 0.7,
      },
    ]);
  });

  it('cafeEntries builds one URL per slug', () => {
    expect(cafeEntries(siteUrl, ['quan-abc'])).toEqual([
      {
        url: 'https://onboard.j2teamnnl.com/cafes/quan-abc',
        changeFrequency: 'weekly',
        priority: 0.6,
      },
    ]);
  });

  it('provinceEntries links to the real /cafes?province= listing', () => {
    expect(provinceEntries(siteUrl, ['ho-chi-minh'])).toEqual([
      {
        url: 'https://onboard.j2teamnnl.com/cafes?province=ho-chi-minh',
        changeFrequency: 'weekly',
        priority: 0.5,
      },
    ]);
  });
});
