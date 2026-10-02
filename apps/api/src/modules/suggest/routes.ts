import { suggestQuerySchema } from '@onboard/shared';
import { Hono } from 'hono';
import { zValidator } from '../../lib/validator.js';
import type { AppEnv } from '../../types.js';
import { suggestPoolService } from './service.js';

export const suggestRoutes = new Hono<AppEnv>().get(
  '/',
  zValidator('query', suggestQuerySchema),
  async (c) => {
    c.header('Cache-Control', 'no-store');
    return c.json(await suggestPoolService(c.get('user')?.id ?? null, c.req.valid('query')));
  },
);
