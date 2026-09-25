import type { MetadataRoute } from 'next';

/** Google's per-sitemap limit; https://www.sitemaps.org/protocol.html */
export const MAX_URLS_PER_SITEMAP = 50_000;

export function staticEntries(siteUrl: string): MetadataRoute.Sitemap {
  return [
    { url: siteUrl, changeFrequency: 'weekly', priority: 1 },
    { url: `${siteUrl}/games`, changeFrequency: 'daily', priority: 0.8 },
    { url: `${siteUrl}/cafes`, changeFrequency: 'daily', priority: 0.8 },
    { url: `${siteUrl}/map`, changeFrequency: 'daily', priority: 0.7 },
    { url: `${siteUrl}/developers`, changeFrequency: 'monthly', priority: 0.3 },
    { url: `${siteUrl}/data-sources`, changeFrequency: 'monthly', priority: 0.3 },
  ];
}

export function gameEntries(siteUrl: string, slugs: string[]): MetadataRoute.Sitemap {
  return slugs.map((slug) => ({
    url: `${siteUrl}/games/${slug}`,
    changeFrequency: 'weekly',
    priority: 0.7,
  }));
}

/** `slugs` must already exclude pending/declined cafés — the public `/api/cafes` list enforces that. */
export function cafeEntries(siteUrl: string, slugs: string[]): MetadataRoute.Sitemap {
  return slugs.map((slug) => ({
    url: `${siteUrl}/cafes/${slug}`,
    changeFrequency: 'weekly',
    priority: 0.6,
  }));
}

/** `/cafes?province=<slug>` is the real province listing (see `app/cafes/page.tsx`); no dedicated route exists. */
export function provinceEntries(siteUrl: string, provinceSlugs: string[]): MetadataRoute.Sitemap {
  return provinceSlugs.map((slug) => ({
    url: `${siteUrl}/cafes?province=${encodeURIComponent(slug)}`,
    changeFrequency: 'weekly',
    priority: 0.5,
  }));
}

/** `slugs` must already be upcoming, public meetups — the anonymous `GET /events` list enforces that. */
export function eventEntries(siteUrl: string, slugs: string[]): MetadataRoute.Sitemap {
  return slugs.map((slug) => ({
    url: `${siteUrl}/events/${slug}`,
    changeFrequency: 'daily',
    priority: 0.5,
  }));
}
