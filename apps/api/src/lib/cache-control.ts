import { createMiddleware } from 'hono/factory';
import type { AppEnv } from '../types.js';

/**
 * Adds a shared public `Cache-Control` to anonymous GET responses only. Authenticated
 * requests (staff `/manage` routes, session-aware responses) and non-GET methods never get it,
 * since `sessionMiddleware` already resolved `c.var.user` by the time this runs.
 */
export function publicCache(value = 'public, max-age=60, s-maxage=300') {
  return createMiddleware<AppEnv>(async (c, next) => {
    await next();
    if (c.req.method === 'GET' && !c.var.user && c.res.ok) {
      c.res.headers.set('Cache-Control', value);
      c.res.headers.append('Vary', 'Cookie');
    }
  });
}
