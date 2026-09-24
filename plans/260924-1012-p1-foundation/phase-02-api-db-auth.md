---
phase: 2
title: "API, DB, auth foundation"
status: completed
priority: P1
effort: "4d"
dependencies: [1]
---

# Phase 2: API, DB, auth foundation

## Overview
Hono API với Drizzle/Postgres, Better Auth (Google + email OTP), phân quyền `user | maintainer | admin`, typed client cho web.

## Requirements
- Functional: đăng nhập/đăng xuất, session cookie; middleware `requireRole`; web hiển thị user hiện tại.
- Non-functional: lỗi JSON thống nhất `{ error: { code, message, details? } }`; rate limit cơ bản; migration có version.

## Architecture
```
apps/api/src
├── index.ts            app + route mount, export type AppType
├── db/ schema/*.ts  client.ts  migrations/
├── auth/ better-auth.ts  middleware.ts (requireUser, requireRole)
├── lib/ errors.ts  env.ts (zod-validated env)
└── modules/<feature>/ routes.ts  service.ts  repo.ts
```
Module = routes (HTTP, zod validator) → service (nghiệp vụ) → repo (Drizzle). Service test không cần HTTP.

```ts
// apps/api/src/auth/middleware.ts
export const requireRole = (...roles: Role[]) =>
  createMiddleware<AppEnv>(async (c, next) => {
    const user = c.get('user');
    if (!user) throw new ApiError('UNAUTHENTICATED', 401);
    if (!roles.includes(user.role)) throw new ApiError('FORBIDDEN', 403);
    await next();
  });
```

## Related Code Files
- Create: các file trên; `packages/shared/src/roles.ts`; `apps/web/lib/api.ts` (`hc<AppType>`), `apps/web/app/(auth)/*`.

## Implementation Steps
1. `env.ts` parse env bằng zod, fail-fast.
2. Drizzle + drizzle-kit; bảng auth của Better Auth + cột `role`.
3. Better Auth: Google OAuth, email OTP (dev dùng console transport).
4. Error handler + request id + logger (pino).
5. Web: trang đăng nhập, header hiện avatar/role; seed 1 admin qua script `pnpm db:seed`.
6. Test: vitest cho middleware role + auth flow (Postgres test container hoặc DB riêng).

## Success Criteria
- [ ] Đăng nhập Google trên web, `GET /me` trả user + role.
- [ ] Route maintainer trả 403 với user thường (có test).
- [ ] `pnpm db:migrate` chạy sạch trên DB rỗng.

## Risk Assessment
- Better Auth + Expo sau này: có plugin Expo; nếu không hợp → đổi sang session token header, giữ interface middleware.
- Tài khoản quán **không** tồn tại ở P1 (non-goal) — role enum để mở rộng sau.
