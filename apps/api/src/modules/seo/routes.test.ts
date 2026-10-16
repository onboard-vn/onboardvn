import { describe, expect, it, vi } from 'vitest';
vi.mock('../../lib/env.js', () => ({ env: { WEB_ORIGIN: 'https://example.com' } }));
vi.mock('node:fs/promises', () => ({
  readFile: vi.fn(async (path: string) =>
    path.endsWith('.json')
      ? '["/score/acquire"]'
      : '<html><head><title>App</title></head><body><div id="root"></div><script src="/app.js"></script></body></html>',
  ),
}));
vi.mock('./service.js', () => ({
  siteOrigin: 'https://example.com',
  sitemapKinds: ['games'],
  STATIC_PAGES: { '/': ['Home', 'Public'] },
  sitemapPages: vi.fn(async () => 2),
  sitemapEntries: vi.fn(async () => [{ url: 'https://example.com/games/acquire' }]),
  pageMetadata: vi.fn(async (path: string) => ({
    title: 'Public',
    description: 'Page',
    canonical: 'https://example.com' + path,
    image: 'https://example.com/opengraph-image.jpg',
    imageAlt: 'Site',
    indexable: !path.startsWith('/account'),
    status: path === '/missing' ? 404 : 200,
  })),
}));
import { readFile } from 'node:fs/promises';
import { pageMetadata } from './service.js';
import { seoRoutes } from './routes.js';
const app = seoRoutes('/srv/mobile-web');
describe('SEO document routing', () => {
  it('exposes a valid sitemap index and paginated entity XML', async () => {
    expect(await (await app.request('/sitemap.xml')).text()).toContain('/sitemap-games-2.xml');
    const response = await app.request('/sitemap-games-1.xml');
    expect(response.status).toBe(200);
    expect(await response.text()).toContain('/games/acquire');
    expect((await app.request('/sitemap-games-3.xml')).status).toBe(404);
  });
  it('ignores query tokens/cookies for metadata and noindexes private HTML', async () => {
    const response = await app.request('/account?token=secret', {
      headers: { cookie: 'session=secret' },
    });
    expect(response.headers.get('x-robots-tag')).toContain('noindex');
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(await response.text()).not.toContain('secret');
    expect(pageMetadata).toHaveBeenCalledWith('/account', ['/score/acquire']);
  });
  it('preserves document status and never serves missing assets as HTML', async () => {
    expect((await app.request('/missing')).status).toBe(404);
    expect((await app.request('/missing.js')).status).toBe(404);
    expect((await app.request('/api/unknown')).status).toBe(404);
  });
  it('returns503 when the deployment shell is unavailable', async () => {
    vi.mocked(readFile).mockRejectedValueOnce(new Error('missing'));
    const response = await app.request('/');
    expect(response.status).toBe(503);
    expect(response.headers.get('retry-after')).toBe('30');
  });
});
