import type { AppType } from '@onboard/api';
import { hc } from 'hono/client';
import { API_INTERNAL_URL } from './env';

/**
 * Anonymous API client for public, non-personalized data (robots/sitemap/llms/OG previews).
 * Unlike `serverApi()` in `api-server.ts`, this never forwards cookies, so it works outside a
 * request scope (build-time generation) and never returns staff-only fields.
 */
export function publicApi() {
  return hc<AppType>(API_INTERNAL_URL);
}
