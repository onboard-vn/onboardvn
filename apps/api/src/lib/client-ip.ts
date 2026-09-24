import { getConnInfo } from '@hono/node-server/conninfo';
import type { Context } from 'hono';
import { env } from './env.js';
import type { AppEnv } from '../types.js';

/** Leftmost `X-Forwarded-For` entry, trimmed; `undefined` if the header is absent/empty. */
export function pickForwardedIp(headerValue: string | undefined): string | undefined {
  return headerValue?.split(',')[0]?.trim() || undefined;
}

/**
 * Resolves the client IP for rate limiting. Behind Caddy (`TRUST_PROXY=true`) the leftmost
 * `X-Forwarded-For` entry is Caddy's view of the real client; otherwise the socket's remote
 * address is used so a client cannot spoof a header to collapse everyone into one bucket.
 */
export function getClientIp(c: Context<AppEnv>): string {
  if (env.TRUST_PROXY) {
    const forwarded = pickForwardedIp(c.req.header('x-forwarded-for'));
    if (forwarded) return forwarded;
  }
  try {
    return getConnInfo(c).remote.address ?? 'unknown';
  } catch {
    // No Node socket (e.g. app.request in tests or a non-node adapter).
    return 'unknown';
  }
}
