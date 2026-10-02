# Handoff — club-first (2026-10-02)

Branch `feat/club-first-scoring` (not merged to `main`). Plan: [plans/261002-1155-club-first-scoring/plan.md](../261002-1155-club-first-scoring/plan.md) — read the "Trạng thái" table and "Decisions" at the end first.

## Decided (do not re-litigate)
- Club-first: private clubs only (MVP), invite code hashed, club-only Kèo.
- One Expo app (`apps/mobile`, Expo Router, SDK 57) for iOS + Android + web. Next.js `apps/web` frozen (bug fixes only), retire at parity. SEO not a priority.
- Identities: member | guest | external. Guest = display name + optional birth year; claim by link or self-claim approved by inviter/club admin.
- External club sync = private plugin repo `onboard-vn/onboardvn-private` (never commit club-specific code/data to the public repo). Owner approved syncing members/history into the private club.
- Builds/deploy run on the owner's VPS (`ssh vps`), internal only via `tailscale serve` (no funnel yet).
- **Scoring paused** — owner will study BG Stats first. Parked work: branch `wip/scoring-v4` (schema v4 derived fields, The Gang rewrite, ~20 template audits; tests/ajv not re-run after audit).

## State
- Dev DB: local Postgres `127.0.0.1:54329` (docker compose). Backups in `backups/`.
- VPS stack: `~/Code/onboardvn`, `docker compose -p onboard --env-file .env.prod -f compose.prod.yml -f compose.vps.yml`. URL https://j2teamnnl-thinkpad.taild8efed.ts.net (tailnet only). Admin password: `~/Code/onboardvn/.admin-password` on VPS (set via `pnpm auth:set-password`). Mail sink: mailpit on VPS `127.0.0.1:8025`.
- Data: 596 club games (585 with BGG metadata, private), 551 score templates (285 high / 196 medium / 70 low confidence), 80 club Kèo / 316 tables (2026-06-25 → 2026-10-08).
- Private data never in git: `data/private/`, `plans/private/`.
- Expo web preview: `pnpm --filter @onboard/mobile exec expo start --web --port 8081` (mock data for club/scoring screens).

## Next (owner to choose)
1. Wire Expo app to the real API (login/bearer, clubs, Kèo, tables with seated identities, guests + claim).
2. Port remaining web pages (cafés, games with BGG description/thumbnail, shelf, friends) to Expo.
3. Fix header nav overlap on narrow widths in `apps/web`.
4. Later: resume scoring from `wip/scoring-v4` after BG Stats research; send GameUPC key request (draft in Gmail drafts of j2teamnnl@gmail.com, repo link points to a private repo — fix before sending); BGG XML API registration (draft `plans/reports/draft-261002-1203-bgg-xml-api-request.md`).

## Known issues / risks
- External club app leaks members' `secretId` + real names in public RSC payloads (owner chose not to report yet).
- 10 synced tables have no matched game. Guests synced (59 "Bạn của X" identities); sync still reports `unknownMemberRefs: 60` — not investigated.
- Presence (who is typing) is in-memory → single API node only.
- `wonderland-s-war` template has no matching game slug.
