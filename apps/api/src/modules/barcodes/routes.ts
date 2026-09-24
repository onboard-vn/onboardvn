import { linkBarcodeInputSchema } from '@onboard/shared';
import { Hono } from 'hono';
import { requireRole } from '../../auth/middleware.js';
import { zValidator } from '../../lib/validator.js';
import type { AppEnv } from '../../types.js';
import type { BarcodeProvider } from './gameupc-client.js';
import { linkBarcodeService, lookupBarcodeService } from './service.js';

export function barcodeRoutes(barcodeProvider?: BarcodeProvider) {
  return new Hono<AppEnv>()
    .get('/:code', requireRole('maintainer', 'admin'), async (c) => {
      const result = await lookupBarcodeService(c.req.param('code'), { barcodeProvider });
      return c.json(result);
    })
    .post(
      '/:code/link',
      requireRole('maintainer', 'admin'),
      zValidator('json', linkBarcodeInputSchema),
      async (c) => {
        const result = await linkBarcodeService(
          c.req.param('code'),
          c.req.valid('json'),
          c.var.user.id,
          { barcodeProvider },
        );
        return c.json(result, 201);
      },
    );
}
