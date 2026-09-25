import { serveStatic } from '@hono/node-server/serve-static';
import type { HealthResponse } from '@onboard/shared';
import { Hono } from 'hono';
import { csrf } from 'hono/csrf';
import { requestId } from 'hono/request-id';
import type { Auth } from './auth/better-auth.js';
import { sessionMiddleware } from './auth/middleware.js';
import { publicCache } from './lib/cache-control.js';
import { env } from './lib/env.js';
import { errorHandler, notFoundHandler } from './lib/error-handler.js';
import { apiRateLimit } from './lib/rate-limit.js';
import { UPLOADS_PUBLIC_PREFIX } from './lib/storage/index.js';
import { barcodeRoutes } from './modules/barcodes/routes.js';
import {
  createBarcodeProviderFromEnv,
  type BarcodeProvider,
} from './modules/barcodes/gameupc-client.js';
import { cafeOwnerRoutes } from './modules/cafe-owners/routes.js';
import { cafeRoutes } from './modules/cafes/routes.js';
import { categoryRoutes } from './modules/categories/routes.js';
import { blockRoutes, friendRoutes } from './modules/friends/routes.js';
import { gameRoutes } from './modules/games/routes.js';
import { locationRoutes } from './modules/locations/routes.js';
import { meRoutes } from './modules/me/routes.js';
import { localBarcodeRoutes, shelfRoutes } from './modules/shelf/routes.js';
import { userRoutes } from './modules/users/routes.js';
import { openApiRoutes } from './modules/openapi/routes.js';
import type { AppEnv } from './types.js';

export interface AppDeps {
  auth: Pick<Auth, 'api' | 'handler'>;
  rateLimit?: boolean;
  barcodeProvider?: BarcodeProvider;
}

export function createApp({
  auth,
  rateLimit = true,
  barcodeProvider = createBarcodeProviderFromEnv(),
}: AppDeps) {
  const api = new Hono<AppEnv>()
    .use(sessionMiddleware(auth))
    .use('*', publicCache())
    .route('/me', meRoutes)
    .route('/me/shelf', shelfRoutes)
    .route('/users', userRoutes)
    .route('/friends', friendRoutes({ rateLimit }))
    .route('/blocks', blockRoutes)
    .route('/games', gameRoutes)
    .route('/categories', categoryRoutes)
    .route('/locations', locationRoutes)
    .route('/cafes', cafeRoutes)
    .route('/', cafeOwnerRoutes({ rateLimit }))
    .route('/barcodes', barcodeRoutes(barcodeProvider))
    .route('/barcodes/local', localBarcodeRoutes)
    .route('/openapi.json', openApiRoutes);

  // Mounted before rate limit + session: images are public and requested in bulk per page.
  const app = new Hono<AppEnv>()
    .use(requestId())
    .get('/health', (c) => c.json<HealthResponse>({ status: 'ok' }))
    .use(`${UPLOADS_PUBLIC_PREFIX}/*`, async (c, next) => {
      await next();
      if (c.res.ok) {
        c.res.headers.set('X-Content-Type-Options', 'nosniff');
        c.res.headers.set('Cache-Control', 'public, max-age=86400');
      }
    })
    .use(
      `${UPLOADS_PUBLIC_PREFIX}/*`,
      serveStatic({
        root: env.UPLOADS_DIR,
        rewriteRequestPath: (path) => path.slice(UPLOADS_PUBLIC_PREFIX.length),
      }),
    );

  if (rateLimit) app.use('/api/*', apiRateLimit);

  const csrfMiddleware = csrf({ origin: env.WEB_ORIGIN });
  app.use('/api/*', async (c, next) => {
    // Better Auth validates its own routes' origin; skip so it isn't double-checked.
    if (c.req.path.startsWith('/api/auth/')) return next();
    return csrfMiddleware(c, next);
  });

  app.on(['GET', 'POST'], '/api/auth/*', (c) => auth.handler(c.req.raw));

  const routed = app.route('/api', api);
  routed.onError(errorHandler);
  routed.notFound(notFoundHandler);
  return routed;
}

export type AppType = ReturnType<typeof createApp>;
