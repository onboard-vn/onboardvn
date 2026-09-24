import { rateLimiter } from 'hono-rate-limiter';
import type { ApiErrorBody } from '@onboard/shared';
import { getClientIp } from './client-ip.js';
import type { AppEnv } from '../types.js';

export const apiRateLimit = rateLimiter<AppEnv>({
  windowMs: 60_000,
  limit: 300,
  standardHeaders: 'draft-7',
  keyGenerator: (c) => getClientIp(c),
  handler: (c) => {
    const body: ApiErrorBody = { error: { code: 'RATE_LIMITED', message: 'Quá nhiều yêu cầu' } };
    return c.json(body, 429);
  },
});
