import { isRole, type Role } from '@onboard/shared';
import { createMiddleware } from 'hono/factory';
import { ApiError } from '../lib/errors.js';
import type { AppEnv, SessionUser } from '../types.js';
import type { Auth } from './better-auth.js';

export const sessionMiddleware = (auth: Pick<Auth, 'api'>) =>
  createMiddleware<AppEnv>(async (c, next) => {
    const result = await auth.api.getSession({ headers: c.req.raw.headers });
    c.set('user', result?.user ?? null);
    c.set('session', result?.session ?? null);
    await next();
  });

export const requireUser = createMiddleware<AppEnv & { Variables: { user: SessionUser } }>(
  async (c, next) => {
    if (!c.get('user')) throw new ApiError('UNAUTHENTICATED', 401, 'Bạn cần đăng nhập');
    await next();
  },
);

export const requireRole = (...roles: Role[]) =>
  createMiddleware<AppEnv & { Variables: { user: SessionUser } }>(async (c, next) => {
    const user = c.get('user');
    if (!user) throw new ApiError('UNAUTHENTICATED', 401, 'Bạn cần đăng nhập');
    if (!isRole(user.role) || !roles.includes(user.role)) {
      throw new ApiError('FORBIDDEN', 403, 'Bạn không có quyền thực hiện thao tác này');
    }
    await next();
  });
