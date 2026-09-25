Status: DONE

## Files changed
44 (43 modified + 1 new: `apps/web/lib/site.ts`). No git ops performed (no commit/push).

## Notable decisions
- Display name "Onboard VN" -> "OnBoardVN" everywhere (titles, BRAND const, OpenAPI title, footer, docs). New `apps/web/lib/site.ts` exports `SITE_NAME`/`SITE_TAGLINE`, imported into ~20 page.tsx metadata titles, layout.tsx, site-header.tsx, developers page, llms.ts (relative import `../site` in llms.ts, not `@/lib/site` — vitest has no `@/` alias configured, so alias import broke `llms.test.ts`; fixed by matching existing lib-internal relative-import convention).
- Repo URLs: `github.com/onboard-vn/onboard` and `.../dataset` both -> `github.com/onboard-vn/onboardvn` (no separate dataset dir exists in repo; dataset export code lives at `apps/api/src/dataset/`). `SOURCE_URL`/`DATASET_URL` in llms.ts collapsed to one constant since now identical.
- ghcr.io/onboard-vn/{web,api} image refs and GitHub org name `onboard-vn` left unchanged (explicit decision).
- `onboard.vn` test fixtures -> `https://onboard.j2teamnnl.com` (sitemap/json-ld/llms tests).
- CODE_OF_CONDUCT `conduct@onboard.vn` -> `conduct@onboard.j2teamnnl.com` (no real mailbox decision given; used current host domain, flagged here as an assumption).
- docs/deployment.md: added one line noting current public host (subdomain) + planned future `onboardvn.com` domain, per instructions (not hardcoded as actual value elsewhere).
- README.md: added concise English section at top with anchor `#readme-in-english` (13 lines added, under the 60-line budget), kept Vietnamese content below unchanged aside from title/org-repo-name updates. Org-creation step 2 repo renamed `onboard`->`onboardvn`; step 3 (separate `dataset` repo) reworded to optional/future since dataset currently ships inside the monorepo.

## Remaining "onboard-vn"/"onboard.vn" occurrences kept (intentional)
- `ghcr.io/onboard-vn/{api,web}` in compose.prod.yml, .github/workflows/release.yml, docs/deployment.md rollback note — image names unchanged per decision.
- GitHub org name `onboard-vn` in README.md — org name unchanged per decision.

## Command results
- `pnpm format` (wrote formatting fixes) then `pnpm format:check` — pass.
- `pnpm typecheck` — pass (4 packages).
- `pnpm lint` — pass (4 packages).
- `pnpm test` (after `pnpm db:up`) — 21/21 web tests, 98/98 api tests pass. One transient failure on first parallel run (api global-setup hit Postgres before compose finished settling); reran clean.
- `pnpm --filter @onboard/web build` — succeeds, all routes compiled.

## Unresolved / flagged for maintainer
- Domain used for CODE_OF_CONDUCT contact email is my choice (current host); swap if a real inbox/domain is set up later.
