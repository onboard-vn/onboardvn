import type { ProvinceListResponse, WardListResponse } from '@onboard/shared';
import { Hono } from 'hono';
import type { AppEnv } from '../../types.js';
import { listProvincesService, listWardsService } from './service.js';

export const locationRoutes = new Hono<AppEnv>()
  .get('/provinces', async (c) => {
    const items = await listProvincesService();
    return c.json<ProvinceListResponse>({ items });
  })
  .get('/provinces/:code/wards', async (c) => {
    const items = await listWardsService(c.req.param('code'));
    return c.json<WardListResponse>({ items });
  });
