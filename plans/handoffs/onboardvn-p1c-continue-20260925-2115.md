---
handoff-version: 1
generated: 2026-09-25T14:15:00Z
generator: ak:handoff
focus: "OnBoardVN: P1b done, P1c 1,2,6,7(a-d),9 done; next release gate or phase 8→3→4→5"
workspace: /private/var/www/laradock/_code/projects/onboard-vn
branch: main
head: 296c44d
---

# HANDOFF: OnBoardVN — continue P1c (release gate or phases 8→3→4→5)

## Mission and current status

OnBoardVN — "Vietnam's Open Board Game Community" (slogan UI: "Tìm quán - Tìm game - Tìm người cùng chơi"). Owner priority (2026-09-25): **convince board-game cafés to cooperate first**; before sharing links externally: **stable deploy + real data**.

Done (all pushed to `main`, CI + Release green):
- P1 foundation (7 phases), P1b accounts + SEO/LLM (4 phases).
- Rebrand to OnBoardVN, repo moved to GitHub org `onboard-vn/onboardvn` (**private**), brand assets, English routes with 308 redirects.
- P1c phase 1 friends (QR/invite link, requests, blocks, privacy), phase 2 personal shelf, phase 7 (7a owner invite + consent + /my-cafes + /data-sources, 7b owner inventory CSV import + café-scoped scan, 7d venue types/amenities/fee model/Google-Maps-style hours, 7c Facebook-style café page + media uploads), phase 9 `/map` (MapLibre + OpenFreeMap, manual pins), phase 6 Kèo (6a API + 6b web: sessions → tables, RSVP/waitlist, calendar, invites).
- Seed data imported into **dev DB**: 170 games (Wikidata CC0), 20 categories, 25 Hà Nội cafés (`public_info_only`, no coordinates yet).

Remaining (plan order): **release gate** (deploy + pins + café verification) → phase **8** community café scan → **3** play log (incl. log from Kèo/table) → **4** Steam-style profile/stats/feed → **5** clubs. Future: P1d external club app integration (discovery only), "Nhập từ Facebook Page" (needs Meta App Review + real domain), café self-claim (later), P2 = import only.

## Scope and guardrails

- Workspace: `/private/var/www/laradock/_code/projects/onboard-vn` (pnpm monorepo: `apps/api` Hono+Drizzle+Postgres+Better Auth 1.7.5, `apps/web` Next 16.3.6 — read `apps/web/AGENTS.md`, Next has breaking changes; `packages/shared` zod v4).
- Owner workflow (from user CLAUDE.md): **scout → proposal (recommendation, flow, exact scope, representative code, verification, boundaries) → AskUserQuestion approval → implement → report**. Owner chose "duyệt nhanh, để Jarvis tự chạy": approve one proposal per phase/slice, then implement → code-review subagent → fix → verify → commit+push without re-asking. Address user as "chủ nhân", self as "Jarvis", Vietnamese, concise.
- **Never commit unless approved** for that batch (approval granted per phase/slice in this session; re-ask in a new session). No attribution lines in commits. Conventional commits.
- **Always back up the dev DB before migrations/data changes**: `docker exec onboard-dev-postgres-1 pg_dump -U onboard -Fc onboard > <session scratchpad>/onboard-dev-pre-<x>.dump` — **never write dumps inside the repo**.
- Dev DB migrate: `cd apps/api && DATABASE_URL=postgres://onboard:onboard@localhost:54329/onboard BETTER_AUTH_SECRET=[REDACTED:dev-placeholder] BETTER_AUTH_URL=http://localhost:3100 WEB_ORIGIN=http://localhost:3100 pnpm exec tsx src/db/migrate.ts` (the migrate-only secret is a non-sensitive placeholder of ≥32 chars).
- Don't read/modify `.env*` files (permission denied). Don't bypass pnpm `minimumReleaseAge` (a subagent once added `minimumReleaseAgeExclude` — reverted; `maplibre-gl` pinned 6.11.1).
- Never scrape Google Maps/Facebook/BGG; no bulk geocoding; coordinates placed manually. Contributor identity of community edits visible only to role `admin`. Public DTOs never include email.
- Browser tests headless/background only; free ports 8787/3100 before/after.
- Commit only after: forced checks `pnpm turbo run typecheck lint test --force`, `pnpm format:check`, `pnpm --filter @onboard/web build`, `cd apps/web && pnpm exec playwright test` (run twice for new UI). Subagents have misreported green before — **always re-verify yourself**.

