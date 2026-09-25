import type { MetadataRoute } from 'next';

/** Google's per-sitemap limit; https://www.sitemaps.org/protocol.html */
export const MAX_URLS_PER_SITEMAP = 50_000;

export function staticEntries(siteUrl: string): MetadataRoute.Sitemap {
  return [
    { url: siteUrl, changeFrequency: 'weekly', priority: 1 },
    { url: `${siteUrl}/games`, changeFrequency: 'daily', priority: 0.8 },
    { url: `${siteUrl}/cafes`, changeFrequency: 'daily', priority: 0.8 },
    { url: `${siteUrl}/developers`, changeFrequency: 'monthly', priority: 0.3 },
  ];
}

export function gameEntries(siteUrl: string, slugs: string[]): MetadataRoute.Sitemap {
  return slugs.map((slug) => ({
    url: `${siteUrl}/games/${slug}`,
    changeFrequency: 'weekly',
    priority: 0.7,
  }));
}

/** `slugs` must already exclude pending cafés — the public `/api/cafes` list enforces that. */
export function cafeEntries(siteUrl: string, slugs: string[]): MetadataRoute.Sitemap {
  return slugs.map((slug) => ({
    url: `${siteUrl}/cafes/${slug}`,
    changeFrequency: 'weekly',
    priority: 0.6,
  }));
}

/** `/cafes?tinh=<slug>` is the real province listing (see `app/cafes/page.tsx`); no dedicated route exists. */
export function provinceEntries(siteUrl: string, provinceSlugs: string[]): MetadataRoute.Sitemap {
  return provinceSlugs.map((slug) => ({
    url: `${siteUrl}/cafes?tinh=${encodeURIComponent(slug)}`,
    changeFrequency: 'weekly',
    priority: 0.5,
  }));
}
