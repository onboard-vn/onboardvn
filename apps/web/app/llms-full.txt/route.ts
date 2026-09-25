import { SITE_URL } from '@/lib/env';
import { fetchAllCafesForLlms, fetchAllGamesForLlms } from '@/lib/seo/llms-data';
import { buildLlmsFullTxt } from '@/lib/seo/llms';
import { memoizeTtl } from '@/lib/seo/memoize-ttl';

// The API isn't reachable at web build time (separate Docker image); never prerender this.
export const dynamic = 'force-dynamic';

const loadBody = memoizeTtl(async () => {
  const [games, cafes] = await Promise.all([fetchAllGamesForLlms(), fetchAllCafesForLlms()]);
  return buildLlmsFullTxt(SITE_URL, games, cafes);
}, 3_600_000);

export async function GET(): Promise<Response> {
  return new Response(await loadBody(), {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}
