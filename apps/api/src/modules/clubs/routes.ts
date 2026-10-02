import {
  clubAddMemberSchema,
  clubCreateSchema,
  clubExternalMatchSchema,
  clubIdAndMemberIdParamSchema,
  clubIdAndUserIdParamSchema,
  clubJoinCodeParamSchema,
  clubJoinSchema,
  clubMemberRoleUpdateSchema,
  clubSlugParamSchema,
  clubUpdateSchema,
  idParamSchema,
} from '@onboard/shared';
import { Hono } from 'hono';
import { requireClubRole } from '../../auth/club-role.js';
import { requireRole, requireUser } from '../../auth/middleware.js';
import { userRateLimit } from '../../lib/user-rate-limit.js';
import { zValidator } from '../../lib/validator.js';
import type { AppEnv } from '../../types.js';
import * as service from './service.js';

const CLUBS_PER_DAY = 5;
const JOINS_PER_HOUR = 30;
const MATCHES_PER_DAY = 10;
const HOUR_MS = 60 * 60 * 1000;

export interface ClubRoutesOptions {
  rateLimit: boolean;
}

export const clubRoutes = ({ rateLimit }: ClubRoutesOptions) =>
  new Hono<AppEnv>()
    .get('/', requireUser, async (c) => c.json(await service.listMyClubsService(c.var.user.id)))
    .post(
      '/',
      requireUser,
      zValidator('json', clubCreateSchema),
      userRateLimit({ limit: CLUBS_PER_DAY, enabled: rateLimit }),
      async (c) => c.json(await service.createClubService(c.var.user.id, c.req.valid('json')), 201),
    )
    .post(
      '/join/:code',
      requireUser,
      zValidator('param', clubJoinCodeParamSchema),
      zValidator('json', clubJoinSchema),
      userRateLimit({ limit: JOINS_PER_HOUR, windowMs: HOUR_MS, enabled: rateLimit }),
      async (c) =>
        c.json(
          await service.joinByCodeService(
            c.var.user.id,
            c.req.valid('param').code,
            c.req.valid('json'),
          ),
        ),
    )
    .get('/:slug', zValidator('param', clubSlugParamSchema), async (c) => {
      const result = await service.getClubBySlugService(
        c.req.valid('param').slug,
        c.var.user?.id ?? null,
      );
      c.header('Cache-Control', 'private, no-store');
      return c.json(result);
    })
    .patch(
      '/:id',
      requireUser,
      requireClubRole('owner', 'admin'),
      zValidator('param', idParamSchema),
      zValidator('json', clubUpdateSchema),
      async (c) =>
        c.json(
          await service.updateClubService(
            c.req.valid('param').id,
            c.var.user.id,
            c.req.valid('json'),
          ),
        ),
    )
    .delete(
      '/:id',
      requireUser,
      requireClubRole('owner'),
      zValidator('param', idParamSchema),
      async (c) => {
        await service.deleteClubService(c.req.valid('param').id);
        return c.body(null, 204);
      },
    )
    .post(
      '/:id/invite-code/rotate',
      requireUser,
      requireClubRole('owner', 'admin'),
      zValidator('param', idParamSchema),
      async (c) => c.json(await service.rotateInviteCodeService(c.req.valid('param').id)),
    )
    .delete(
      '/:id/members/me',
      requireUser,
      requireClubRole('owner', 'admin', 'member'),
      zValidator('param', idParamSchema),
      async (c) => {
        await service.leaveClubService(c.req.valid('param').id, c.var.user.id);
        return c.body(null, 204);
      },
    )
    .post(
      '/:id/members',
      requireUser,
      requireClubRole('owner', 'admin'),
      zValidator('param', idParamSchema),
      zValidator('json', clubAddMemberSchema),
      async (c) => {
        await service.addMemberService(c.req.valid('param').id, c.var.user.id, c.req.valid('json'));
        return c.body(null, 204);
      },
    )
    .delete(
      '/:id/members/:userId',
      requireUser,
      requireClubRole('owner', 'admin'),
      zValidator('param', clubIdAndUserIdParamSchema),
      async (c) => {
        const { id, userId } = c.req.valid('param');
        await service.removeMemberService(id, c.var.clubRole, c.var.user.id, userId);
        return c.body(null, 204);
      },
    )
    .patch(
      '/:id/members/:userId',
      requireUser,
      requireClubRole('owner'),
      zValidator('param', clubIdAndUserIdParamSchema),
      zValidator('json', clubMemberRoleUpdateSchema),
      async (c) => {
        const { id, userId } = c.req.valid('param');
        await service.changeMemberRoleService(id, c.var.user.id, userId, c.req.valid('json').role);
        return c.body(null, 204);
      },
    )
    .get(
      '/:id/external-members',
      requireUser,
      requireClubRole('owner', 'admin', 'member'),
      zValidator('param', idParamSchema),
      async (c) => c.json(await service.listExternalMembersService(c.req.valid('param').id)),
    )
    .post(
      '/:id/external-match',
      requireUser,
      requireClubRole('owner', 'admin', 'member'),
      zValidator('param', idParamSchema),
      zValidator('json', clubExternalMatchSchema),
      userRateLimit({ limit: MATCHES_PER_DAY, enabled: rateLimit }),
      async (c) =>
        c.json(
          await service.matchExternalService(
            c.req.valid('param').id,
            c.var.user.id,
            c.req.valid('json').externalId,
          ),
        ),
    )
    .delete(
      '/:id/external-members/:memberId/link',
      requireUser,
      requireClubRole('owner', 'admin'),
      zValidator('param', clubIdAndMemberIdParamSchema),
      async (c) => {
        const { id, memberId } = c.req.valid('param');
        await service.unlinkExternalMemberService(id, memberId);
        return c.body(null, 204);
      },
    );

export const adminClubRoutes = new Hono<AppEnv>()
  .get('/', requireRole('maintainer', 'admin'), async (c) =>
    c.json(await service.adminListClubsService()),
  )
  .delete(
    '/:id',
    requireRole('maintainer', 'admin'),
    zValidator('param', idParamSchema),
    async (c) => {
      await service.adminDeleteClubService(c.req.valid('param').id, c.var.user.id);
      return c.body(null, 204);
    },
  );
