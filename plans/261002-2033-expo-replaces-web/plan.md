# Expo app replaces the Next.js website (2026-10-02)

Outcome: `https://onboard.j2teamnnl.com/` is served by the Expo web build (`apps/mobile`) with every page the Next.js site had, same URLs (links in emails/QR keep working), responsive at 375px. Club/Kèo pages are ported as they were, plus "Tính điểm" per table and "Rút nhiệm vụ" for games with a module. Next.js `apps/web` is retired from the deploy (code kept until owner deletes it).

Owner decisions (2026-10-02 20:35): Expo replaces the old web entirely; old Club/Kèo pages keep their structure and gain scoring/mission buttons. No commit until owner says so.

## Status

| Phase | Owner | Status | Scope |
| --- | --- | --- | --- |
| 0. Shell: root baseUrl, site header/nav, cookie+bearer auth, shared deps, claim URL `/claim/:token` | lead | Done | `src/app/_layout.tsx`, `src/ui/site-header.tsx`, `src/api/client.ts`, `app.json` |
| 1. Auth + account + profile + invite | agent A | Done (uncommitted) | `(auth)/*`, `account`, `u/[username]`, `invite/[code]` |
| 2. Clubs + events (Kèo) + scoring buttons | agent B | Done (uncommitted) | `clubs/**`, `events/**`, existing `club.tsx`/`meetup` merged in |
| 3. Cafés extras, my-cafes (owner), map, static pages, home | agent C | Done (uncommitted) | `cafes/[slug]/contribute`, `my-cafes/**`, `map`, `credits`, `data-sources`, `developers`, `index` |
| 4. Admin | agent D | Done (uncommitted) | `admin/**` |
| 5. Deploy switch: Caddy `/` → Expo static, retire `web` container | lead | Owner OK to commit + deploy (2026-10-03 00:10); see handoff for result | `deploy/Caddyfile`, `compose.vps.yml`, `docs/deployment.md` |
| 7. UI/UX pass (ak:ui-ux-pro-max) | lead | Done (uncommitted): brand tokens (felt green primary #0f766e, logo yellow/red accents, warm cream bg), Be Vietnam Pro on web, header active state + drawn menu icon, focus-visible/cursor/reduced-motion CSS, home redesign (eyebrow, 1 primary CTA, shortcuts, upcoming Kèo, The Gang tool), transparent hero (ChatGPT edit), branded café cover fallback | `src/ui/theme.ts`, `src/ui/web-fonts.ts`, `src/ui/site-header.tsx`, `src/app/index.tsx`, `src/features/cafes/cafe-header.tsx`, `public/brand/hero-illustration.webp` |
| 6. Browser test 375px + desktop | lead | Done for prod build behind local Caddy: home, ☰ menu, Kèo detail with Tính điểm/Rút nhiệm vụ, table result, map, legacy redirects, 404 for missing bundles; agents checked their own pages | Untested: most write flows (signup/reset, RSVP/create/edit Kèo, uploads, camera scan, invites) |

## URL contract (must stay identical)

`/login`, `/signup`, `/forgot-password`, `/reset-password`, `/check-email`, `/account`, `/u/:username`, `/invite/:code`, `/clubs`, `/clubs/new`, `/clubs/:slug`, `/clubs/:slug/manage`, `/clubs/join/:code`, `/events`, `/events/new`, `/events/mine`, `/events/:slug`, `/events/:slug/edit`, `/events/join/:code?slug=`, `/cafes`, `/cafes/:slug`, `/cafes/:slug/contribute`, `/my-cafes`, `/my-cafes/:id`, `/my-cafes/:id/{consent,import,scan}`, `/my-cafes/invite/:token`, `/map`, `/games`, `/games/:slug`, `/shelf`, `/friends`, `/credits`, `/data-sources`, `/developers`, `/admin/**`, `/claim/:token`.

## Known gaps (from agent reports)

- Suggest: sound web-only (native silent; needs expo-audio + native build); friends/city/café-contact buttons not browser-tested (dev data lacks friends, public city users, café links); no cover art in dev DB.

- Native-only: Google sign-in, QR, camera scan, uploads, map/pin editor are web-only (native gets text/list fallbacks); dates/dropdowns are text/inline lists.
- Admin scan: only GameUPC lookup + link; café-scoped "local"/"community" scan modes not ported.
- No OpenGraph/JSON-LD per page, no sitemap; `llms.txt` routes not ported.
- Café list keeps infinite scroll (web had pages) and does not write filters to the URL.
- Credits text copied from `docs/references.md` into `src/features/static/references.ts`.
- Local dev DB only: category "Card Game / Thẻ bài" was deleted and re-created by an agent test (new id, game links lost).

## Verification (2026-10-02 21:00)

Repo-wide `lint`, `typecheck`, `test` green (shared 676, api 381, web 82, mobile 111), `prettier --check` clean, `export:web` 4.3 MB; Caddyfile validated.

## Features inspired by boardgamewikia.com (2026-10-02 22:00)

Sources: owner-shared BGW Facebook post (Tủ game) and https://boardgamewikia.com/vi/suggest (Mở hộp). Contract in `packages/shared/src/shelf.ts`; dev DB backed up to `backups/dev-onboard-20261002-2207.dump` before migration.

| Item | Status |
| --- | --- |
| The Gang: language toggle relabelled "Ngôn ngữ nội dung thẻ" (chips, not page tabs) | Done (uncommitted) |
| Tủ game: condition / sleeve / box protection / edition, list+grid, column picker, "Lần chơi cuối" + stale dot | Done (uncommitted); migration `0023_shelf_wishlist` applied to dev DB |
| Danh sách Muốn chơi (`user_wishlist`, `/api/me/wishlist`) + toggle on game page | Done (uncommitted) |
| Mở hộp – Hôm nay chơi gì (`/api/suggest`, `/suggest` reel + rarity tiers by café count) | Done (uncommitted); gaps: no café source in UI, "Tạo Kèo với game này" opens plain `/events/new` (form has no game param), public profile shelf `lastPlayedAt` always null |
| Mở hộp redesign: owner rejected preset-box grid; picked card draw (demo `gacha-demo/index.html`) | Decided |
| `/suggest` rewrite to the approved demo: source (Tủ game, Muốn chơi, Quán, Tỉnh/thành, Toàn quốc) + players → TRÁO BÀI/TRÁO LẠI → shuffle → poker deal (burn·flop 3·burn·turn·burn·river) → pick → suspense shake (length of suspense sound) → flip + rarity burst → others flip dimmed → result bottom sheet (modal ≥700px); real sounds from `public/sfx/`, on by default, mute remembered; "Trong chồng có gì?" preview; old preset/reel code removed | Done (uncommitted, 2026-10-02 23:20): `src/app/suggest.tsx`, `src/features/suggest/{sources,deal,sfx,play-card,card-table,rarity-burst,result-sheet,pool-preview}.ts(x)`; browser-checked desktop + 375px on dev data; gaps: sound web-only (native silent), dev DB has 3 games and no covers so cover art untested locally, sheet actions are the old ones (Tạo Kèo opens plain `/events/new`, Xem game, Muốn chơi) |
| New sources (Club, Nhóm bạn, Cùng thành phố) + post-pick actions per source + café phone + profile province + `?game=` on Kèo form | Done (uncommitted, 2026-10-03 00:00): migration `0024_suggest_sources` (users.province_code, users.club_shelf_suggest; dev DB backup `backups/dev-onboard-20261002-2338.dump`), `/api/suggest` sources club/friends/city with owners/ownerCount, `/me` + `/me/privacy` fields; café phone stored in `links.phone` (no migration); account province picker + club switch; café phone in owner/admin forms + tel link on café page; `/events/new?game=` prefills first table; result sheet actions per source group; "Tỉnh/thành" chip replaced by "Cùng thành phố" (API `province` source kept). Repo-wide lint/typecheck/test green (shared 676, api 404, web 82, mobile 129), prettier clean. Browser-checked: club draw + sheet, account fields. Reports in `plans/reports/fullstack-developer-261002-2340-*.md` |
| Home sections ("Dành cho người mới", "Thuần Việt/Việt hoá", "Nhiều quán có nhất") | Done (2026-10-03 00:10): `GET /api/games` gained `isVietnamese` and `sort=cafes` (only games in ≥1 public café); `features/games/game-rail.tsx`; empty sections hide; "Tất cả game" links to plain `/games` (page has no URL filters yet) |

### Owner notes for the picker (2026-10-02 22:30)

- Keep: 5 rarity tiers, "Trong chồng có gì?" pool preview, sound (with toggle). Drop level/EXP.
- Card front must show the game cover.
- Sources that matter: a café's inventory, a club's games, a friend group's shelves, my shelf, people/cafés in the same city — not mainly nationwide.
- Next step depends on source: personal/friend source → find who owns it, create a Kèo and optionally pick a café; café source → create a Kèo at that café, plus contact/booking (reserve table + game) so the game is guaranteed available.

### Owner decisions for the picker (2026-10-02 22:50)

- Style: card draw. Flow: choose source (+ players) first → shuffle → poker-style deal in a straight row (burn 1, flop 3, burn 1, turn, burn 1, river = 5 distinct games face down) → user taps 1 → suspense ticks (CS case style, longer for rarer) → flip with rarity burst → other 4 flip face-up dimmed. "Tráo lại" button. Demo: scratchpad `gacha-demo/v3.html`.
- Sound: synthesized (riffle, deal, burn, accelerating ticks, rarity chord), toggle on page.
- Sources this batch: my shelf, café inventory, same city (cafés + players with public shelves), club (members' shelves), friends (all friends' shelves until groups exist) — needs new API for club/friends/city-players with privacy respected, plus "who owns it".
- After pick: café → Tạo Kèo tại quán + show café social/contact links (Zalo, fanpage, phone); in-app booking later. Personal/club/friends → Rủ chơi / Tạo Kèo + pick a café.

### Sounds chosen by owner (2026-10-02 23:00)

Real recordings, sound on by default (small mute toggle). Files converted to mp3 in scratchpad `gacha-demo/sfx/chosen/` (demo `gacha-demo/v5.html`); copy to `apps/mobile/public/sfx/` when implementing.

| Event | File | Source / license |
| --- | --- | --- |
| Xào bài | card-fan-1 | Kenney Casino Audio, CC0 |
| Chia lá | card-slide-5 | Kenney Casino Audio, CC0 |
| Huỷ lá | card-shove-1 | Kenney Casino Audio, CC0 |
| Hồi hộp trước khi lật | lootbox-open (2.6 s) | Pixabay (freesound_community "Loot box open"), Pixabay License |
| Lật thẻ | cards-pack-open-1 | Kenney Casino Audio, CC0 |
| Lộ kết quả | reveal-levelup (3.3 s) | Pixabay (tithuh "Level up!"), Pixabay License |

UI decisions: single "TRÁO BÀI" button that becomes "TRÁO LẠI"; result shown as a bottom sheet (modal on desktop) with a full-width primary CTA, secondary grid and "TRÁO LẠI".

### Owner decisions for sources and actions (2026-10-02 23:30)

- Club source: members' shelves; new account toggle "Cho thành viên club rút từ tủ game của tôi", default ON.
- Friends source: all friends whose profile visibility lets friends see it (public/friends); no new toggle.
- Same city: new optional profile field Tỉnh/thành; players count only if they set it and their profile is public; plus cafés in that province.
- Café phone: new optional field + "Gọi quán" button.
- Actions after pick: café → "Tạo Kèo tại quán này" (`/events/new?cafe=&game=`) + Nhắn Zalo / Fanpage / Chỉ đường / Gọi quán (only links the café has) + Xem game + Muốn chơi; my shelf / club / friends → "Rủ chơi · Tạo Kèo" (`?game=`, plus `?club=` for club) + "Quán có game này" + Xem game + Muốn chơi; province / nationwide / city → "Xem quán & người có game" + Tạo Kèo + Muốn chơi.
- Do it all in one batch.

### Fixes before deploy (2026-10-03 00:10)

- Club source now excludes users blocked either way.
- Admin café edit keeps stored links it does not edit (zalo, instagram, tiktok, website).
- Docs: architecture (Expo is the site, `/suggest` rules), deployment diagram, references (sound credits, also on `/credits`).
- Repo-wide lint/typecheck/test green (shared 676, api 406, web 82, mobile 130), prettier clean, `export:web` 4.7 MB.

### Owner changes (2026-10-03 11:10)

- `/suggest`: no "Toàn quốc" chip; default source "Cùng thành phố" with province from saved choice → profile → browser location (nearest capital, owner kept this over polygon lookup); choice remembered in localStorage.
- Header: "Địa điểm chơi" removed, "Bản đồ" kept; `/cafes` redirects to `/map` (legacy `tinh` → `province`), `/cafes/:slug` unchanged; home shortcut points to `/map`. Map list view (sidebar on desktop, "Xem danh sách" on phone) now uses `GET /api/cafes` so cafés without a pin still show; with a game filter it falls back to the pin list (café list API has no game filter).
