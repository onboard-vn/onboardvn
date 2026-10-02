import {
  claimRedeemSchema,
  claimRequestCreateSchema,
  clubMeetupsQuerySchema,
  guestCreateSchema,
  idParamSchema,
  identityListQuerySchema,
  tableGuestParamSchema,
  tableIdParamSchema,
} from '@onboard/shared';
import { Hono } from 'hono';
import { requireClubRole } from '../../auth/club-role.js';
import { requireUser } from '../../auth/middleware.js';
import { userRateLimit } from '../../lib/user-rate-limit.js';
import { zValidator } from '../../lib/validator.js';
import type { AppEnv } from '../../types.js';
import * as service from './service.js';
import * as tables from './tables.js';

const HOUR_MS = 60 * 60 * 1000;
const noStore = (c: { header: (k: string, v: string) => void }) =>
  c.header('Cache-Control', 'private, no-store');

export const clubScopedRoutes = new Hono<AppEnv>()
  .get(
    '/:id/identities',
    requireUser,
    requireClubRole('owner', 'admin', 'member'),
    zValidator('param', idParamSchema),
    zValidator('query', identityListQuerySchema),
    async (c) =>
      c.json(
        await service.listClubIdentitiesService(
          c.req.valid('param').id,
          c.var.user.id,
          c.req.valid('query'),
        ),
      ),
  )
  .get(
    '/:id/meetups',
    requireUser,
    requireClubRole('owner', 'admin', 'member'),
    zValidator('param', idParamSchema),
    zValidator('query', clubMeetupsQuerySchema),
    async (c) => {
      noStore(c);
      return c.json(
        await tables.listClubMeetupsService(
          c.req.valid('param').id,
          c.var.user.id,
          c.req.valid('query'),
        ),
      );
    },
  );

export const tableRoutes = ({ rateLimit }: { rateLimit: boolean }) =>
  new Hono<AppEnv>()
    .get('/:tableId', requireUser, zValidator('param', tableIdParamSchema), async (c) => {
      noStore(c);
      return c.json(await tables.getTableService(c.req.valid('param').tableId, c.var.user.id));
    })
    .post(
      '/:tableId/guests',
      requireUser,
      zValidator('param', tableIdParamSchema),
      zValidator('json', guestCreateSchema),
      userRateLimit({ limit: 60, windowMs: HOUR_MS, enabled: rateLimit }),
      async (c) =>
        c.json(
          await service.addGuestService(
            c.req.valid('param').tableId,
            { id: c.var.user.id, name: c.var.user.name },
            c.req.valid('json'),
          ),
          201,
        ),
    )
    .delete(
      '/:tableId/guests/:identityId',
      requireUser,
      zValidator('param', tableGuestParamSchema),
      async (c) => {
        const { tableId, identityId } = c.req.valid('param');
        await service.removeGuestService(tableId, identityId, c.var.user.id);
        return c.body(null, 204);
      },
    );

export const identityRoutes = ({ rateLimit }: { rateLimit: boolean }) =>
  new Hono<AppEnv>()
    .post(
      '/claim',
      requireUser,
      zValidator('json', claimRedeemSchema),
      userRateLimit({ limit: 20, windowMs: HOUR_MS, enabled: rateLimit }),
      async (c) =>
        c.json(await service.redeemClaimService(c.var.user.id, c.req.valid('json').token)),
    )
    .post(
      '/:id/claim-links',
      requireUser,
      zValidator('param', idParamSchema),
      userRateLimit({ limit: 60, windowMs: HOUR_MS, enabled: rateLimit }),
      async (c) =>
        c.json(await service.createClaimLinkService(c.req.valid('param').id, c.var.user.id), 201),
    )
    .post(
      '/:id/claim-requests',
      requireUser,
      zValidator('param', idParamSchema),
      zValidator('json', claimRequestCreateSchema),
      userRateLimit({ limit: 10, windowMs: HOUR_MS, enabled: rateLimit }),
      async (c) =>
        c.json(
          await service.createClaimRequestService(
            c.req.valid('param').id,
            c.var.user.id,
            c.req.valid('json'),
          ),
          201,
        ),
    );

export const claimRequestRoutes = new Hono<AppEnv>()
  .get('/', requireUser, async (c) => {
    noStore(c);
    return c.json(await service.listMyClaimRequestsService(c.var.user.id));
  })
  .post('/:id/approve', requireUser, zValidator('param', idParamSchema), async (c) =>
    c.json(await service.decideClaimRequestService(c.req.valid('param').id, c.var.user.id, true)),
  )
  .post('/:id/reject', requireUser, zValidator('param', idParamSchema), async (c) =>
    c.json(await service.decideClaimRequestService(c.req.valid('param').id, c.var.user.id, false)),
  );
