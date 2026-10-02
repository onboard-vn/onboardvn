import {
  gameIdParamSchema,
  idParamSchema,
  myPlaysQuerySchema,
  playCreateSchema,
  playGetQuerySchema,
  playPatchSchema,
  playPresenceSchema,
  playValuesPatchSchema,
  tableIdParamSchema,
} from '@onboard/shared';
import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';
import { z } from 'zod';
import { requireUser } from '../../auth/middleware.js';
import { userRateLimit } from '../../lib/user-rate-limit.js';
import { zValidator } from '../../lib/validator.js';
import type { AppEnv } from '../../types.js';
import * as service from './service.js';

const HEARTBEAT_MS = 25_000;
const HOUR_MS = 60 * 60 * 1000;
const templateQuerySchema = z.object({ variant: z.string().trim().min(1).max(60).optional() });

const noStore = (c: { header: (k: string, v: string) => void }) =>
  c.header('Cache-Control', 'private, no-store');

export const playRoutes = ({ rateLimit }: { rateLimit: boolean }) =>
  new Hono<AppEnv>()
    .post(
      '/',
      requireUser,
      zValidator('json', playCreateSchema),
      userRateLimit({ limit: 300, windowMs: HOUR_MS, enabled: rateLimit }),
      async (c) => c.json(await service.createPlayService(c.var.user.id, c.req.valid('json')), 201),
    )
    .get(
      '/:id',
      requireUser,
      zValidator('param', idParamSchema),
      zValidator('query', playGetQuerySchema),
      async (c) => {
        noStore(c);
        const { id } = c.req.valid('param');
        const { sinceRev } = c.req.valid('query');
        return c.json(
          sinceRev === undefined
            ? await service.getPlayService(id, c.var.user.id)
            : await service.pollPlayService(id, c.var.user.id, sinceRev),
        );
      },
    )
    .patch(
      '/:id',
      requireUser,
      zValidator('param', idParamSchema),
      zValidator('json', playPatchSchema),
      async (c) =>
        c.json(
          await service.patchPlayService(
            c.req.valid('param').id,
            c.var.user.id,
            c.req.valid('json'),
          ),
        ),
    )
    .patch(
      '/:id/values',
      requireUser,
      zValidator('param', idParamSchema),
      zValidator('json', playValuesPatchSchema),
      async (c) =>
        c.json(
          await service.patchValuesService(
            c.req.valid('param').id,
            c.var.user.id,
            c.req.valid('json').ops,
          ),
        ),
    )
    .post('/:id/finalize', requireUser, zValidator('param', idParamSchema), async (c) =>
      c.json(await service.finalizePlayService(c.req.valid('param').id, c.var.user.id)),
    )
    .post(
      '/:id/presence',
      requireUser,
      zValidator('param', idParamSchema),
      zValidator('json', playPresenceSchema),
      async (c) =>
        c.json(
          await service.presenceService(
            c.req.valid('param').id,
            c.var.user.id,
            c.req.valid('json'),
          ),
        ),
    )
    .get('/:id/stream', requireUser, zValidator('param', idParamSchema), async (c) => {
      const stream = await service.openStreamService(c.req.valid('param').id, c.var.user.id);
      c.header('Cache-Control', 'private, no-store');
      c.header('X-Accel-Buffering', 'no');
      return streamSSE(c, async (sse) => {
        const queue: string[] = [];
        let wake: (() => void) | null = null;
        const unsubscribe = stream.subscribe((event) => {
          queue.push(JSON.stringify(event));
          wake?.();
        });
        let open = true;
        sse.onAbort(() => {
          open = false;
          unsubscribe();
          wake?.();
        });
        await sse.writeSSE({ event: 'play', data: JSON.stringify(stream.initial) });
        while (open) {
          const next = queue.shift();
          if (next !== undefined) {
            await sse.writeSSE({ event: 'play', data: next });
            continue;
          }
          await new Promise<void>((resolve) => {
            wake = resolve;
            setTimeout(resolve, HEARTBEAT_MS);
          });
          wake = null;
          if (open && queue.length === 0) await sse.writeSSE({ event: 'ping', data: '' });
        }
        unsubscribe();
      });
    });

export const tablePlayRoutes = new Hono<AppEnv>()
  .get('/:tableId/play', requireUser, zValidator('param', tableIdParamSchema), async (c) => {
    noStore(c);
    return c.json(await service.getTablePlayService(c.req.valid('param').tableId, c.var.user.id));
  })
  .post(
    '/:tableId/plays',
    requireUser,
    zValidator('param', tableIdParamSchema),
    zValidator('json', playCreateSchema.omit({ meetupTableId: true })),
    async (c) =>
      c.json(
        await service.createPlayService(c.var.user.id, {
          ...c.req.valid('json'),
          meetupTableId: c.req.valid('param').tableId,
        }),
        201,
      ),
  );

export const myPlayRoutes = new Hono<AppEnv>().get(
  '/plays',
  requireUser,
  zValidator('query', myPlaysQuerySchema),
  async (c) => {
    noStore(c);
    const { cursor, limit } = c.req.valid('query');
    return c.json(await service.listMyPlaysService(c.var.user.id, cursor, limit));
  },
);

export const gameScoreTemplateRoutes = new Hono<AppEnv>().get(
  '/:gameId/score-template',
  requireUser,
  zValidator('param', gameIdParamSchema),
  zValidator('query', templateQuerySchema),
  async (c) => {
    noStore(c);
    return c.json(
      await service.getScoreTemplateService(
        c.req.valid('param').gameId,
        c.req.valid('query').variant,
      ),
    );
  },
);
