import {
  cafeCreateSchema,
  cafeFilterSchema,
  cafeGameBulkInputSchema,
  cafeGameCopiesSchema,
  cafeGameInputSchema,
  cafeUpdateSchema,
  idAndGameIdParamSchema,
  idParamSchema,
} from '@onboard/shared';
import { Hono } from 'hono';
import { requireRole } from '../../auth/middleware.js';
import { zValidator } from '../../lib/validator.js';
import type { AppEnv } from '../../types.js';
import {
  addGameToCafeService,
  bulkAddGamesToCafeService,
  createCafeService,
  deleteCafeService,
  getCafeBySlugService,
  getCafeForManageService,
  listCafesService,
  removeGameFromCafeService,
  updateCafeGameCopiesService,
  updateCafeService,
} from './service.js';

export const cafeRoutes = new Hono<AppEnv>()
  .get('/', zValidator('query', cafeFilterSchema), async (c) => {
    return c.json(await listCafesService(c.req.valid('query')));
  })
  .get(
    '/manage',
    requireRole('maintainer', 'admin'),
    zValidator('query', cafeFilterSchema),
    async (c) => {
      return c.json(
        await listCafesService(c.req.valid('query'), { includePending: true, showAll: true }),
      );
    },
  )
  .get('/:slug', async (c) => {
    return c.json(await getCafeBySlugService(c.req.param('slug')));
  })
  .get(
    '/:id/manage',
    requireRole('maintainer', 'admin'),
    zValidator('param', idParamSchema),
    async (c) => {
      return c.json(await getCafeForManageService(c.req.param('id')));
    },
  )
  .post(
    '/',
    requireRole('maintainer', 'admin'),
    zValidator('json', cafeCreateSchema),
    async (c) => {
      const cafe = await createCafeService(c.req.valid('json'), c.var.user.id);
      return c.json(cafe, 201);
    },
  )
  .patch(
    '/:id',
    requireRole('maintainer', 'admin'),
    zValidator('param', idParamSchema),
    zValidator('json', cafeUpdateSchema),
    async (c) => {
      const cafe = await updateCafeService(c.req.param('id'), c.req.valid('json'));
      return c.json(cafe);
    },
  )
  .delete(
    '/:id',
    requireRole('maintainer', 'admin'),
    zValidator('param', idParamSchema),
    async (c) => {
      await deleteCafeService(c.req.param('id'));
      return c.body(null, 204);
    },
  )
  .post(
    '/:id/games',
    requireRole('maintainer', 'admin'),
    zValidator('param', idParamSchema),
    zValidator('json', cafeGameInputSchema),
    async (c) => {
      const cafe = await addGameToCafeService(
        c.req.param('id'),
        c.req.valid('json'),
        c.var.user.id,
      );
      return c.json(cafe, 201);
    },
  )
  .patch(
    '/:id/games/:gameId',
    requireRole('maintainer', 'admin'),
    zValidator('param', idAndGameIdParamSchema),
    zValidator('json', cafeGameCopiesSchema),
    async (c) => {
      const cafe = await updateCafeGameCopiesService(
        c.req.param('id'),
        c.req.param('gameId'),
        c.req.valid('json').copies,
      );
      return c.json(cafe);
    },
  )
  .delete(
    '/:id/games/:gameId',
    requireRole('maintainer', 'admin'),
    zValidator('param', idAndGameIdParamSchema),
    async (c) => {
      const cafe = await removeGameFromCafeService(c.req.param('id'), c.req.param('gameId'));
      return c.json(cafe);
    },
  )
  .post(
    '/:id/games/bulk',
    requireRole('maintainer', 'admin'),
    zValidator('param', idParamSchema),
    zValidator('json', cafeGameBulkInputSchema),
    async (c) => {
      const body = c.req.valid('json');
      const result = await bulkAddGamesToCafeService(
        c.req.param('id'),
        body.gameIds,
        c.var.user.id,
        body.addedVia,
      );
      return c.json(result);
    },
  );
