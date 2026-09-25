import {
  cafeConsentDecisionSchema,
  cafeMemberParamSchema,
  cafeStaffInputSchema,
  idParamSchema,
  inventoryImportApplyInputSchema,
  inventoryImportDryRunQuerySchema,
  inviteIdParamSchema,
  tokenParamSchema,
} from '@onboard/shared';
import { Hono } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { requireCafeRole } from '../../auth/cafe-role.js';
import { requireRole, requireUser } from '../../auth/middleware.js';
import { ApiError } from '../../lib/errors.js';
import { userRateLimit } from '../../lib/user-rate-limit.js';
import { zValidator } from '../../lib/validator.js';
import type { AppEnv } from '../../types.js';
import {
  acceptOwnerInviteService,
  addCafeStaffService,
  applyInventoryImportService,
  createOwnerInviteService,
  dryRunInventoryImportService,
  listCafeMembersService,
  listMyMembershipsService,
  listOwnerInvitesService,
  previewOwnerInviteService,
  removeCafeMemberService,
  revokeOwnerInviteService,
  setCafeConsentService,
} from './service.js';

const MAX_IMPORT_FILE_BYTES = 1_000_000;
const IMPORT_APPLY_HOURLY_LIMIT = 10;
const IMPORT_DRY_RUN_HOURLY_LIMIT = 30;
const HOUR_MS = 60 * 60 * 1000;

/** Rejects before the body is fully buffered, unlike a post-hoc `file.size`/byte-length check. */
const csvBodyLimit = bodyLimit({
  maxSize: MAX_IMPORT_FILE_BYTES,
  onError: () => {
    throw new ApiError('BAD_REQUEST', 413, 'File quá lớn (tối đa 1MB)');
  },
});

/** Accepts either a multipart file upload (`file` field) or a raw `text/csv` body — whichever
 * is simplest for the caller. Size is already capped by `csvBodyLimit`. */
async function readCsvBody(c: {
  req: {
    header: (name: string) => string | undefined;
    parseBody: () => Promise<unknown>;
    text: () => Promise<string>;
  };
}): Promise<string> {
  const contentType = c.req.header('content-type') ?? '';

  if (contentType.includes('multipart/form-data')) {
    const body = (await c.req.parseBody()) as Record<string, unknown>;
    const file = body.file;
    if (!(file instanceof File)) throw new ApiError('VALIDATION_FAILED', 422, 'Thiếu file CSV');
    return file.text();
  }

  const text = await c.req.text();
  if (!text.trim()) throw new ApiError('VALIDATION_FAILED', 422, 'Thiếu nội dung CSV');
  return text;
}

export interface CafeOwnerRoutesOptions {
  rateLimit: boolean;
}

export const cafeOwnerRoutes = ({ rateLimit }: CafeOwnerRoutesOptions) =>
  new Hono<AppEnv>()
    .post(
      '/cafes/:id/owner-invites',
      requireRole('maintainer', 'admin'),
      zValidator('param', idParamSchema),
      async (c) => {
        const invite = await createOwnerInviteService(c.req.param('id'), c.var.user.id);
        return c.json(invite, 201);
      },
    )
    .get(
      '/cafes/:id/owner-invites',
      requireRole('maintainer', 'admin'),
      zValidator('param', idParamSchema),
      async (c) => {
        return c.json({ items: await listOwnerInvitesService(c.req.param('id')) });
      },
    )
    .delete(
      '/cafes/:id/owner-invites/:inviteId',
      requireRole('maintainer', 'admin'),
      zValidator('param', inviteIdParamSchema),
      async (c) => {
        await revokeOwnerInviteService(c.req.param('id'), c.req.param('inviteId'));
        return c.body(null, 204);
      },
    )
    .get(
      '/cafes/:id/members',
      requireRole('maintainer', 'admin'),
      zValidator('param', idParamSchema),
      async (c) => {
        return c.json({ items: await listCafeMembersService(c.req.param('id')) });
      },
    )
    .delete(
      '/cafes/:id/members/:userId',
      requireRole('maintainer', 'admin'),
      zValidator('param', cafeMemberParamSchema),
      async (c) => {
        await removeCafeMemberService(c.req.param('id'), c.req.param('userId'));
        return c.body(null, 204);
      },
    )
    .get('/owner-invites/:token', zValidator('param', tokenParamSchema), async (c) => {
      return c.json(await previewOwnerInviteService(c.req.valid('param').token));
    })
    .post(
      '/owner-invites/:token/accept',
      requireUser,
      zValidator('param', tokenParamSchema),
      async (c) => {
        const result = await acceptOwnerInviteService(c.var.user.id, c.req.valid('param').token);
        return c.json(result);
      },
    )
    .get('/me/cafes', requireUser, async (c) => {
      return c.json({ items: await listMyMembershipsService(c.var.user.id) });
    })
    .post(
      '/me/cafes/:id/consent',
      requireUser,
      zValidator('param', idParamSchema),
      zValidator('json', cafeConsentDecisionSchema),
      async (c) => {
        await setCafeConsentService(c.req.param('id'), c.var.user.id, c.req.valid('json'));
        return c.body(null, 204);
      },
    )
    .post(
      '/me/cafes/:id/staff',
      requireUser,
      zValidator('param', idParamSchema),
      zValidator('json', cafeStaffInputSchema),
      async (c) => {
        await addCafeStaffService(c.req.param('id'), c.var.user.id, c.req.valid('json').username);
        return c.body(null, 204);
      },
    )
    .post(
      '/me/cafes/:id/inventory/import',
      requireCafeRole('owner', 'staff'),
      userRateLimit({ limit: IMPORT_DRY_RUN_HOURLY_LIMIT, windowMs: HOUR_MS, enabled: rateLimit }),
      csvBodyLimit,
      zValidator('param', idParamSchema),
      zValidator('query', inventoryImportDryRunQuerySchema),
      async (c) => {
        const csvContent = await readCsvBody(c);
        return c.json(await dryRunInventoryImportService(c.req.param('id'), csvContent));
      },
    )
    .post(
      '/me/cafes/:id/inventory/import/apply',
      requireCafeRole('owner', 'staff'),
      userRateLimit({ limit: IMPORT_APPLY_HOURLY_LIMIT, windowMs: HOUR_MS, enabled: rateLimit }),
      zValidator('param', idParamSchema),
      zValidator('json', inventoryImportApplyInputSchema),
      async (c) => {
        const result = await applyInventoryImportService(
          c.req.param('id'),
          c.var.user.id,
          c.req.valid('json'),
        );
        return c.json(result);
      },
    );
