import { privacyUpdateSchema } from '@onboard/shared';
import { Hono } from 'hono';
import { requireUser } from '../../auth/middleware.js';
import { countMyMembershipsService } from '../cafe-owners/service.js';
import {
  getFriendCodeService,
  rotateFriendCodeService,
  updatePrivacyService,
} from '../friends/service.js';
import { zValidator } from '../../lib/validator.js';
import type { AppEnv } from '../../types.js';

export const meRoutes = new Hono<AppEnv>()
  .get('/', requireUser, async (c) => {
    const {
      id,
      name,
      email,
      image,
      role,
      username,
      displayUsername,
      bggUsername,
      profileVisibility,
      playsVisibility,
      friendsVisibility,
      emailOnFriendRequest,
      provinceCode,
      clubShelfSuggest,
    } = c.var.user;
    const cafeMembershipCount = await countMyMembershipsService(id);
    return c.json({
      user: {
        id,
        name,
        email,
        image,
        role,
        username: username ?? null,
        displayUsername: displayUsername ?? null,
        bggUsername: bggUsername ?? null,
        profileVisibility,
        playsVisibility,
        friendsVisibility,
        emailOnFriendRequest,
        provinceCode: provinceCode ?? null,
        clubShelfSuggest,
        cafeMembershipCount,
      },
    });
  })
  .get('/friend-code', requireUser, async (c) => {
    return c.json(await getFriendCodeService(c.var.user.id));
  })
  .post('/friend-code/rotate', requireUser, async (c) => {
    return c.json(await rotateFriendCodeService(c.var.user.id));
  })
  .patch('/privacy', requireUser, zValidator('json', privacyUpdateSchema), async (c) => {
    await updatePrivacyService(c.var.user.id, c.req.valid('json'));
    return c.body(null, 204);
  });
