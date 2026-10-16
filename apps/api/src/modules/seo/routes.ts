import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { Hono } from 'hono';
import { env } from '../../lib/env.js';
import { renderPage, renderSitemap, renderSitemapIndex, type PageMetadata } from './render.js';
import {
  pageMetadata,
  siteOrigin,
  sitemapEntries,
  sitemapKinds,
  sitemapPages,
  STATIC_PAGES,
  type SitemapKind,
} from './service.js';

export function seoRoutes(directory: string) {
  const app = new Hono();
  // These responses deliberately ignore cookies, auth headers and invite/query parameters.
  app.use('*', async (c, next) => {
    c.header('Cache-Control', 'no-store');
    c.header('X-Content-Type-Options', 'nosniff');
    await next();
  });
  app.get('/club', (c) => c.redirect('/clubs', 308));
  app.get('/cafes', (c) => c.redirect('/map', 308));
  app.get('/index.html', (c) => c.redirect('/', 308));
  app.get('/robots.txt', (c) =>
    c.text(
      `User-agent: *\nAllow: /\nDisallow: /api/auth/\nDisallow: /api/me/\nDisallow: /api/admin/\nSitemap: ${siteOrigin}/sitemap.xml\n`,
    ),
  );
  app.get('/sitemap.xml', async (c) => {
    const groups = await Promise.all(
      sitemapKinds.map(async (kind) =>
        Array.from(
          { length: await sitemapPages(kind) },
          (_, i) => `${siteOrigin}/sitemap-${kind}-${i + 1}.xml`,
        ),
      ),
    );
    c.header('Content-Type', 'application/xml; charset=utf-8');
    return c.body(renderSitemapIndex([`${siteOrigin}/sitemap-static.xml`, ...groups.flat()]));
  });
  app.get('/sitemap-static.xml', async (c) => {
    c.header('Content-Type', 'application/xml; charset=utf-8');
    return c.body(
      renderSitemap(
        [
          ...Object.keys(STATIC_PAGES),
          ...(JSON.parse(
            await readFile(join(directory, 'seo-capabilities.json'), 'utf8'),
          ) as string[]),
        ].map((path) => ({ url: siteOrigin + path })),
      ),
    );
  });
  app.get('*', async (c, next) => {
    const match = c.req.path.match(/^\/sitemap-(games|cafes|events|clubs)-([1-9]\d{0,5})\.xml$/);
    if (!match) return next();
    const kind = match[1] as SitemapKind;
    const page = Number(match[2]);
    if (page > (await sitemapPages(kind))) return c.notFound();
    c.header('Content-Type', 'application/xml; charset=utf-8');
    return c.body(renderSitemap(await sitemapEntries(kind, page)));
  });
  app.get('/api/site-metadata', async (c) => {
    const raw = c.req.query('path') || '/';
    const path = raw.split(/[?#]/, 1)[0]!;
    if (!path.startsWith('/') || path.startsWith('//') || path.length > 600)
      return c.json({ error: 'Invalid path' }, 400);
    try {
      const paths = JSON.parse(
        await readFile(join(directory, 'seo-capabilities.json'), 'utf8'),
      ) as string[];
      return c.json(await pageMetadata(path, paths));
    } catch {
      return c.json({ error: 'Metadata unavailable' }, 503);
    }
  });
  app.get('*', async (c) => {
    // Never turn an unknown API endpoint or missing asset into a successful HTML page.
    if (c.req.path.startsWith('/api/') || /\.[a-z0-9]+$/i.test(c.req.path)) return c.notFound();
    let shell: string;
    try {
      shell = await readFile(join(directory, 'index.html'), 'utf8');
    } catch {
      c.header('Retry-After', '30');
      return c.text('Site temporarily unavailable', 503);
    }
    let page: PageMetadata;
    try {
      const paths = JSON.parse(
        await readFile(join(directory, 'seo-capabilities.json'), 'utf8'),
      ) as string[];
      page = await pageMetadata(c.req.path, paths);
    } catch {
      page = {
        title: 'Tạm thời chưa tải được trang · OnBoardVN',
        description: 'Vui lòng thử lại sau.',
        canonical: new URL(env.WEB_ORIGIN).origin + '/',
        image: siteOrigin + '/opengraph-image.jpg',
        imageAlt: 'OnBoardVN',
        indexable: false,
        status: 503,
      };
      c.header('Retry-After', '30');
    }
    if (!page.indexable) c.header('X-Robots-Tag', 'noindex, nofollow');
    return c.html(renderPage(shell, page), page.status);
  });
  return app;
}
