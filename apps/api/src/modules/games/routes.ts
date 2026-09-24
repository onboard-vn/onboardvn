import {
  barcodeInputSchema,
  gameCreateSchema,
  gameFilterSchema,
  gameUpdateSchema,
  idAndCodeParamSchema,
  idParamSchema,
} from '@onboard/shared';
import { Hono } from 'hono';
import { requireRole } from '../../auth/middleware.js';
import { ApiError } from '../../lib/errors.js';
import { zValidator } from '../../lib/validator.js';
import type { AppEnv, SessionUser } from '../../types.js';
import { getCafesForGameService } from '../cafes/service.js';
import {
  addBarcodeService,
  createGameService,
  deleteGameService,
  getGameBySlugService,
  getGameRevisionsService,
  listGamesService,
  removeBarcodeService,
  setGameImageService,
  updateGameService,
} from './service.js';

function isStaff(user: SessionUser | null): boolean {
  return user?.role === 'maintainer' || user?.role === 'admin';
}

export const gameRoutes = new Hono<AppEnv>()
  .get('/', zValidator('query', gameFilterSchema), async (c) => {
    return c.json(await listGamesService(c.req.valid('query')));
  })
  .get('/:slug', async (c) => {
    return c.json(await getGameBySlugService(c.req.param('slug'), isStaff(c.get('user'))));
  })
  .get('/:slug/cafes', async (c) => {
    const game = await getGameBySlugService(c.req.param('slug'));
    return c.json(await getCafesForGameService(game.id));
  })
  .get('/:slug/revisions', requireRole('maintainer', 'admin'), async (c) => {
    return c.json({ items: await getGameRevisionsService(c.req.param('slug')) });
  })
  .post(
    '/',
    requireRole('maintainer', 'admin'),
    zValidator('json', gameCreateSchema),
    async (c) => {
      const game = await createGameService(c.req.valid('json'), c.var.user.id);
      return c.json(game, 201);
    },
  )
  .patch(
    '/:id',
    requireRole('maintainer', 'admin'),
    zValidator('param', idParamSchema),
    zValidator('json', gameUpdateSchema),
    async (c) => {
      const game = await updateGameService(c.req.param('id'), c.req.valid('json'), c.var.user.id);
      return c.json(game);
    },
  )
  .delete(
    '/:id',
    requireRole('maintainer', 'admin'),
    zValidator('param', idParamSchema),
    async (c) => {
      await deleteGameService(c.req.param('id'));
      return c.body(null, 204);
    },
  )
  .post(
    '/:id/barcodes',
    requireRole('maintainer', 'admin'),
    zValidator('param', idParamSchema),
    zValidator('json', barcodeInputSchema),
    async (c) => {
      const game = await addBarcodeService(c.req.param('id'), c.req.valid('json'));
      return c.json(game, 201);
    },
  )
  .delete(
    '/:id/barcodes/:code',
    requireRole('maintainer', 'admin'),
    zValidator('param', idAndCodeParamSchema),
    async (c) => {
      const game = await removeBarcodeService(c.req.param('id'), c.req.param('code'));
      return c.json(game);
    },
  )
  .post(
    '/:id/image',
    requireRole('maintainer', 'admin'),
    zValidator('param', idParamSchema),
    async (c) => {
      const body = await c.req.parseBody();
      const file = body.file;
      if (!(file instanceof File)) throw new ApiError('VALIDATION_FAILED', 422, 'Thiếu file ảnh');
      const imageCredit = typeof body.imageCredit === 'string' ? body.imageCredit : undefined;
      const game = await setGameImageService(c.req.param('id'), file, imageCredit);
      return c.json(game);
    },
  );
