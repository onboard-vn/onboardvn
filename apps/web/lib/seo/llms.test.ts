import { describe, expect, it } from 'vitest';
import { buildLlmsFullTxt, buildLlmsTxt } from './llms';

const siteUrl = 'https://onboard.j2teamnnl.com';

describe('buildLlmsTxt', () => {
  it('links to docs, dataset, OpenAPI and license', () => {
    const text = buildLlmsTxt(siteUrl);
    expect(text).toContain('https://onboard.j2teamnnl.com/developers');
    expect(text).toContain('https://onboard.j2teamnnl.com/api/openapi.json');
    expect(text).toContain('https://github.com/onboard-vn/onboardvn');
    expect(text).toContain('AGPL-3.0-only');
    expect(text).toContain('CC BY-SA 4.0');
  });
});

describe('buildLlmsFullTxt', () => {
  const games = [
    { slug: 'ma-soi', nameVi: 'Ma Sói', nameEn: 'Werewolf' },
    { slug: 'catan', nameVi: null, nameEn: 'Catan' },
  ];
  const cafes = [
    { slug: 'quan-abc', name: 'Quán ABC', provinceName: 'TP.HCM', wardName: 'Phường 1' },
  ];

  it('lists games (preferring nameVi) and cafes as markdown links', () => {
    const text = buildLlmsFullTxt(siteUrl, games, cafes);
    expect(text).toContain('[Ma Sói](https://onboard.j2teamnnl.com/games/ma-soi)');
    expect(text).toContain('[Catan](https://onboard.j2teamnnl.com/games/catan)');
    expect(text).toContain(
      '[Quán ABC](https://onboard.j2teamnnl.com/cafes/quan-abc) — Phường 1, TP.HCM',
    );
  });

  it('truncates and marks truncation once the byte cap is reached', () => {
    const manyGames = Array.from({ length: 50 }, (_, i) => ({
      slug: `game-${i}`,
      nameVi: `Game rất dài tên để tốn byte số ${i}`,
      nameEn: `Game ${i}`,
    }));
    const text = buildLlmsFullTxt(siteUrl, manyGames, cafes, 800);
    expect(text).toContain('cắt bớt');
    expect(new TextEncoder().encode(text).length).toBeLessThan(1200);
  });

  it('stays under the byte cap for a small dataset', () => {
    const text = buildLlmsFullTxt(siteUrl, games, cafes);
    expect(text).not.toContain('cắt bớt');
  });
});
