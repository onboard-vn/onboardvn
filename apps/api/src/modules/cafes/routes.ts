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
import { requireCafeRole } from '../../auth/cafe-role.js';
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
  getCafeForOwnerService,
  listCafesService,
  removeGameFromCafeService,
  updateCafeGameCopiesService,
  updateCafeService,
} from './service.js';

/** Café-scoped owner/staff never touch `sourceUrl`/`consentStatus`/`consentNote` via PATCH;
 * those change only through the dedicated consent endpoint. Silently dropped rather than
 * rejected. */
function stripOwnerOnlyFields<
  T extends { sourceUrl?: unknown; consentStatus?: unknown; consentNote?: unknown },
>(input: T): T {
  const rest = { ...input };
  delete rest.sourceUrl;
  delete rest.consentStatus;
  delete rest.consentNote;
  return rest;
}

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
    requireCafeRole('owner', 'staff'),
    zValidator('param', idParamSchema),
    async (c) => {
      const cafe = c.get('cafeMemberRole')
        ? await getCafeForOwnerService(c.req.param('id'))
        : await getCafeForManageService(c.req.param('id'));
      return c.json(cafe);
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
    requireCafeRole('owner', 'staff'),
    zValidator('param', idParamSchema),
    zValidator('json', cafeUpdateSchema),
    async (c) => {
      const memberRole = c.get('cafeMemberRole');
      const input = memberRole ? stripOwnerOnlyFields(c.req.valid('json')) : c.req.valid('json');
      await updateCafeService(c.req.param('id'), input);
      const cafe = memberRole
        ? await getCafeForOwnerService(c.req.param('id'))
        : await getCafeForManageService(c.req.param('id'));
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
    requireCafeRole('owner', 'staff'),
    zValidator('param', idParamSchema),
    zValidator('json', cafeGameInputSchema),
    async (c) => {
      const memberRole = c.get('cafeMemberRole');
      await addGameToCafeService(c.req.param('id'), c.req.valid('json'), c.var.user.id);
      const cafe = memberRole
        ? await getCafeForOwnerService(c.req.param('id'))
        : await getCafeForManageService(c.req.param('id'));
      return c.json(cafe, 201);
    },
  )
  .patch(
    '/:id/games/:gameId',
    requireCafeRole('owner', 'staff'),
    zValidator('param', idAndGameIdParamSchema),
    zValidator('json', cafeGameCopiesSchema),
    async (c) => {
      const memberRole = c.get('cafeMemberRole');
      await updateCafeGameCopiesService(
        c.req.param('id'),
        c.req.param('gameId'),
        c.req.valid('json').copies,
      );
      const cafe = memberRole
        ? await getCafeForOwnerService(c.req.param('id'))
        : await getCafeForManageService(c.req.param('id'));
      return c.json(cafe);
    },
  )
  .delete(
    '/:id/games/:gameId',
    requireCafeRole('owner', 'staff'),
    zValidator('param', idAndGameIdParamSchema),
    async (c) => {
      const memberRole = c.get('cafeMemberRole');
      await removeGameFromCafeService(c.req.param('id'), c.req.param('gameId'));
      const cafe = memberRole
        ? await getCafeForOwnerService(c.req.param('id'))
        : await getCafeForManageService(c.req.param('id'));
      return c.json(cafe);
    },
  )
  .post(
    '/:id/games/bulk',
    requireCafeRole('owner', 'staff'),
    zValidator('param', idParamSchema),
    zValidator('json', cafeGameBulkInputSchema),
    async (c) => {
      const memberRole = c.get('cafeMemberRole');
      const body = c.req.valid('json');
      // Café-scoped members can't claim 'import'/'scan' provenance for a manual bulk-add.
      const addedVia = memberRole ? undefined : body.addedVia;
      const result = await bulkAddGamesToCafeService(
        c.req.param('id'),
        body.gameIds,
        c.var.user.id,
        addedVia,
      );
      return c.json(result);
    },
  );
