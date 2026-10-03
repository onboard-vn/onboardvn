# Handoff — Expo replaces web + "Hôm nay chơi gì?" redesign (2026-10-02 23:05)

Supersedes [onboardvn-main-20261002-1815.md](onboardvn-main-20261002-1815.md) for current state (its env notes still apply). Plan with full status, decisions, gaps: [plans/261002-2033-expo-replaces-web/plan.md](../261002-2033-expo-replaces-web/plan.md) — read it first.

## State

- **Committed and deployed 2026-10-03 00:00** (commits `97210c2`..`fb788eb` on `main`, pushed). VPS: prod DB backup `backups/onboard-20261002-235308.dump` taken before migrations 0023/0024; api rebuilt (`compose.vps.yml`), Expo build rsynced to `deploy/mobile-web/`, caddy restarted.
- Done (uncommitted): Expo app (`apps/mobile`) is the whole site at `/` with all old Next.js pages ported (same URLs), responsive header, brand theme (felt green `#0f766e`, logo yellow/red, cream bg, Be Vietnam Pro), transparent hero, home redesign; Caddy serves the Expo build + legacy redirects (`deploy/Caddyfile`, `docs/deployment.md`); table scoring on the real plays API; shelf upgrade (condition/sleeve/box/edition, list/grid, last played), wishlist, `/api/suggest` (migration `0023_shelf_wishlist`, dev DB migrated, backup `backups/dev-onboard-20261002-2207.dump`).
- Last verified: repo-wide lint/typecheck/test green (shared 676, api 397, web 82, mobile 121), prettier clean; after `/suggest` rewrite mobile 123 green.

## Next (in order)

1. ~~Rewrite `/suggest`~~ — **Done (uncommitted, 23:20)**: new flow per demo with existing sources (Tủ game, Muốn chơi, Quán, Tỉnh/thành, Toàn quốc); see plan table row for files and gaps. Mobile lint/typecheck/test green (123), prettier clean.
2. ~~New sources + actions after pick~~ — **Done (uncommitted, 00:00)**: owner decisions and file list in the plan ("Owner decisions for sources and actions" + table row). Restart API after pulling: migration 0024 already applied to dev DB.
3. ~~Home sections~~ — done. Public smoke test: `/`, `/suggest`, `/games`, `/sfx/*.mp3`, `/health`, `/api/games?sort=cafes`, `/api/suggest` → 200, `/dang-ky` → 308.
4. BGG content (2026-10-03 00:25, owner decision): covers hotlinked from BGG CDN (`games.external_image_url`, credit "BoardGameGeek"), descriptions translated from BGG by 12 subagents (`translated_from_bgg`, `permission-only`, excluded from CC BY-SA dataset); prod now 576/587 games with cover + description. Prod backup before migration 0025: `backups/onboard-20261003-002353.dump`. Source/translations in `data/private/bgg/` (gitignored), runbook in `docs/deployment.md`.
5. Games without bggId (2026-10-03 10:30): set bggIds for 8 (Air Land & Sea 247367, Trajan 102680, Northgard: Uncharted Lands 274124, Mission: Red Planet 2nd/3rd ed 176920, Las Vegas Royale 271319, The 7th Citadel 286063, Medico 472021, Ultimate Werewolf: Deluxe Edition 152242) after backup `backups/onboard-20261003-103052.dump`, then imported BGG cover + translated description (`data/private/bgg/bgg-content-extra-vi.json`, also merged into `bgg-content-vi.json`). Follow-up 10:58 (backup `backups/onboard-20261003-105750.dump`): Cờ Tỷ Phú got bggId 1406 (Monopoly) + translated description; Mèo Nổ copies the description of `exploding-kittens` (bggId 172225 already used there, bgg_id is unique); both keep their Vietnamese box images (Fahasa). `mystery-game` was deleted then restored the same morning (owner: keep it as a private/custom game) from `backups/onboard-20261003-105750.dump` via a temp DB: game row, club ownership, club metadata and its Kèo table link are back; it stays without cover/description. Prod: 586/587 with cover + description.
6. Open: prod has 0 public cafés, so every draw is "Cổ vật" until cafés are published; native sound not implemented; `/games` ignores URL filters (home "Tất cả game" goes to plain list).
7. Earlier later-list: home sections ("Dành cho người mới", "Thuần Việt/Việt hoá", "Nhiều quán có nhất"); gaps list in the plan; then commit → deploy → public smoke test.

## Local dev

- Postgres: `onboard-dev-postgres-1` (127.0.0.1:54329); seeded club "CLB Test Local", Kèo `keo-test-local` with The Gang + Catan tables, users `dev1@example.com` (owner) / `dev2@example.com`; password in `plans/private/dev-login.txt` (gitignored). API env: `apps/api/.env` (gitignored, dev values).
- Run API: `cd apps/api && pnpm exec tsx --env-file=.env src/server.ts` (port 8787).
- Run Expo web: `cd apps/mobile && EXPO_PUBLIC_API_URL=http://localhost:8787 pnpm exec expo start --web --port 8081` (dev routes have no `/app` prefix; do not set `CI=1`, it disables reload).
- Production-like check: `pnpm --filter @onboard/mobile export:web`, then run `caddy:2-alpine` with `deploy/Caddyfile` (replace `api:8787` with `host.docker.internal:8787`) mounting `apps/mobile/dist` at `/srv/mobile-web`, port 8081 (auth trusted origin is `http://localhost:8081`).
- Codex image generation quota resets 2026-10-04; ChatGPT in the owner's Chrome works for image edits (downloads land in `~/Downloads/.com.google.Chrome.*` temp files pending confirmation).

## Google Maps (2026-10-03 12:35)

- Google Cloud project **OnBoardVN Maps** (`local-cedar-510505-p0`), billing account **OnBoardVN Maps** (`01688E-371C2C-1526D7`). Console's "Set up account to enable Maps API" dialog loops (account treated as India); the API was enabled from Cloud Shell instead (`gcloud services enable maps-backend.googleapis.com`).
- API key **onboardvn web map**: restricted to Maps JavaScript API and referrers `https://onboard.j2teamnnl.com/*`, `http://localhost:8081/*`. Daily cap `maps-backend.googleapis.com/billable_default` = 330/day (≈10k free/month).
- Cleanup: closed billing accounts "Onboard" (unlinked from Nam Long) and "My Billing Account 2"; deleted extra project `optimum-phalanx-510505-a1` (undeletable for 30 days). Kept "My Billing Account 1" (Gemini project).
- Pending: key must be put in `apps/mobile/.env.local` as `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` (agent is blocked from writing `.env*`), then `export:web` + rsync to deploy.
