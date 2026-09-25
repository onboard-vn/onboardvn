import { Hono } from 'hono';
import { getFriendsForProfileService } from '../friends/service.js';
import { getShelfForProfileService } from '../shelf/service.js';
import type { AppEnv } from '../../types.js';
import { getPublicProfileService } from './service.js';

export const userRoutes = new Hono<AppEnv>()
  .get('/:username', async (c) => {
    const viewerId = c.get('user')?.id ?? null;
    return c.json(await getPublicProfileService(viewerId, c.req.param('username')));
  })
  .get('/:username/friends', async (c) => {
    const viewerId = c.get('user')?.id ?? null;
    return c.json(await getFriendsForProfileService(viewerId, c.req.param('username')));
  })
  .get('/:username/shelf', async (c) => {
    const viewerId = c.get('user')?.id ?? null;
    return c.json(await getShelfForProfileService(viewerId, c.req.param('username')));
  });
