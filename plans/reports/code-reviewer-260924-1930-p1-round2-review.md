# Code Review Round 2 — Onboard VN P1 fixes

## Scope
- Baseline: `plans/reports/code-reviewer-260924-1845-p1-review.md` (no git history; compared by reading current files).
- Checked (read-only): api `tsc --noEmit` 0 errors, web `tsc --noEmit` 0, `eslint` api+web 0, `prettier --check .` clean.
- Empirical: dev Postgres probe `SET search_path=''; SELECT public.unaccent_immutable('Ma Sói Đêm')` → `Ma Soi Dem`; `proconfig={search_path=public, pg_temp}`; trigram indexes reference `public.unaccent_immutable`.
- Source-verified: hono 4.13.9 `csrf` + `validator`, better-auth core 1.7.5 `getIP`, tailscale `ipn/ipnlocal/serve.go` (`addProxyForwardedHeaders`).
- Not run: test suites (shared DB, tester running a prod stack), full `pg_dump | pg_restore` rehearsal, CI on GitHub.

## Overall
Round-1 Highs are fixed except for one new CI break: the e2e job never builds `@onboard/shared`. The proxy/IP trust chain is correct end to end for both Funnel and cloudflared. CSRF coverage is sound. Remaining risk is operational: prod login depends on Google OAuth, and the global limiter also counts image requests from users who share one IP.

## Finding status

| ID | Status | Evidence |
|---|---|---|
| H1 uploads 404 | Fixed | `app.ts:43-49` `rewriteRequestPath: path.slice(UPLOADS_PUBLIC_PREFIX.length)`; round-trip test `games/image-upload.test.ts:48-56` |
| H2 restore drops indexes | Fixed (probe-verified) | `drizzle/0005_fix_unaccent_search_path.sql`; journal idx 5. Full restore rehearsal still unrun |
| H3 rate-limit single bucket | Fixed | See the trust-chain analysis below. `client-ip.ts:16-22`, `better-auth.ts:38`, `Caddyfile:2-24`, `api-server.ts:12-14`, `compose.prod.yml:66` |
| H4 pending cafes public | Fixed | `cafes/repo.ts:26`, `service.ts:132,271`; staff `/cafes/manage` `routes.ts:32-41` declared before `/:slug`; admin pages use it; tests `cafes.test.ts:153,174` |
| H5 CI no Postgres | Partial: check job OK, e2e job broken | See NEW-H1 |
| H6 no migrate/seed steps | Fixed (docs) | root `package.json:18-20`, `README.md:33-36`, `docs/deployment.md:64-65`. The migrate service still only migrates, but seeding is documented as manual. Acceptable |
| H7 camera restart | Fixed | `barcode-scanner.tsx:68-71` ref; effect deps `[unsupportedReason]` (`:137`) |
| M1 invalid uuid → 500 | Partial | Params, `categoryId`, `gameId`, and `gameIds` are now `z.uuid()`. **`categoryIds: z.array(z.string())` at `shared/src/games.ts:48`** still reaches `categoryIdsExist` → pg `22P02` → 500 (staff-only). No `22P02` mapping in `error-handler.ts` |
| M2 cannot clear fields | Fixed | `shared/games.ts:68-84`, `cafes.ts:45-57`; forms send `null` on edit (`game-form.tsx:66-75`, `cafe-form.tsx:81-110`); merged invariants re-checked (`cafes/service.ts:194-196`, `games/service.ts:193-213`) |
| M3 empty PATCH 500 | Fixed | `cafes/repo.ts:155-157`, `categories/repo.ts:23-26` |
| M4 import wipe/half-apply | Fixed, minor residue | Columns only applied when present (`import.ts:91,103,117-129`); single tx (`:210-212`); `info.lines` (`csv.ts:34-45`). Residue: `findAvailableSlug` (`import.ts:182`) reads outside `tx`, so two new rows with the same `nameEn` and no slug collide → whole import rolls back. Dry-run does not detect slug/bggId conflicts. Atomic, so Low |
| M5 race → 500 | Deferred, harmless for MVP | Only a 500 instead of a 409 on concurrent duplicates; the tx rolls back, no corruption |
| M6 uploads perms | Fixed | `apps/api/Dockerfile` `mkdir -p /data/uploads && chown`; `UPLOADS_DIR` default `/data/uploads` in compose |
| M7 upload UI / revision / nosniff | Not fixed | No web caller for `POST /games/:id/image`; `setGameImageService` (`games/service.ts:319`) writes without a revision; no `nosniff` in `Caddyfile` |
| M8 licensing | Partial | Admin units moved to `admin-units/` with MIT notice (`dataset/export.ts:37-60,136-146`). Docs drift remains: `README.md:3,72,82` and `CONTRIBUTING.md:8,75` still say all data (incl. admin units) is CC BY-SA, while `facts/` is CC0 and admin units are MIT |
| M9 shallow validator | Deferred, harmless | Import only ingests `games.csv`; the cafes path is not imported into the DB. Human PR review is the gate |
| M10 email OTP prod | Deferred, **escalate condition** | `otp-mailer.ts:19-21` redacts, OTP stored hashed → an email user can never log in. The admin seed (`db/seed.ts`) creates a user with an email only, so **Google OAuth is the only working login in prod**. `GOOGLE_CLIENT_*` default to empty (`compose.prod.yml:47-48`) and the docs do not mark them required. Before deploy: mark Google required in `docs/deployment.md`, or hide the email OTP form in prod |
| M11 backup safety | Mostly fixed | `umask 077`, tmp + `pg_restore --list` + `mv` (`backup.sh:5,29-45`). `backups/` still missing from `.gitignore` |
| M12 env drift | Mostly fixed | GAMEUPC in compose (`:51-52`) and docs (`deployment.md:43-50`). `docs/architecture.md:53` still lists the wrong consent enum. `apps/api/.env.example` not verified (read denied) |
| M13 admin list cap 50 | Deferred, harmless until >50 cafes | `admin/cafes/page.tsx:13`, `admin/scan/page.tsx:11` |
| M14 scan UX | Deferred, but see note | `scan-session.tsx:263-276`: a non-ok response is silent, and a network throw leaves `bulkPending=true` forever. With NEW-M1, 429s at a cafe become plausible. A cheap fix (else-branch error + try/finally) is recommended before real use |
| L9 CSRF | Fixed | See the CSRF section below |
| L1-L8, L10-L12 | Not fixed (except `q` max 200 for L2) | None are blocking |

