import { Hono } from 'hono';
import type { AppEnv } from '../../types.js';
import { getPublicProfileService } from './service.js';

export const userRoutes = new Hono<AppEnv>().get('/:username', async (c) => {
  return c.json(await getPublicProfileService(c.req.param('username')));
});
