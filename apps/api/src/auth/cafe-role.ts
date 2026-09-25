import { idParamSchema, type CafeMemberRole } from '@onboard/shared';
import { and, eq } from 'drizzle-orm';
import { createMiddleware } from 'hono/factory';
import { db } from '../db/client.js';
import { cafeMembers } from '../db/schema/index.js';
import { ApiError } from '../lib/errors.js';
import type { AppEnv, SessionUser } from '../types.js';

export type CafeRoleEnv = AppEnv & {
  Variables: AppEnv['Variables'] & {
    user: SessionUser;
    /** null when the actor is global staff (maintainer/admin), not a café member. */
    cafeMemberRole: CafeMemberRole | null;
  };
};

/**
 * Global maintainer/admin pass through untouched (same access as before this phase). Anyone
 * else must be a `cafe_members` row for the `:id` route param with one of the allowed roles.
 */
export const requireCafeRole = (...roles: CafeMemberRole[]) =>
  createMiddleware<CafeRoleEnv>(async (c, next) => {
    const user = c.get('user');
    if (!user) throw new ApiError('UNAUTHENTICATED', 401, 'Bạn cần đăng nhập');

    if (user.role === 'maintainer' || user.role === 'admin') {
      c.set('cafeMemberRole', null);
      await next();
      return;
    }

    const cafeId = c.req.param('id');
    if (!cafeId) throw new ApiError('FORBIDDEN', 403, 'Bạn không có quyền thực hiện thao tác này');
    // Validate before the query: a malformed id is invalid input, not a Postgres 22P02 crash.
    if (!idParamSchema.safeParse({ id: cafeId }).success) {
      throw new ApiError('VALIDATION_FAILED', 422, 'Dữ liệu không hợp lệ');
    }

    const [member] = await db
      .select({ role: cafeMembers.role })
      .from(cafeMembers)
      .where(and(eq(cafeMembers.cafeId, cafeId), eq(cafeMembers.userId, user.id)))
      .limit(1);

    if (!member || !roles.includes(member.role as CafeMemberRole)) {
      throw new ApiError('FORBIDDEN', 403, 'Bạn không có quyền thực hiện thao tác này');
    }

    c.set('cafeMemberRole', member.role as CafeMemberRole);
    await next();
  });
