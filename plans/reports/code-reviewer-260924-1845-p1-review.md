# Code Review — Onboard VN P1 (full implementation)

## Scope
- Files: apps/api/src/** (~4.4k LOC incl. tests), apps/web/{app,components,lib}/**, packages/shared/src/**, deploy/**, compose.prod.yml, Dockerfiles, .github/workflows/*, docs/deployment.md, README.md, ../onboard-vn-dataset skeleton.
- Plan: plans/260924-1012-p1-foundation/plan.md + phase-01..07 (incl. Addenda phase-03/05, Session 2).
- Checks run (read-only): `tsc --noEmit` api = 0 errors; `eslint .` api + web = 0 issues; `prettier --check .` = clean. Test suite NOT run (another agent running tests on shared DB).
- Empirical probes (scratch script, fake auth, no DB writes): uploads route, traversal, invalid uuid filter. Read-only SQL probe on dev Postgres for `unaccent_immutable` under empty search_path. `pg_dump -s` inspected.
- Not verified: `apps/web/.env.example` (read denied by permission settings); Tailscale Funnel client-IP forwarding semantics.

## Overall
Structure is clean (routes→service→repo, shared zod, uniform error body, authz on every mutating route). But several defects break P1 features in production while passing CI-style checks: uploaded images are never served, restore from backup silently drops search indexes, rate limiting collapses all users into one bucket behind Caddy/SSR, pending cafes are publicly exposed, and CI cannot run the DB-backed tests.

---

## Critical
None (no auth bypass, no secret/PII leak in public API or dataset found).

## High

H1. Uploaded images always 404 — `apps/api/src/app.ts:45`
`c.req.path` is the full path (`/api/uploads/games/x.png`), regex strips only `^/uploads`, so file is looked up at `${UPLOADS_DIR}/api/uploads/games/x.png` while `LocalStorageDriver.put` writes `${UPLOADS_DIR}/games/x.png` (`lib/storage/local.ts:12`). Probe: file at `up/games/x.png` → 404; file at `up/api/uploads/games/x.png` → 200. No test covers serving.
Fix: `rewriteRequestPath: (p) => p.replace(/^\/api\/uploads/, '')` (or derive from `UPLOADS_PUBLIC_PREFIX`), add a route test that uploads then GETs the returned `imageUrl`.

H2. Backup restore drops trigram search indexes — `apps/api/drizzle/0002_enable_search_extensions.sql:5-8`
`unaccent_immutable` calls unqualified `unaccent('unaccent', $1)`. `pg_dump` output sets `search_path=''` (verified line 15 of `pg_dump -s`); under that path the function fails (verified: `ERROR: function unaccent(unknown, text) does not exist`). `pg_restore` will error on `games_name_*_trgm_idx` creation → restored DB has no search index (phase-7 "restore succeeds" criterion; docs rehearsal at docs/deployment.md:119 would show errors).
Fix: new migration `CREATE OR REPLACE FUNCTION public.unaccent_immutable(text) ... AS $$ SELECT public.unaccent('public.unaccent'::regdictionary, $1) $$ LANGUAGE sql IMMUTABLE PARALLEL SAFE STRICT;` then reindex. Add restore rehearsal with `--exit-on-error` to docs.

H3. Rate limiting collapses to one global bucket in production — `apps/api/src/lib/rate-limit.ts:9-10`, `apps/web/lib/api-server.ts:10`, `deploy/Caddyfile:1-13`, `apps/api/src/auth/better-auth.ts:34`
- SSR calls go web→`http://api:8787` directly with only `cookie`; no XFF/X-Real-IP → every SSR request keys to `'local'`. 300 req/min shared by all page renders (each page does 2-4 API calls) → site-wide 429 at ~100 page views/min.
- Browser traffic: Caddy has no `trusted_proxies`, so it overwrites XFF with the connecting peer = docker-proxy/bridge gateway (tailscaled/cloudflared → 127.0.0.1:8080). All users share one IP for both hono-rate-limiter and Better Auth; email-otp plugin limit is 3/60s per IP (verified in better-auth dist `plugins/email-otp/index.mjs:75-81`) → 3 OTP sends per minute site-wide; one abuser DoSes login for everyone.
- Spoofing (dismissed for prod): API is not published, Caddy discards client XFF; only in-network containers can spoof.
Fix: Caddy `servers { trusted_proxies static private_ranges }` (+ `client_ip_headers CF-Connecting-IP X-Forwarded-For` for cloudflared); API keyGenerator uses the Caddy-set header only; exempt or separately key SSR traffic (e.g. skip limiter when request comes from web container with an internal shared header, or forward client IP from Next via `x-forwarded-for` read from `headers()`). Configure Better Auth `advanced.ipAddress.ipAddressHeaders` consistently.

H4. Pending (no-consent) cafes are fully public — `apps/api/src/modules/cafes/repo.ts:19-24,83-89,215-219`, `service.ts:23-40,59-78,262-276`
Public list/detail/"Nơi chơi" never filter `consentStatus`; `pending` cafes are shown with full details (lat/lng, openingHours, legacyDistrict), i.e. MORE exposure than `public_info_only`. Dataset export excludes pending (`dataset/export.ts:147,181`), so API and dataset disagree. Phase-4 intent: consent gates republishing.
Fix: add `ne(cafes.consentStatus,'pending')` to public queries (keep staff `/manage` and an admin list endpoint unfiltered); add test "pending cafe not in public list/detail/for-game". Admin pages currently use the public list (`app/admin/cafes/page.tsx:13`, `app/admin/scan/page.tsx:11`) → need a staff list route.

H5. CI cannot pass: DB-backed tests with no Postgres — `.github/workflows/ci.yml:26`, `apps/api/src/test/global-setup.ts:4-13`
`pnpm test` runs api tests that connect to `localhost:54329`; CI job has no `services: postgres`. Plan success criterion "CI xanh".
Fix: add `services: postgres: image: postgres:16-alpine, ports: ['54329:5432']`, env user/pass `onboard`, health options; or set `TEST_DATABASE_URL`.

H6. Fresh install/deploy has no schema/seed steps — `README.md:29-35`, `docs/deployment.md:48-57`, root `package.json:9-21`
README quickstart never runs migrations or seeds; root has no `db:migrate`/`db:seed*` scripts. `pnpm dev` → every DB route 500s. Prod: `migrate` service only migrates; provinces/wards never seeded → cafes cannot be created (FK) and filters are empty; `ADMIN_EMAIL` is in `.env.prod` but not passed to any container and seed command undocumented.
Fix: root scripts `db:migrate`, `db:seed`, `db:seed-locations` (filter to api); README steps after `db:up`; migrate service command `sh -c "node dist/db/migrate.js && node dist/db/seed-locations.js"`; document `docker compose run --rm -e ADMIN_EMAIL=... api node dist/db/seed.js`.

H7. Scanner restarts camera on every state change — `apps/web/components/barcode-scanner.tsx:133`, `apps/web/app/admin/scan/scan-session.tsx:238-240`
Effect depends on `onDetect`, which ScanSession recreates each render; each lookup triggers ≥2 renders (loading, result) → cleanup stops tracks and re-runs `getUserMedia`. On phones this means black frames and possible repeated permission prompts (iOS Safari) — defeats "quét 10 hộp liên tiếp".
Fix: store `onDetect` in a ref (`onDetectRef.current = onDetect`) and drop it from deps, or `useCallback` in parent.

## Medium

M1. Invalid UUID input → 500 on public and staff routes. Probe: `GET /api/games?categoryId=abc` → 500. Same for `PATCH/DELETE /games/:id`, `/cafes/:id*`, `gameId` in cafe inventory/bulk/link (`packages/shared/src/games.ts:73`, `cafes.ts:56,68`, `barcodes.ts:5`). Fix: `z.uuid()` in schemas and a uuid param validator; map pg `22P02` to 422 in `lib/error-handler.ts`.

M2. Fields can never be cleared on edit. Update schemas are `.partial()` without `.nullable()` (`shared/src/games.ts:65`, `cafes.ts:44`) and forms map empty → `undefined` (`app/admin/games/game-form.tsx:64-71`, `cafe-form.tsx:78-85`) → service skips. Removing nameVi, bggId, sourceUrl, lat/lng, links, description is impossible. Fix: accept `null` in update schemas for nullable columns; forms send `null` for emptied fields.

M3. `PATCH /cafes/:id` with `{}` likely 500 (drizzle throws "No values to set") — `modules/cafes/repo.ts:146-148`. Games guard this (`games/repo.ts:199-202`); categories do not (`categories/service.ts:40`). Fix: short-circuit when no values.

M4. CSV import can wipe data and half-apply — `apps/api/src/dataset/import.ts:149-198`
- `videoUrls` is always `[]` when column blank/missing (`parseList`), and `categoryIds` always passed → update rows erase existing videos/categories.
- No transaction around apply; a unique violation (bggId, slug) mid-file leaves earlier rows written; conflicts are not pre-validated in dry-run.
- Line numbers = index+2, wrong with multi-line quoted cells or skipped blank lines (plan: "báo đúng dòng"). Use csv-parse `info: true` → `info.lines`.
Fix: only set videoUrls/categories when column present & non-empty; wrap apply in one `db.transaction`; check bggId/slug conflicts in planning phase.

M5. Race/duplicate paths return 500 instead of 409 — check-then-insert without conflict handling: `games/service.ts:275-279` (barcode), `barcodes/service.ts:117-134`, `cafes/service.ts:213-222`, `cafes/repo.ts:197-210` (bulk: concurrent sessions → PK violation aborts whole tx), `findAvailableSlug` (`games/repo.ts:84-92`, `cafes/repo.ts:96-104`). Fix: `onConflictDoNothing()` for bulk; catch `23505` → 409 (helper already exists in `categories/service.ts:10-12` — move to `lib/`).

M6. Upload volume not writable by non-root api — `compose.prod.yml:65`, `apps/api/Dockerfile:28-31`. `/app/apps/api/uploads` does not exist in the image, so the named volume is created root-owned; `apiuser` (1001) gets EACCES. Fix: `RUN mkdir -p /app/apps/api/uploads && chown apiuser:nodejs ...` before `USER`.

M7. No image-upload UI; upload skips revision — API `POST /games/:id/image` (`games/routes.ts:78-85`) has no caller in web; `setGameImageService` writes via `updateGameRow` without a revision (`games/service.ts:314`) though Addendum says every edit stores a revision. Type check is client `file.type` only (no magic bytes); acceptable since staff-only and served with extension-based MIME, but add `X-Content-Type-Options: nosniff` in Caddy.

M8. Dataset licensing deviates from plan/README — `dataset/export.ts:26-41`, dataset README, `CONTRIBUTING.md:16`: `facts/` is CC0, while plan.md, README.md:66 and footer say data is CC BY-SA 4.0. `provinces.csv`/`wards.csv` (MIT upstream) are placed under the CC0 folder; MIT requires notice retention, CC0 cannot be granted for third-party MIT data. This is a user licensing decision — confirm, then align README/footer, or move admin units out of `facts/` with their MIT notice.

M9. Dataset validator is shallow — `dataset/validate.ts:65-98`: only `facts/games.csv` rows validated; cafes rows (e.g. a PR adding `pending` or a `consentNote` value in another column), barcodes checksum, cafe_games referential integrity unchecked; PII check is header-only (so is the export test `export.test.ts:142-170`). Fix: zod row schemas per file, reuse `normalizeBarcode`, reject `consentStatus=pending`.

M10. Email OTP unusable in production — `apps/api/src/auth/otp-mailer.ts:19-22`: console transport only, OTP redacted in prod → users who choose email login can never receive a code. Either disable the emailOTP plugin/UI when `NODE_ENV=production` until SMTP exists, or add SMTP env + transport. Document in deployment.md.

M11. backup.sh safety — `deploy/backup.sh:29-30,46-51`
- Dump redirected straight to final name; on failure `set -e` exits but leaves a truncated/empty `onboard-*.dump` that counts toward rotation — repeated failures rotate out good backups.
- Default umask → dumps (emails, session tokens, IPs) world-readable; `backups/` inside repo is not in `.gitignore`.
Fix: `umask 077`; dump to `$dump_file.tmp`, `pg_restore --list` sanity check, then `mv`; add `backups/` to `.gitignore`; rotate only verified files.

M12. Env contract drift (e) — `lib/env.ts:13-15` defines `UPLOADS_DIR`, `GAMEUPC_BASE_URL`, `GAMEUPC_API_KEY`; missing from `apps/api/.env.example` and docs/deployment.md, and `compose.prod.yml:41-50` does not pass `GAMEUPC_*` (cannot enable provider without editing compose). `API_INTERNAL_URL` is baked into rewrites at `next build` (`next.config.ts:4,11`) — build in CI has no value → rewrites point to localhost inside prod image (harmless only because Caddy routes `/api/*` first; document it). docs/architecture.md:53 lists wrong consent enum (`n/a`, `denied`).

M13. Admin lists truncated at 50, no pagination — `app/admin/cafes/page.tsx:13`, `app/admin/scan/page.tsx:11` (cafe picker), likely `app/admin/games/page.tsx`. Fix: paginate or a staff list endpoint with higher cap/search.

M14. Scan UX gaps — `scan-session.tsx:258-270`: bulk-add failure is silent (no error state); dedupe keyed on raw code, so UPC-A (12) and its EAN-13 form create two entries; lookup fetch fires even for duplicate codes. Fix: use `body.code` (normalized) as key, show bulk error.

## Low
- L1 `findAvailableSlug` with empty base yields `'-2'` on second collision (`games/repo.ts:85-89`, `cafes/repo.ts:97-101`); also duplicated function — move to shared helper taking a `slugExists` fn.
- L2 Search `%${q}%` does not escape `%`/`_` (`games/repo.ts:23`); `q` has no max length (`shared/games.ts:69`).
- L3 `removeBarcodeService` does not normalize `code` (`games/service.ts:283-287`) — deleting by UPC-A 12-digit silently no-ops.
- L4 Partial game update skips min<=max check against stored values (`shared/games.ts:51-65`).
- L5 `sessionMiddleware` hits DB for every `/api/uploads/*` and public GET (`app.ts:34`); enable Better Auth cookieCache or mount uploads before session middleware.
- L6 GameUPC response not validated (`gameupc-client.ts:52-57`); `vote` sends internal user id upstream (`barcodes/service.ts:138`) — privacy note for docs.
- L7 `attachLocalGameFlags` N+1 (2 queries per candidate) (`barcodes/service.ts:67-76`); bounded by candidate count.
- L8 Release pushes `:latest` on every main push without gating on CI (`release.yml:3-5`); GHCR images default private → `pull` on the host needs `docker login` (undocumented).
- L9 CSRF: custom mutating routes rely on Better Auth's explicit `SameSite=Lax` cookie; all mutations are non-GET, JSON routes need CORS preflight (no CORS middleware → blocked), `ts.net` is on the PSL. Real risk low. Defense-in-depth: `hono/csrf` with `origin: env.WEB_ORIGIN` on `/api/*` non-auth routes.
- L10 No `bodyLimit` on JSON/multipart (`parseBody` buffers whole body before the 2MB check, `games/routes.ts:79`); staff-only.
- L11 Game detail metadata title uses slug not name (`app/games/[slug]/page.tsx:14-17`).
- L12 Listing order lacks a unique tiebreaker (`games/repo.ts:60`, `cafes/repo.ts:74`) → unstable pagination for equal names.

## Consistency / conventions (d)
- DRY: `toSummaryDto` duplicated verbatim in `games/service.ts:21-43` and `barcodes/service.ts:23-45` → export from games service. `isUniqueViolation` local to categories. Import vs validate parse rows differently (`import.ts:93-104` vs `validate.ts:72-82`).
- Files >200 LOC worth splitting: `app/admin/scan/scan-session.tsx` (336; extract `GamePicker`, `ScanEntryRow`), `app/admin/games/game-form.tsx` (327; description/licence block), `games/service.ts` (320; barcode + image services), `cafes/service.ts` (277; DTO mappers). `games/repo.ts` 245, `cafes/repo.ts` 220 acceptable.
- Comment policy violations: `dataset/import.ts:27-32` (phase-ownership rationale + `null as unknown as string` hack — change `RevisionMeta.editorId` to `string | null` and delete comment), `packages/shared/src/cafes.ts:35` ("see plan phase-04"), `app/nguon-tham-khao/page.tsx:10-11` (design rationale), `gameupc-client.ts:70` ("unset in MVP").
- No dead code found; no lint suppressions beyond two justified `no-img-element`.

## Acceptance criteria (a)
| Phase | Status | Evidence / gap |
|---|---|---|
| 1 | Partial | Governance files, turbo, ports present. CI not green (H5). `apps/mobile/README.md` present. |
| 2 | Mostly | `/api/me` (`me/routes.ts`), 403 test (`auth/middleware.test.ts`), migrations journal 0000-0004. OTP prod transport missing (M10); migrate not in quickstart (H6). |
| 3 | Mostly | "ma soi" test `games.test.ts:51`, checksum 422 `games.test.ts:61`, BGG link `games.test.ts:91`, revisions, CC BY-SA gate. Image upload UI absent + serving broken (H1, M7). |
| 4 | Partial | Province→ward filter + test `cafes.test.ts:100`, "Nơi chơi", consentStatus required. Pending cafes public (H4); prod has no location seed (H6). |
| 5 | Mostly | local/candidates/unknown, providerError path tested, 5s timeout + 1 retry, key server-only (no `GAMEUPC` in web). Camera restart (H7), no direct GameUpcClient timeout/retry test, cache-expiry untested. |
| 6 | Mostly | Determinism test `export.test.ts:120`, dry-run test, line errors test, references page + footer. Import data-loss (M4), shallow validator (M9), licence drift (M8). |
| 7 | Partial | Non-root images, Postgres unpublished, mem_limit, 14-backup rotation, rollback doc. Restore breaks indexes (H2), uploads volume perms (M6), backup safety (M11). |

## False alarms checked and dismissed
- Path traversal in `/api/uploads/*`: `@hono/node-server@2.1.1` rejects dot segments after `decodeURI` (`serve-static.cjs:80-81`); probe `%2e%2e/%2e%2e/package.json` → 404. Storage key `games/${gameId}.${ext}` uses a DB-verified id and whitelisted ext.
- Ward slug duplicates on re-seed: `data/admin-units.json` has 0 duplicate (province, slug) pairs; migration 0004 dedupe + unique index is consistent.
- PII in public API: `createdBy`, `addedBy`, `consentNote`, `sourceUrl`, `descriptionPermissionRef` only in staff DTOs (`cafes/service.ts:80-90`, `games/service.ts:52`); `/me` returns own email only. Dataset export excludes consentNote/createdBy/addedBy/emails.
- Role escalation via sign-up: `role` has `input: false` (`better-auth.ts:23`).
- Authz: every POST/PATCH/DELETE and staff GET (`/games/:slug/revisions`, `/cafes/:id/manage`, `/barcodes/*`) has `requireRole('maintainer','admin')`; every `app/admin/**/page.tsx` calls `requireStaff()`.
- Secrets server-side: web reads only `API_INTERNAL_URL`; GameUPC key only in api env.
- OTP storage: `hashed` in production (`better-auth.ts:31`); log redacted in prod.
- Postgres not published in prod compose; dev bound to 127.0.0.1.
- Export determinism: explicit ORDER BY on every query, arrays sorted, jsonb key order is canonical, fixed column order + `\n` delimiter.
- Barcode cache TTL: 30d hit / 1d miss, errors not cached (`barcodes/service.ts:48-65`, `repo.ts:13-21`).

## Recommended actions (priority)
1. H1 uploads rewrite + test. 2. H2 schema-qualified `unaccent_immutable` migration. 3. H4 filter pending publicly + staff list route. 4. H3 Caddy trusted proxies + limiter keying + SSR exemption. 5. H5 CI postgres service. 6. H6 root db scripts, README/deploy seed steps. 7. H7 scanner ref. 8. M1-M4, M6, M11, M10. 9. Remaining Medium/Low, DRY/comment cleanup.

## Metrics
- Type errors: 0 (api tsc). Lint: 0 (api, web). Format: clean.
- Test coverage: not measured (tests not run per coordination constraint).

## Unresolved questions
1. Is CC0 for `facts/` an accepted decision? It contradicts plan.md/README/footer and wraps MIT admin-unit data.
2. Should `pending` cafes be visible publicly at all (H4 assumes no)?
3. Does Tailscale Funnel forward the real client IP (X-Forwarded-For) to 127.0.0.1:8080? Determines whether per-user limiting is achievable before Cloudflare Tunnel.
4. Email OTP in production: disable until SMTP, or add SMTP now?
