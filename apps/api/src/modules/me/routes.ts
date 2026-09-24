import { Hono } from 'hono';
import { requireUser } from '../../auth/middleware.js';
import type { AppEnv } from '../../types.js';

export const meRoutes = new Hono<AppEnv>().get('/', requireUser, (c) => {
  const { id, name, email, image, role } = c.var.user;
  return c.json({ user: { id, name, email, image, role } });
});
