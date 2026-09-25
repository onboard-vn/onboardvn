import {
  idParamSchema,
  meetupCalendarQuerySchema,
  meetupCreateSchema,
  meetupDetailQuerySchema,
  meetupFilterSchema,
  meetupIdAndTableIdParamSchema,
  meetupInviteFriendsSchema,
  meetupSlugParamSchema,
  meetupTableCreateSchema,
  meetupTableUpdateSchema,
  meetupUpdateSchema,
  rsvpInputSchema,
} from '@onboard/shared';
import { Hono, type Context, type Next } from 'hono';
import { requireUser } from '../../auth/middleware.js';
import { userRateLimit } from '../../lib/user-rate-limit.js';
import { zValidator } from '../../lib/validator.js';
import type { AppEnv } from '../../types.js';
import * as service from './service.js';

const PUBLIC_MEETUP_DAILY_LIMIT = 10;

export interface EventRoutesOptions {
  rateLimit: boolean;
}

/** Only counts against the daily quota when the validated body is a `public` meetup — must run
 * after `zValidator('json', meetupCreateSchema)` so `c.req.valid('json')` is available. */
function publicMeetupRateLimit(enabled: boolean) {
  const limiter = userRateLimit({ limit: PUBLIC_MEETUP_DAILY_LIMIT, enabled });
  return (c: Context<AppEnv>, next: Next) => {
    const body = c.req.valid('json' as never) as { visibility?: string };
    if (body.visibility !== 'public') return next();
    return limiter(c, next);
  };
}

export const eventRoutes = ({ rateLimit }: EventRoutesOptions) =>
  new Hono<AppEnv>()
    .get('/calendar', zValidator('query', meetupCalendarQuerySchema), async (c) => {
      const viewerId = c.var.user?.id ?? null;
      return c.json(await service.getCalendarService(viewerId, c.req.valid('query').month));
    })
    .get('/', zValidator('query', meetupFilterSchema), async (c) => {
      const viewerId = c.var.user?.id ?? null;
      return c.json(await service.listMeetupsService(viewerId, c.req.valid('query')));
    })
    .post(
      '/',
      requireUser,
      zValidator('json', meetupCreateSchema),
      publicMeetupRateLimit(rateLimit),
      async (c) => {
        const result = await service.createMeetupService(c.var.user.id, c.req.valid('json'));
        return c.json(result, 201);
      },
    )
    .get(
      '/:slug',
      zValidator('param', meetupSlugParamSchema),
      zValidator('query', meetupDetailQuerySchema),
      async (c) => {
        const viewerId = c.var.user?.id ?? null;
        const { slug } = c.req.valid('param');
        const { code } = c.req.valid('query');
        const result = await service.getMeetupBySlugService(slug, viewerId, code);
        if (result.visibility !== 'public' || code) {
          c.header('Cache-Control', 'private, no-store');
        }
        return c.json(result);
      },
    )
    .patch(
      '/:id',
      requireUser,
      zValidator('param', idParamSchema),
      zValidator('json', meetupUpdateSchema),
      async (c) => {
        const result = await service.updateMeetupService(
          c.req.valid('param').id,
          c.var.user.id,
          c.req.valid('json'),
        );
        return c.json(result);
      },
    )
    .delete('/:id', requireUser, zValidator('param', idParamSchema), async (c) => {
      await service.cancelMeetupService(c.req.valid('param').id, c.var.user.id);
      return c.body(null, 204);
    })
    .post(
      '/:id/invite',
      requireUser,
      zValidator('param', idParamSchema),
      zValidator('json', meetupInviteFriendsSchema),
      async (c) => {
        await service.inviteFriendsService(
          c.req.valid('param').id,
          c.var.user.id,
          c.req.valid('json'),
        );
        return c.body(null, 204);
      },
    )
    .post('/:id/invite-code/rotate', requireUser, zValidator('param', idParamSchema), async (c) => {
      return c.json(await service.rotateInviteCodeService(c.req.valid('param').id, c.var.user.id));
    })
    .post(
      '/:id/rsvp',
      requireUser,
      zValidator('param', idParamSchema),
      zValidator('json', rsvpInputSchema),
      async (c) => {
        const result = await service.rsvpService(
          c.req.valid('param').id,
          c.var.user.id,
          c.req.valid('json'),
        );
        return c.json(result);
      },
    )
    .post(
      '/:id/tables',
      requireUser,
      zValidator('param', idParamSchema),
      zValidator('json', meetupTableCreateSchema),
      async (c) => {
        const result = await service.createTableService(
          c.req.valid('param').id,
          c.var.user.id,
          c.req.valid('json'),
        );
        return c.json(result, 201);
      },
    )
    .patch(
      '/:id/tables/:tableId',
      requireUser,
      zValidator('param', meetupIdAndTableIdParamSchema),
      zValidator('json', meetupTableUpdateSchema),
      async (c) => {
        const { id, tableId } = c.req.valid('param');
        const result = await service.updateTableService(
          id,
          tableId,
          c.var.user.id,
          c.req.valid('json'),
        );
        return c.json(result);
      },
    )
    .delete(
      '/:id/tables/:tableId',
      requireUser,
      zValidator('param', meetupIdAndTableIdParamSchema),
      async (c) => {
        const { id, tableId } = c.req.valid('param');
        await service.deleteTableService(id, tableId, c.var.user.id);
        return c.body(null, 204);
      },
    )
    .post(
      '/:id/tables/:tableId/seat',
      requireUser,
      zValidator('param', meetupIdAndTableIdParamSchema),
      async (c) => {
        const { id, tableId } = c.req.valid('param');
        await service.seatAtTableService(id, tableId, c.var.user.id);
        return c.body(null, 204);
      },
    )
    .delete(
      '/:id/tables/:tableId/seat',
      requireUser,
      zValidator('param', meetupIdAndTableIdParamSchema),
      async (c) => {
        const { id, tableId } = c.req.valid('param');
        await service.leaveTableService(id, tableId, c.var.user.id);
        return c.body(null, 204);
      },
    );

export const meEventsRoutes = new Hono<AppEnv>().get('/', requireUser, async (c) => {
  return c.json(await service.getMyEventsService(c.var.user.id));
});
