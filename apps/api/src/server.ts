import { serve } from '@hono/node-server';
import { createApp } from './app.js';
import { auth } from './auth/better-auth.js';
import { env } from './lib/env.js';
import { logger } from './lib/logger.js';

const app = createApp({ auth, rateLimit: env.NODE_ENV === 'production' });

serve({ fetch: app.fetch, port: env.PORT }, (info) => {
  logger.info(`api listening on http://localhost:${info.port}`);
});