## New code review

### Trust chain / spoofing (H3 fix)
- **Caddy**: `trusted_proxies static private_ranges` + `trusted_proxies_strict` read XFF right to left and stop at the first untrusted hop. `header_up X-Forwarded-For {client_ip}` then overwrites XFF with a single value, so the api's leftmost pick (`client-ip.ts:8`) and Better Auth's single-value rule (`getIPFromHeader` requires exactly 1 entry without `trustedProxies`) both see exactly Caddy's view.
- **Tailscale Funnel (HTTPS mode, `tailscale funnel --bg 8080`)**: tailscaled uses `httputil.ReverseProxy{Rewrite}`, which strips the inbound XFF, then `Header.Set("X-Forwarded-For", SrcAddr)`. For Funnel, `SrcAddr` is the original client. Caddy's peer is the docker gateway (trusted), and the single XFF value is a public IP (untrusted) → `client_ip` is the real client. A client cannot inject an XFF value. Caveat: `--tcp` / TLS-terminated-TCP modes send no XFF, so everyone collapses to the gateway IP. The docs use HTTPS mode, which is correct.
- **cloudflared**: the Cloudflare edge appends the client IP as the rightmost XFF entry, so strict parsing picks it. A spoofed prefix like `10.0.0.1, …` is ignored because the scan stops at the real IP.
- **Web SSR**: Caddy → web with XFF=`client_ip`. Next only sets XFF if absent. `api-server.ts:12-14` forwards it → the api keys on the real client.
- **Host / docker network**: Caddy is published on `127.0.0.1:8080` only, so only host-local processes can forge XFF. On the `onboard` network, api trusts XFF from any peer (no peer check), but the only members are postgres/migrate/web/caddy. Forging requires a compromised container, which is already game-over. Does not matter.
- Internet clients cannot spoof their rate-limit key.

