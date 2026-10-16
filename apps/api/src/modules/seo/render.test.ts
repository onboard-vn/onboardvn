import { describe, expect, it } from 'vitest';
import { renderPage, renderSitemap, renderSitemapIndex, type PageMetadata } from './render.js';
const page: PageMetadata = {
  title: 'OnBoardVN',
  description: 'Game Việt Nam',
  canonical: 'https://example.com/games',
  image: 'https://example.com/opengraph-image.jpg',
  imageAlt: 'Cộng đồng',
  indexable: true,
  status: 200,
  links: [{ href: '/games', label: 'Game' }],
};
const shell =
  '<html lang="en"><head><title>Onboard</title><link rel="stylesheet" href="/app.css"></head><body><div id="root"></div><script src="/app.js"></script></body></html>';
describe('public HTML metadata', () => {
  it('provides initial HTML OG, X cards, canonical, Vietnamese and crawlable links', () => {
    const html = renderPage(shell, page);
    for (const part of [
      'lang="vi"',
      'property="og:image" content="https://example.com/opengraph-image.jpg"',
      'name="twitter:card" content="summary_large_image"',
      'content="1200"',
      'rel="canonical" href="https://example.com/games"',
      '<a href="/games">Game</a>',
      'src="/app.js"',
      'href="/app.css"',
    ])
      expect(html).toContain(part);
  });
  it('escapes untrusted HTML, JSON-LD and XML, without fabricating image dimensions', () => {
    const html = renderPage(shell, {
      ...page,
      title: '<script>"&',
      image: 'https://example.com/game.png',
      description: '</p><img src=x>',
      jsonLd: { name: '</script><script>alert(1)</script>' },
    });
    expect(html).not.toContain('<script>alert(1)');
    expect(html).toContain('\\u003c/script>');
    expect(html).not.toContain('property="og:image:width"');
    expect(html).toContain('&lt;script&gt;&quot;&amp;');
    expect(
      renderSitemap([{ url: 'https://example.com/?a=1&b=2', lastmod: '2026-10-16' }]),
    ).toContain('a=1&amp;b=2');
    expect(renderSitemapIndex(['https://example.com/sitemap.xml'])).toContain('<sitemapindex');
  });
  it('provides explicit noindex for private/error pages', () => {
    expect(renderPage(shell, { ...page, indexable: false })).toContain(
      'name="robots" content="noindex,nofollow"',
    );
  });
});
