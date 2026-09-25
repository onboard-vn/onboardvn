import { SITE_URL } from '@/lib/env';
import { buildLlmsTxt } from '@/lib/seo/llms';

// The API isn't reachable at web build time (separate Docker image); never prerender this.
export const dynamic = 'force-dynamic';

export async function GET(): Promise<Response> {
  return new Response(buildLlmsTxt(SITE_URL), {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}
