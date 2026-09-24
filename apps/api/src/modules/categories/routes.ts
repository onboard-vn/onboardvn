import {
  categoryCreateSchema,
  categoryFilterSchema,
  categoryUpdateSchema,
  idParamSchema,
} from '@onboard/shared';
import { Hono } from 'hono';
import { requireRole } from '../../auth/middleware.js';
import { zValidator } from '../../lib/validator.js';
import type { AppEnv } from '../../types.js';
import {
  createCategoryService,
  deleteCategoryService,
  listCategoriesService,
  updateCategoryService,
} from './service.js';

export const categoryRoutes = new Hono<AppEnv>()
  .get('/', zValidator('query', categoryFilterSchema), async (c) => {
    return c.json({ items: await listCategoriesService(c.req.valid('query')) });
  })
  .post(
    '/',
    requireRole('maintainer', 'admin'),
    zValidator('json', categoryCreateSchema),
    async (c) => {
      const category = await createCategoryService(c.req.valid('json'));
      return c.json(category, 201);
    },
  )
  .patch(
    '/:id',
    requireRole('maintainer', 'admin'),
    zValidator('param', idParamSchema),
    zValidator('json', categoryUpdateSchema),
    async (c) => {
      const category = await updateCategoryService(c.req.param('id'), c.req.valid('json'));
      return c.json(category);
    },
  )
  .delete(
    '/:id',
    requireRole('maintainer', 'admin'),
    zValidator('param', idParamSchema),
    async (c) => {
      await deleteCategoryService(c.req.param('id'));
      return c.body(null, 204);
    },
  );
