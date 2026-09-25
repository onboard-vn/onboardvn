# P1c Phase 1 — Bạn bè (QR + lời mời) + riêng tư — Implementation Report

Status: COMPLETED, all verification green.

## Files (new)
- packages/shared/src/social.ts — zod schemas/types (privacyLevel, FriendSummary+id, FriendRequestDto, privacyUpdate, blocks, invite params)
- apps/api/src/db/schema/social.ts — friendships (PK userA/userB, CHECK userA<userB, idx userB), friend_requests (PK from/to, idx to+status), user_blocks (PK blocker/blocked)
- apps/api/drizzle/0009_social_friends.sql + meta — users +friendCode/profileVisibility/playsVisibility/friendsVisibility/emailOnFriendRequest; friendCode has a volatile DB default (`substr(replace(gen_random_uuid()::text,'-',''),1,16)`) so `ADD COLUMN ... NOT NULL` backfills existing rows in one statement (no separate UPDATE needed)
- apps/api/src/lib/visibility.ts (+test) — canView (admin does NOT bypass), loadViewerRelation, areFriends, isBlocked, orderPair
- apps/api/src/lib/user-rate-limit.ts — per-user hono-rate-limiter, `enabled` flag wired to `createApp({rateLimit})`
- apps/api/src/modules/friends/{repo,service,routes,friends.test}.ts — invite/requests/friends/blocks/privacy business logic + 10 tests (real Better Auth sign-ups)
- Web: components/friend-qr.tsx, friend-button.tsx, friend-request-badge.tsx; app/ket-ban/[code]/{page,confirm-invite-button}.tsx; app/ban-be/{page,ban-be-tabs}.tsx; app/tai-khoan/privacy-settings.tsx; lib/safe-next.ts; e2e/friends.spec.ts

## Files (modified)
- apps/api/src/auth/better-auth.ts — friendCode/privacy additionalFields (input:false) + `databaseHooks.user.create.before` sets a 16-char base64url friendCode
- apps/api/src/{app.ts, db/schema/index.ts, modules/me/routes.ts, modules/users/routes.ts, modules/openapi/document.ts, lib/mailer/*, test/fake-auth.ts}
- apps/web/{components/barcode-scanner.tsx (optional `formats` prop), components/site-header.tsx (Bạn bè link+badge), app/(auth)/login/* (`next` param), app/tai-khoan/page.tsx, app/u/[username]/page.tsx, lib/api-server.ts}
- apps/web/playwright.config.ts — API webServer now sets `NODE_ENV=test` (see Deviations)
- apps/web/package.json — added `qrcode` + `@types/qrcode`

## Key decisions
- FriendSummary DTOs include `id` (needed for unfriend/unblock/accept actions) but never `email`/`addedBy`.
- Auto-accept-on-cross-request and invite-confirm run inside `db.transaction`.
- Friend-code default lives in Postgres (not just the app hook) so seed/test fixtures inserting `users` rows directly don't need updating.
- `friendCode`/privacy/`emailOnFriendRequest` are `input:false` additionalFields — never settable via `update-user`.

## Deviations from spec
- Migration needed no manual backfill UPDATE: drizzle-kit's generated `ADD COLUMN ... DEFAULT <volatile-expr> NOT NULL` already rewrites+backfills existing rows in Postgres.
- `playwright.config.ts`: set `NODE_ENV=test` for the API webServer only. The new friends e2e signs in 4 accounts back-to-back; combined with the existing password-auth spec this exceeded Better Auth's own IP-keyed sign-in rate limit (5/60s, only disabled when `NODE_ENV==='test'`), causing an intermittent full-suite failure unrelated to app logic. Scoped to the API process only (not the Next dev server) to avoid side effects.
- `FriendSummary.username` is nullable (matches the underlying `users.username` column, which is nullable pre-P1b-3 legacy rows).

## Commands + results
- `pnpm test` (turbo, all 4 packages): 21 API test files/117 tests, web 6/21, shared 0 — all pass.
- `pnpm lint`, `pnpm typecheck`, `pnpm run format:check` (repo root): clean.
- `pnpm --filter @onboard/web build`: succeeds, `/ban-be` and `/ket-ban/[code]` render as dynamic routes.
- `cd apps/web && pnpm exec playwright test` (headless, all 3 specs incl. new friends.spec.ts): 3 passed. Ports 8787/3100 verified free before and after.
- Dev DB: backed up to `.../scratchpad/onboard-dev-pre-0009.dump`, then migrated with the given `tsx src/db/migrate.ts` invocation — `migrations applied`.

## Risks / follow-ups
- `findRequest`'s declined-cooldown check only re-checks on the next send; no scheduled cleanup of old declined rows (acceptable — bounded by unique PK, not unbounded growth beyond one row per ordered pair).
- Friend-button on `/u/[username]` does 3 client-side GETs (friends/in/out) to derive relationship state — no dedicated "status" endpoint per spec's exact API list; acceptable at this scale, flagged for future phases doing similar lookups.

No unresolved questions.
