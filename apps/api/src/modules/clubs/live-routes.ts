import { Hono } from 'hono';
import { createMiddleware } from 'hono/factory';
import type { LiveReader } from '../../integrations/external-club/live-types.js';
import { env } from '../../lib/env.js';
import { userRateLimit } from '../../lib/user-rate-limit.js';
import type { AppEnv } from '../../types.js';
import {
  readClubLiveDayService,
  readClubLiveGamesService,
  readClubLiveHistoryService,
  readClubLiveMembersService,
  requireClubLiveMember,
  validateClubLiveDate,
} from './live-service.js';

const MINUTE_MS = 60 * 1000;
const liveReadRateLimit = userRateLimit({ limit: 30, windowMs: MINUTE_MS });

interface ClubLiveRouteOptions {
  externalBaseUrl?: string | null;
}

const privateNoStore = createMiddleware<AppEnv>(async (c, next) => {
  c.header('Cache-Control', 'private, no-store');
  await next();
});

const requireMember = createMiddleware<AppEnv>(async (c, next) => {
  await requireClubLiveMember(c.req.param('id')!, c.var.user?.id);
  await next();
});

const validateDay = createMiddleware<AppEnv>(async (c, next) => {
  validateClubLiveDate(c.req.param('date')!);
  await next();
});

export function createClubLiveRoutes(
  reader: LiveReader,
  options: ClubLiveRouteOptions = {},
) {
  const externalBaseUrl =
    options.externalBaseUrl === undefined ? env.EXTERNAL_CLUB_BASE_URL : options.externalBaseUrl;

  return new Hono<AppEnv>()
    .use('*', privateNoStore)
    .get(
      '/:id/days/:date',
      requireMember,
      validateDay,
      liveReadRateLimit,
      async (c) =>
        c.json(
          await readClubLiveDayService(
            reader,
            c.req.param('id'),
            c.req.param('date'),
            externalBaseUrl,
          ),
        ),
    )
    .get('/:id/members-live', requireMember, liveReadRateLimit, async (c) =>
      c.json(await readClubLiveMembersService(reader, c.req.param('id'))),
    )
    .get('/:id/games-live', requireMember, liveReadRateLimit, async (c) =>
      c.json(await readClubLiveGamesService(reader, c.req.param('id'))),
    )
    .get('/:id/history-live', requireMember, liveReadRateLimit, async (c) =>
      c.json(await readClubLiveHistoryService(reader, c.req.param('id'))),
    );
}
