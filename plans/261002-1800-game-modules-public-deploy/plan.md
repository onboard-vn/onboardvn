# Game modules + public deploy (2026-10-02)

Outcome: club members open `https://onboard.j2teamnnl.com/app/games`, search a game and use per-game tools (first: The Gang mission drawer); custom-domain mail aliases forward to the owner's Gmail.

## Status

| Item | Status | Where |
| --- | --- | --- |
| Game search + detail (Expo) | Done | `apps/mobile/src/app/games/**`, `src/games/catalog.ts`, `game-index.json` |
| The Gang mission drawer (Advanced/Professional/Master Thief/Homebrew, undo, VI/EN, local save) | Done | `apps/mobile/src/games/the-gang/**` |
| The Gang print-and-play (EN cards + chips, 3mm bleed) | Done | `tools/the-gang-print` (`cd src && node build.mjs`, needs Google Chrome) |
| Expo web served at `/app` on VPS | Done (public) | `deploy/Caddyfile`, `compose.vps.yml`, `docs/deployment.md` |
| DNS `j2teamnnl.com` → Cloudflare | Done | NS `isabel`/`jimmy.ns.cloudflare.com`; registrar stays Tino |
| Cloudflare Tunnel `onboard` | Done, Healthy (4 conns, HKG) | `cloudflared` container, `--profile tunnel` |
| Public hostname `onboard.j2teamnnl.com` → `caddy:8080` | Done | tunnel route (CNAME auto-created) |
| Switch `BETTER_AUTH_URL` / `WEB_ORIGIN` to public domain | Done | VPS `.env.prod` (backup `backups/.env.prod.20261002-1815`) |
| Email Routing catch-all `*@j2teamnnl.com` → `j2teamnnl@gmail.com` | Done (Active; old MX deleted) | Cloudflare → Email → Email Routing (MX moves to Cloudflare; Tino mail unused) |
| Email Worker: prefix subject with alias (`fb@` → `[fb] …`), fallback plain forward | Todo | new Worker, outside this repo or `deploy/` |
| Save The Gang result into plays/score sheet | Later | scoring resumes after BG Stats research |
| Web `/games` UX: search-as-you-type, type-to-search category, two-thumb ranges (players/time/weight), 375px layout, mission-tool link without login | Done (uncommitted) | `apps/web/app/games/**`; API adds `minPlayers`/`maxPlayers`/`minTime`/`minWeight` (`packages/shared/src/games.ts`, `apps/api/src/modules/games/repo.ts`) |
| Web site header wraps on narrow widths (375/768px) | Done (uncommitted) | `apps/web/components/site-header.tsx` |
| Expo: bearer login (password + email OTP), token in SecureStore/localStorage | Done (uncommitted) | `apps/mobile/src/api/client.ts`, `src/auth/**`, `src/app/login.tsx` |
| Expo: clubs → Kèo → tables with seated identities from the real API | Done (uncommitted) | `src/api/clubs.ts`, `src/app/club.tsx`, `src/app/meetup/[id].tsx` |
| Expo: table score sheet on the real plays API (polling sync, roster add/remove, guests, finalize) | Done (uncommitted), not yet live-tested | `src/api/plays-http.ts`, `src/api/play-mapping.ts`, `src/app/score/table/[tableId].tsx`; API `GET /api/tables/:tableId/play` |
| Guest claim: request from table, claim link → `/app/claim/:token` | Done (uncommitted) | `src/app/claim/[token].tsx`; API claim URL now `${WEB_ORIGIN}/app/claim/…` |
| Port cafés, games (BGG detail + filters), shelf, friends to Expo | Done (uncommitted), live-tested on local API | `src/app/{cafes,games}/**`, `src/app/{shelf,friends}.tsx`, `src/features/**`; home links in `src/app/index.tsx` |
| Fix `GET /api/games?categoryId=` 500 (relational query mis-qualified `game_id`) | Done (uncommitted) | `apps/api/src/modules/games/repo.ts` + test |
| Local browser test (375px): games filters, The Gang missions without login, login → CLB → Kèo → The Gang table scoring (guest add, remote edit by 2nd user via polling, finalize) | Done 2026-10-02 20:20 | fixes: coop winners in `apps/api/src/modules/plays/compute.ts`; ✓/✗ per-heist input + read-only derived counts (`score/generic-categories.tsx`); derived coop outcome in `score/summary-card.tsx`; coop final result view |
| Commit, push, redeploy `/app` + API on VPS, live-test table scoring with 2 accounts | Todo (owner: no commit yet) | `docs/deployment.md` → "App Expo ở `/app`" |

## Decisions

- Build inside the Expo app (not frozen `apps/web`); web first, Android later from the same code.
- Card data (official 20 cards + 110 BGG homebrew, reviewed VI) is committed; owner accepts going public gradually.
- Cloudflare Tunnel runs as a compose container (no sudo on VPS); tunnel is dashboard-managed.
- `@`/`ftp` records are DNS-only so MX/FTP keep working; Tino shared hosting still serves the root site.

## Risks

- Expo scoring: mobile cells map to server keys (`team` → first seated player, `$round` → the template's per-round category, `$quick` → free `total`; quick mode switches the play to no template). Clearing a cell and roster changes made by others only show after reopening the table.
- Native (Android/iOS) requests send no `Origin`; better-auth origin checks for native sign-in are untested.
- Local dev Postgres volume was recreated empty on 2026-10-02 19:46 (OrbStack had been off); now migrated + `db:seed-locations` + small test data (3 games, 1 café `dev-cafe`, users `dev1@`/`dev2@example.com`). No club/Kèo data locally.
- Expo shelf/friends: no camera/QR (typed barcode, friend by username).

- Auth accepts one origin: after the switch, the `*.ts.net` URL cannot sign in.
- Public exposure of club data (member names) once the hostname is live — owner chose to proceed.
- Changing DNS from an agent session may be blocked by the permission classifier; owner clicks those steps.
