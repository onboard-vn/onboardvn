import { barcodeCodeParamSchema, gameIdParamSchema, shelfAddSchema } from '@onboard/shared';
import { Hono } from 'hono';
import { requireUser } from '../../auth/middleware.js';
import { zValidator } from '../../lib/validator.js';
import type { AppEnv } from '../../types.js';
import * as service from './service.js';

export const shelfRoutes = new Hono<AppEnv>()
  .get('/', requireUser, async (c) => {
    return c.json({ items: await service.listMyShelfService(c.var.user.id) });
  })
  .post('/', requireUser, zValidator('json', shelfAddSchema), async (c) => {
    const item = await service.addToShelfService(c.var.user.id, c.req.valid('json'));
    return c.json(item);
  })
  .delete('/:gameId', requireUser, zValidator('param', gameIdParamSchema), async (c) => {
    await service.removeFromShelfService(c.var.user.id, c.req.valid('param').gameId);
    return c.body(null, 204);
  });

export const localBarcodeRoutes = new Hono<AppEnv>().get(
  '/:code',
  requireUser,
  zValidator('param', barcodeCodeParamSchema),
  async (c) => {
    return c.json(await service.lookupLocalBarcodeService(c.req.valid('param').code));
  },
);