## Current state

- Branch `main`, HEAD `296c44d`, in sync with `origin/main` (github.com/onboard-vn/onboardvn, private).
- Working tree clean except untracked `.claude/` (local agent settings, intentionally not committed).
- Migrations `0000`–`0016` applied to dev DB (`0016_admin_audit_log` last). Dev Postgres container: `onboard-dev-postgres-1` (127.0.0.1:54329, DBs `onboard`, `onboard_test`). The old `onboard-test` prod-rehearsal stack was deleted.
- Backups in session scratchpad `/private/tmp/claude-501/-private-var-www-laradock--code-projects-onboard-vn/00441664-f2bc-4662-9429-21484c00d7d8/scratchpad/` (pre-0006…pre-0016 dumps) — session-scoped, may be gone in a new session.
- Test counts at HEAD: api 275, shared 22, web 71 unit; e2e 11 specs.

## Decisions and rationale

- Name/brand: OnBoardVN; GitHub org `onboard-vn` (org `onboardvn` was taken); repo private until launch → ghcr images private (deploy host needs `docker login ghcr.io` with a `read:packages` PAT).
- Domain: not bought yet; temporary host plan `onboard.j2teamnnl.com` (DNS at tino.vn) — port 80/443 not reachable from outside (no port-forward / possibly CGNAT). **Decided: Tailscale Funnel first**, via a Tailscale **sidecar container** hostname `onboardvn` → `onboardvn.<tailnet>.ts.net` (can't be `onboardvn.ts.net`). Later: buy `onboardvn.com` (registrar tino OK), point NS to Cloudflare, Cloudflare Tunnel. Prod host: ThinkPad `vps` (Tailscale SSH), Docker 29; other projects run there (port 80 taken) — use separate compose project `onboard`.
- Imported cafés show publicly with basic info (`public_info_only`); owners get invite link → consent: granted (full details) / declined (hidden everywhere via one predicate `publicCafeWhere`; imports never re-publish). Pins shown for `public_info_only` too (lat/lng public for all visible cafés).
- Venue types `boardgame_cafe | byog_cafe | event_space`, tri-state amenities, fee model, structured hours with `getOpenStatus` (Asia/Saigon). Attribute filters only match detail-public cafés.
- Kèo = session → 1..30 tables; default visibility `public`; host counts toward seats; FIFO waitlist; private via hashed rotatable code; participant names follow each user's `profileVisibility` ("Người chơi ẩn danh" otherwise); capacity can't drop below going count.
- Play history default public (Steam-like); friends list default `friends`.
- Owner inventory CSV import required before café pilot (done in 7b).
- Club app (external, name unknown) → two-way integration deferred to P1d discovery; model sessions→tables adopted from it.
- Open data = catalog only (never player data); README says so.

## Work performed

27 commits since `1219c22` (P1 docs). Key: `351fe70`…`b51ceaf` (P1b), `515f379` rebrand, `826e89d` Docker public dir fix, `ce9a943` brand assets, `0a8d977` friends, `68f4779` shelf, `2eaaf82` English routes, `d12125c` block/email race fixes (Codex cross-review), `0c323f3` dataset dir import + seed, `3c6ee65` owners 7a, `996731c` 7b, `872c92e` 7d, `17ced8b` 7c, `2e4f4dd` map, `b59a1f6` Kèo API, `296c44d` Kèo web. Every slice: implementation subagent → code-reviewer (and Codex cross-review for a batch + plan) → fixes → forced verification → push → CI watch. Redactions applied in this handoff: 1 (dev secret placeholder).

## Verification

- At HEAD `296c44d`: forced `turbo typecheck/lint/test` green (api 275, shared 22, web 71), `format:check` clean, web build OK, Playwright 11/11 headless, CI + Release green (run 36145329346 / 36145329308).
- Web Docker image verified to contain `public/maplibre/` worker files; API Docker image verified to load `sharp` (alpine/musl).
- Not verified: real device barcode scanning (Android Chrome / iOS Safari), production deploy, SMTP delivery in prod, Google OAuth in prod, Rich Results Test, load/perf beyond unit scale.

## Open risks and blockers

- **Owner-provided items for deploy** (secrets must be typed by the owner into `.env.prod` on the server, never through the agent): SMTP creds (Gmail app password), `MAIL_FROM`, optional Google OAuth client, `CONTACT_EMAIL`, Tailscale auth key (tag e.g. `tag:onboardvn`, Funnel enabled in ACL), ghcr `read:packages` PAT.
- `apps/api/.env.example` / `apps/web/.env.example` still lack `SMTP_URL`, `MAIL_FROM`, `SITE_URL`, `CONTACT_EMAIL`, `AUTH_RATE_LIMIT_DISABLED` docs (agent can't edit `.env*`).
- 25 cafés have no coordinates → `/map` empty until pins placed (owner does it manually in `/admin/cafes/[id]/edit`). Cafés to verify first: The Root Ngọc Hà (possibly closed), The Nest (address conflict), Minipolo (address conflict), Lofi-Sweep (ward low confidence). 11 names from owner's Google Maps list lack addresses (see seed review report).
- Legal: re-check against Luật Bảo vệ dữ liệu cá nhân 91/2025/QH15 before café pilot.
- In-memory rate limiters (per process) — fine for 1 instance.
- `onboardvn.com` printed on banner/poster assets but not owned yet — don't publish those images before buying.
- Owner-side external: Facebook fanpage creation deferred; domain purchase deferred.

## Exact next actions

1. **First safe step**: read this file, then run `git status` / `git log -1` to confirm HEAD `296c44d` and a clean tree; confirm dev DB is up (`docker ps | grep onboard-dev-postgres`).
2. Ask the owner (AskUserQuestion) which track: (a) release gate / deploy, (b) phase 8, (c) phase 3.
3. If (a) deploy: propose → add Tailscale sidecar service to `compose.prod.yml` (hostname `onboardvn`, `TS_AUTHKEY` from env, `tailscale serve/funnel` to Caddy :8080, state volume), update `docs/deployment.md`; clone repo on `vps` (`/home/j2teamnnl/onboardvn` or similar), owner fills `.env.prod`, `docker login ghcr.io`, `docker compose -p onboard --env-file .env.prod -f compose.prod.yml up -d`, seed locations, import `data/staging` on prod, create admin (`seed.js ADMIN_EMAIL`), install backup systemd timer, smoke test via Funnel URL; then owner places pins + verifies cafés.
4. If (b)/(c): read `plans/260925-0009-p1c-players-community/phase-08-community-cafe-scan.md` or `phase-03-play-log.md`, scout current code, send proposal, implement with subagent, review, forced verify, push.
5. After each phase: sync phase frontmatter status, write journal (`ak journal create`) at meaningful milestones.

## Source pointers

- Plans: `plans/260925-0009-p1c-players-community/plan.md` (decisions, execution order, slices 7a–7d, later items), phase files `phase-03…phase-09`; `plans/260924-1854-p1b-accounts-seo-llm/`; `plans/260924-1854-p2-cafe-owners-import/plan.md` (to be trimmed to import-only).
- Reports: `plans/reports/reviewer-260925-1441-p1c-priority-plan-review.md`, `planner-260925-1407-club-app-reference-integration.md`, `seed-data-260925-1334-staging-review.md`, `researcher-260925-0923-foreign-oss-boardgame-landscape.md`.
- Journal: `plans/journals/2026-09-25-p1b-ti-khon-seo-llm-xong.md`.
- Docs: `docs/architecture.md`, `docs/deployment.md`, `branding/README.md`, `README.md`.
- Data: `data/staging/` (dataset), `data/staging/cafes-hcm-pending.csv` (15 HCM cafés, not imported).
- Repo: https://github.com/onboard-vn/onboardvn (private); CI workflows `.github/workflows/{ci,release}.yml`; images `ghcr.io/onboard-vn/{web,api}`.
- Key code: `apps/api/src/modules/{cafes,cafe-owners,events,friends,shelf,users}/`, `apps/api/src/modules/cafes/visibility.ts`, `apps/api/src/lib/visibility.ts`, `apps/api/src/auth/{better-auth,profile-guard,cafe-role}.ts`, `apps/web/app/{map,events,my-cafes,cafes}/`, `compose.prod.yml`, `deploy/`.
