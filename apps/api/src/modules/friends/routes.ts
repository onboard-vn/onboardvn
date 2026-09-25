import {
  blockCreateSchema,
  fromUserIdParamSchema,
  friendRequestListQuerySchema,
  inviteCodeParamSchema,
  sendFriendRequestSchema,
  toUserIdParamSchema,
  userIdParamSchema,
} from '@onboard/shared';
import { Hono } from 'hono';
import { requireUser } from '../../auth/middleware.js';
import { userRateLimit } from '../../lib/user-rate-limit.js';
import { zValidator } from '../../lib/validator.js';
import type { AppEnv } from '../../types.js';
import * as service from './service.js';

const SEND_REQUEST_DAILY_LIMIT = 20;

export interface FriendRoutesOptions {
  rateLimit: boolean;
}

export const friendRoutes = ({ rateLimit }: FriendRoutesOptions) =>
  new Hono<AppEnv>()
    .get('/invite/:code', zValidator('param', inviteCodeParamSchema), async (c) => {
      return c.json(await service.previewInviteService(c.req.valid('param').code));
    })
    .post('/invite/:code', requireUser, zValidator('param', inviteCodeParamSchema), async (c) => {
      return c.json(await service.confirmInviteService(c.var.user.id, c.req.valid('param').code));
    })
    .post(
      '/requests',
      requireUser,
      userRateLimit({ limit: SEND_REQUEST_DAILY_LIMIT, enabled: rateLimit }),
      zValidator('json', sendFriendRequestSchema),
      async (c) => {
        const result = await service.sendFriendRequestService(
          c.var.user.id,
          c.req.valid('json').username,
        );
        return c.json(result, 201);
      },
    )
    .get('/requests/count', requireUser, async (c) => {
      return c.json({ count: await service.countIncomingRequestsService(c.var.user.id) });
    })
    .get('/requests', requireUser, zValidator('query', friendRequestListQuerySchema), async (c) => {
      const items = await service.listFriendRequestsService(
        c.var.user.id,
        c.req.valid('query').dir,
      );
      return c.json({ items });
    })
    .post(
      '/requests/:fromUserId/accept',
      requireUser,
      zValidator('param', fromUserIdParamSchema),
      async (c) => {
        await service.acceptFriendRequestService(c.var.user.id, c.req.valid('param').fromUserId);
        return c.body(null, 204);
      },
    )
    .post(
      '/requests/:fromUserId/decline',
      requireUser,
      zValidator('param', fromUserIdParamSchema),
      async (c) => {
        await service.declineFriendRequestService(c.var.user.id, c.req.valid('param').fromUserId);
        return c.body(null, 204);
      },
    )
    .delete(
      '/requests/:toUserId',
      requireUser,
      zValidator('param', toUserIdParamSchema),
      async (c) => {
        await service.cancelFriendRequestService(c.var.user.id, c.req.valid('param').toUserId);
        return c.body(null, 204);
      },
    )
    .get('/', requireUser, async (c) => {
      return c.json({ items: await service.listFriendsService(c.var.user.id) });
    })
    .delete('/:userId', requireUser, zValidator('param', userIdParamSchema), async (c) => {
      await service.unfriendService(c.var.user.id, c.req.valid('param').userId);
      return c.body(null, 204);
    });

export const blockRoutes = new Hono<AppEnv>()
  .get('/', requireUser, async (c) => {
    return c.json({ items: await service.listBlocksService(c.var.user.id) });
  })
  .post('/', requireUser, zValidator('json', blockCreateSchema), async (c) => {
    await service.blockUserService(c.var.user.id, c.req.valid('json').userId);
    return c.body(null, 204);
  })
  .delete('/:userId', requireUser, zValidator('param', userIdParamSchema), async (c) => {
    await service.unblockUserService(c.var.user.id, c.req.valid('param').userId);
    return c.body(null, 204);
  });
