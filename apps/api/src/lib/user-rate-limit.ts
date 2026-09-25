import type { ApiErrorBody } from '@onboard/shared';
import { rateLimiter } from 'hono-rate-limiter';
import type { MiddlewareHandler } from 'hono';
import type { AppEnv } from '../types.js';

const DAY_MS = 24 * 60 * 60 * 1000;

export interface UserRateLimitOptions {
  limit: number;
  windowMs?: number;
  enabled?: boolean;
}

export function userRateLimit({
  limit,
  windowMs = DAY_MS,
  enabled = true,
}: UserRateLimitOptions): MiddlewareHandler<AppEnv> {
  if (!enabled) return async (_c, next) => next();
  return rateLimiter<AppEnv>({
    windowMs,
    limit,
    standardHeaders: 'draft-7',
    keyGenerator: (c) => c.var.user?.id ?? 'anon',
    handler: (c) => {
      const body: ApiErrorBody = { error: { code: 'RATE_LIMITED', message: 'Quá nhiều yêu cầu' } };
      return c.json(body, 429);
    },
  });
}
