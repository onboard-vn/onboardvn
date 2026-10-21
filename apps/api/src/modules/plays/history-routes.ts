import { idParamSchema, myPlaysQuerySchema } from '@onboard/shared';
import { Hono } from 'hono';
import { requireClubMemberOr404 } from '../clubs/member-guard.js';
import { zValidator } from '../../lib/validator.js';
import type { AppEnv } from '../../types.js';
import { listClubPlaysService } from './history.js';

const noStore = (c: { header: (key: string, value: string) => void }) =>
  c.header('Cache-Control', 'private, no-store');

export const clubPlayHistoryRoutes = new Hono<AppEnv>().get(
  '/:id/plays',
  zValidator('param', idParamSchema),
  async (c, next) => {
    noStore(c);
    await requireClubMemberOr404(c.req.param('id'), c.var.user?.id);
    await next();
  },
  zValidator('query', myPlaysQuerySchema),
  async (c) => {
    const { cursor, limit } = c.req.valid('query');
    return c.json(
      await listClubPlaysService(c.req.valid('param').id, c.var.user!.id, cursor, limit),
    );
  },
);
