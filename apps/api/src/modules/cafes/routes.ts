import {
  cafeCreateSchema,
  cafeFilterSchema,
  cafeGameBulkInputSchema,
  cafeGameCopiesSchema,
  cafeGameInputSchema,
  cafeMapFilterSchema,
  cafePhotoCaptionSchema,
  cafePhotoReorderSchema,
  cafeUpdateSchema,
  idAndGameIdParamSchema,
  idAndPhotoIdParamSchema,
  idParamSchema,
} from '@onboard/shared';
import { Hono } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { requireCafeRole } from '../../auth/cafe-role.js';
import { requireRole } from '../../auth/middleware.js';
import { ApiError } from '../../lib/errors.js';
import { zValidator } from '../../lib/validator.js';
import type { AppEnv } from '../../types.js';
import {
  addCafePhotoService,
  addGameToCafeService,
  bulkAddGamesToCafeService,
  createCafeService,
  deleteCafeCoverService,
  deleteCafeLogoService,
  deleteCafePhotoService,
  deleteCafeService,
  getCafeBySlugService,
  getCafeForManageService,
  getCafeForOwnerService,
  getCafeMapPinsService,
  listCafesService,
  removeGameFromCafeService,
  reorderCafePhotosService,
  setCafeCoverService,
  setCafeLogoService,
  updateCafeGameCopiesService,
  updateCafeService,
} from './service.js';

const MAX_MEDIA_UPLOAD_BYTES = 5 * 1024 * 1024;

/** Rejects an oversized body before it's fully buffered by `parseBody`. */
const mediaBodyLimit = bodyLimit({
  maxSize: MAX_MEDIA_UPLOAD_BYTES,
  onError: () => {
    throw new ApiError('BAD_REQUEST', 413, 'File quá lớn (tối đa 5MB)');
  },
});

async function readImageFile(c: { req: { parseBody: () => Promise<unknown> } }): Promise<{
  file: File;
}> {
  const body = (await c.req.parseBody()) as Record<string, unknown>;
  const file = body.file;
  if (!(file instanceof File)) throw new ApiError('VALIDATION_FAILED', 422, 'Thiếu file ảnh');
  return { file };
}

/** Same as {@link readImageFile} but also validates the optional `caption` field against
 * {@link cafePhotoCaptionSchema} (trim, ≤140 chars) instead of accepting any string. */
async function readPhotoUpload(c: {
  req: { parseBody: () => Promise<unknown> };
}): Promise<{ file: File; caption?: string }> {
  const body = (await c.req.parseBody()) as Record<string, unknown>;
  const file = body.file;
  if (!(file instanceof File)) throw new ApiError('VALIDATION_FAILED', 422, 'Thiếu file ảnh');

  const parsed = cafePhotoCaptionSchema.safeParse({
    caption: typeof body.caption === 'string' ? body.caption : undefined,
  });
  if (!parsed.success) {
    throw new ApiError('VALIDATION_FAILED', 422, 'Chú thích ảnh không hợp lệ (tối đa 140 ký tự)');
  }
  return { file, caption: parsed.data.caption };
}

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
  .get('/map', zValidator('query', cafeMapFilterSchema), async (c) => {
    return c.json(await getCafeMapPinsService(c.req.valid('query')));
  })
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
  )
  .post(
    '/:id/logo',
    requireCafeRole('owner', 'staff'),
    zValidator('param', idParamSchema),
    mediaBodyLimit,
    async (c) => {
      const { file } = await readImageFile(c);
      const cafe = await setCafeLogoService(c.req.param('id'), file);
      return c.json(cafe);
    },
  )
  .delete(
    '/:id/logo',
    requireCafeRole('owner', 'staff'),
    zValidator('param', idParamSchema),
    async (c) => {
      const cafe = await deleteCafeLogoService(c.req.param('id'));
      return c.json(cafe);
    },
  )
  .post(
    '/:id/cover',
    requireCafeRole('owner', 'staff'),
    zValidator('param', idParamSchema),
    mediaBodyLimit,
    async (c) => {
      const { file } = await readImageFile(c);
      const cafe = await setCafeCoverService(c.req.param('id'), file);
      return c.json(cafe);
    },
  )
  .delete(
    '/:id/cover',
    requireCafeRole('owner', 'staff'),
    zValidator('param', idParamSchema),
    async (c) => {
      const cafe = await deleteCafeCoverService(c.req.param('id'));
      return c.json(cafe);
    },
  )
  .post(
    '/:id/photos',
    requireCafeRole('owner', 'staff'),
    zValidator('param', idParamSchema),
    mediaBodyLimit,
    async (c) => {
      const { file, caption } = await readPhotoUpload(c);
      const cafe = await addCafePhotoService(c.req.param('id'), file, caption, c.var.user.id);
      return c.json(cafe, 201);
    },
  )
  .patch(
    '/:id/photos/reorder',
    requireCafeRole('owner', 'staff'),
    zValidator('param', idParamSchema),
    zValidator('json', cafePhotoReorderSchema),
    async (c) => {
      const cafe = await reorderCafePhotosService(c.req.param('id'), c.req.valid('json').photoIds);
      return c.json(cafe);
    },
  )
  .delete(
    '/:id/photos/:photoId',
    requireCafeRole('owner', 'staff'),
    zValidator('param', idAndPhotoIdParamSchema),
    async (c) => {
      const cafe = await deleteCafePhotoService(c.req.param('id'), c.req.param('photoId'));
      return c.json(cafe);
    },
  );
