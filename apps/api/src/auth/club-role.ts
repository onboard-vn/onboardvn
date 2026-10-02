import { idParamSchema, type ClubRole } from '@onboard/shared';
import { and, eq } from 'drizzle-orm';
import { createMiddleware } from 'hono/factory';
import { db } from '../db/client.js';
import { clubMembers } from '../db/schema/index.js';
import { ApiError } from '../lib/errors.js';
import type { AppEnv, SessionUser } from '../types.js';

export type ClubRoleEnv = AppEnv & {
  Variables: AppEnv['Variables'] & { user: SessionUser; clubRole: ClubRole };
};

/** Membership in the `:id` club with one of `roles`. Global staff get no implicit access. */
export const requireClubRole = (...roles: ClubRole[]) =>
  createMiddleware<ClubRoleEnv>(async (c, next) => {
    const user = c.get('user');
    if (!user) throw new ApiError('UNAUTHENTICATED', 401, 'Bạn cần đăng nhập');

    const clubId = c.req.param('id');
    if (!clubId || !idParamSchema.safeParse({ id: clubId }).success) {
      throw new ApiError('VALIDATION_FAILED', 422, 'Dữ liệu không hợp lệ');
    }

    const [member] = await db
      .select({ role: clubMembers.role })
      .from(clubMembers)
      .where(and(eq(clubMembers.clubId, clubId), eq(clubMembers.userId, user.id)))
      .limit(1);
    if (!member || !roles.includes(member.role)) {
      throw new ApiError('FORBIDDEN', 403, 'Bạn không có quyền thực hiện thao tác này');
    }

    c.set('clubRole', member.role);
    await next();
  });
