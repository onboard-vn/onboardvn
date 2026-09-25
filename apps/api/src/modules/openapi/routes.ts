import { Hono } from 'hono';
import { env } from '../../lib/env.js';
import type { AppEnv } from '../../types.js';
import { buildOpenApiDocument } from './document.js';

export const openApiRoutes = new Hono<AppEnv>().get('/', (c) => {
  return c.json(buildOpenApiDocument(env.WEB_ORIGIN));
});
