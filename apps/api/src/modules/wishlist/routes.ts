import { gameIdParamSchema } from '@onboard/shared';
import { Hono } from 'hono';
import { requireUser } from '../../auth/middleware.js';
import { zValidator } from '../../lib/validator.js';
import type { AppEnv } from '../../types.js';
import * as service from './service.js';

export const wishlistRoutes = new Hono<AppEnv>()
  .get('/', requireUser, async (c) => c.json(await service.listWishlistService(c.var.user.id)))
  .get('/ids', requireUser, async (c) =>
    c.json(await service.listWishlistIdsService(c.var.user.id)),
  )
  .post('/', requireUser, zValidator('json', gameIdParamSchema), async (c) => {
    const created = await service.addToWishlistService(c.var.user.id, c.req.valid('json').gameId);
    return c.body(null, created ? 201 : 200);
  })
  .delete('/:gameId', requireUser, zValidator('param', gameIdParamSchema), async (c) => {
    await service.removeFromWishlistService(c.var.user.id, c.req.valid('param').gameId);
    return c.body(null, 204);
  });