### CSRF (`app.ts:57-62`)
- hono/csrf only checks non-GET requests whose content type is form-like or missing (missing counts as `text/plain`). JSON is skipped, but cross-site JSON needs a CORS preflight, and there is no CORS middleware, so it is blocked. PATCH/DELETE also need a preflight.
- Cross-site `text/plain` / `multipart` / `urlencoded` → 403 unless `Sec-Fetch-Site: same-origin` or `Origin === WEB_ORIGIN`. Even if one got through, hono's json validator only yields `{}`, which every POST schema rejects.
- The only multipart route is `POST /api/games/:id/image` (`games/routes.ts:92-104`). It is protected (test `lib/csrf.test.ts`).
- `/api/auth/*` is skipped; Better Auth runs its own origin check against `trustedOrigins`.
- All web mutations are browser-side via `lib/api.ts` (Origin and Sec-Fetch-Site are sent). There are no server actions or SSR mutations, so the Origin-less SSR 403 case cannot happen.
- Minor: CSRF 403 becomes `{code:'BAD_REQUEST', message:'Forbidden'}` via `error-handler.ts:10-12` (inconsistent code, harmless).

### Other new code
- `0005` migration: correct. `SET search_path` blocks SQL-function inlining (small per-call overhead). Index matching is unaffected because both the index and the query use a function call. No reindex is needed since the output is identical.
- `shared/common.ts`: fine. `z.uuid()` is RFC-strict (rejects non-v1-8 patterns such as `1111…`), but all ids come from `gen_random_uuid`, so this is OK.
- Games repo `withTx` (`games/repo.ts:15-19`): correct. Update/insert-with-revision run on the outer tx.
- `env.ts:17` `TRUST_PROXY` preprocess: correct (undefined/"false" → false; avoids the `z.coerce.boolean` trap).

## NEW High

**NEW-H1. CI e2e job cannot start the servers.** `.github/workflows/ci.yml:67-84`
`@onboard/shared` exports only `./dist/index.js` (`packages/shared/package.json` `exports`), and `dist/` is gitignored. The e2e job does install → migrate → seed → `playwright test` with no build. `db/*` does not import shared, so migrate and seed pass. But the Playwright webServer runs `npx tsx src/server.ts`, which imports `auth/better-auth.ts` → `@onboard/shared` → `ERR_MODULE_NOT_FOUND`. `next dev` fails the same way (`transpilePackages` does not change export resolution). Locally it passes only because `dist/` exists.
Fix: add `- run: pnpm turbo run build --filter=@onboard/shared` (or `pnpm --filter @onboard/shared build`) after install in the e2e job.

## NEW Medium

**NEW-M1. Global limiter counts static uploads and shared NATs.** `app.ts:55` applies `apiRateLimit` (300/min per IP, `rate-limit.ts:7-8`) to `/api/*`, including `/api/uploads/*`. A game list page is about 20 images plus 2-4 SSR API calls. Players in one board-game cafe share one public IP (the core audience) → 429s on images and admin scan within minutes. Each image also triggers a session DB lookup (L5).
Fix: mount the uploads static handler before the limiter and the session middleware, and/or serve `/api/uploads/*` from Caddy `file_server` with the volume mounted read-only.

## CI (other than NEW-H1)
- `pnpm/action-setup@v4` with no `version` reads `packageManager: pnpm@11.20.0`, which is supported. `.nvmrc`=22 satisfies pnpm 11.
- `allowBuilds` in `pnpm-workspace.yaml` covers esbuild/sharp/unrs-resolver.
- Postgres service `54329:5432` matches `TEST_DATABASE_URL`; the api global-setup creates `onboard_test` via the `postgres` DB.
- The check job's turbo `test`/`lint`/`typecheck` `dependsOn ^build`, so shared is built there.
- `playwright install --with-deps chromium` is fine on ubuntu-latest. Ports 8787/3100 are free on runners.
- e2e api runs with NODE_ENV unset (development) → plain OTP → `readLatestOtp` works.

## Recommended actions
1. NEW-H1: build shared in the e2e job.
2. M10 gate: mark Google OAuth required in `docs/deployment.md` (or hide email OTP in prod) before the first deploy.
3. NEW-M1: exempt uploads from the limiter and session middleware.
4. M1 residue: `categoryIds: z.array(z.uuid())`.
5. M14 cheap fix (bulk error + finally). M8 docs alignment. `backups/` in `.gitignore`. `architecture.md:53` enum.

## Unresolved questions
1. Is Google OAuth guaranteed to be configured for the first prod deploy? If not, prod has no working login.
2. Run a one-off `pg_dump | pg_restore --exit-on-error` rehearsal into a scratch DB once the tester frees the stack. The probe covers the function, not the full restore.
