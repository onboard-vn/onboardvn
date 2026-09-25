import { APIError, createAuthMiddleware, getSessionFromCtx } from 'better-auth/api';
import { eq, sql } from 'drizzle-orm';
import { db } from '../db/client.js';
import { users } from '../db/schema/index.js';

const GUARDED_PATHS = new Set(['/sign-up/email', '/update-user']);
const MAX_NAME_LENGTH = 100;

const reject = (code: string, message: string) => {
  throw APIError.from('BAD_REQUEST', { code, message });
};

/**
 * Profile rules Better Auth doesn't enforce on sign-up/update-user: display handle must match the
 * username, BGG username unique case-insensitively (400 instead of a constraint 500), bounded name,
 * and no self-set avatar URL (public profiles would load arbitrary third-party images).
 */
export const profileGuard = createAuthMiddleware(async (ctx) => {
  if (!GUARDED_PATHS.has(ctx.path)) return;
  const body = (ctx.body ?? {}) as Record<string, unknown>;
  const session = ctx.path === '/update-user' ? await getSessionFromCtx(ctx) : null;

  if (typeof body.name === 'string' && !body.name.trim()) {
    reject('INVALID_NAME', 'Tên hiển thị không được để trống');
  }
  if (typeof body.name === 'string' && body.name.length > MAX_NAME_LENGTH) {
    reject('INVALID_NAME', `Tên hiển thị tối đa ${MAX_NAME_LENGTH} ký tự`);
  }
  if (ctx.path === '/update-user' && body.image !== undefined) {
    reject('IMAGE_NOT_ALLOWED', 'Chưa hỗ trợ đổi ảnh đại diện');
  }

  if (typeof body.displayUsername === 'string') {
    const username =
      typeof body.username === 'string' ? body.username : (session?.user.username ?? '');
    if (body.displayUsername.toLowerCase() !== username.toLowerCase()) {
      reject(
        'INVALID_DISPLAY_USERNAME',
        'Tên hiển thị phải trùng tên đăng nhập (chỉ khác hoa/thường)',
      );
    }
  }

  const bgg = typeof body.bggUsername === 'string' ? body.bggUsername.trim() : '';
  if (bgg) {
    const [owner] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(sql`lower(${users.bggUsername})`, bgg.toLowerCase()))
      .limit(1);
    if (owner && session?.user.id !== owner.id) {
      reject('BGG_USERNAME_IS_ALREADY_TAKEN', 'Username BGG đã được liên kết với tài khoản khác');
    }
  }
});
