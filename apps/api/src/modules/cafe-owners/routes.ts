import {
  cafeConsentDecisionSchema,
  cafeMemberParamSchema,
  cafeStaffInputSchema,
  idParamSchema,
  inviteIdParamSchema,
  tokenParamSchema,
} from '@onboard/shared';
import { Hono } from 'hono';
import { requireRole, requireUser } from '../../auth/middleware.js';
import { zValidator } from '../../lib/validator.js';
import type { AppEnv } from '../../types.js';
import {
  acceptOwnerInviteService,
  addCafeStaffService,
  createOwnerInviteService,
  listCafeMembersService,
  listMyMembershipsService,
  listOwnerInvitesService,
  previewOwnerInviteService,
  removeCafeMemberService,
  revokeOwnerInviteService,
  setCafeConsentService,
} from './service.js';

export const cafeOwnerRoutes = new Hono<AppEnv>()
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
  );
