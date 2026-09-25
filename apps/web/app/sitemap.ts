import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/env';
import { memoizeTtl } from '@/lib/seo/memoize-ttl';
import {
  cafeEntries,
  eventEntries,
  gameEntries,
  MAX_URLS_PER_SITEMAP,
  provinceEntries,
  staticEntries,
} from '@/lib/seo/sitemap';
import {
  fetchAllCafeSlugs,
  fetchAllEventSlugs,
  fetchAllGameSlugs,
  fetchAllProvinceSlugs,
} from '@/lib/seo/sitemap-data';

// The API isn't reachable at web build time (separate Docker image); never prerender this.
export const dynamic = 'force-dynamic';

const loadEntries = memoizeTtl(async (): Promise<MetadataRoute.Sitemap> => {
  const [gameSlugs, cafeSlugs, provinceSlugs, eventSlugs] = await Promise.all([
    fetchAllGameSlugs(),
    fetchAllCafeSlugs(),
    fetchAllProvinceSlugs(),
    fetchAllEventSlugs(),
  ]);
  return [
    ...staticEntries(SITE_URL),
    ...gameEntries(SITE_URL, gameSlugs),
    ...cafeEntries(SITE_URL, cafeSlugs),
    ...provinceEntries(SITE_URL, provinceSlugs),
    ...eventEntries(SITE_URL, eventSlugs),
  ].slice(0, MAX_URLS_PER_SITEMAP);
}, 3_600_000);

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  return loadEntries();
}
