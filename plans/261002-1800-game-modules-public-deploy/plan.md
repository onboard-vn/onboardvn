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

## Decisions

- Build inside the Expo app (not frozen `apps/web`); web first, Android later from the same code.
- Card data (official 20 cards + 110 BGG homebrew, reviewed VI) is committed; owner accepts going public gradually.
- Cloudflare Tunnel runs as a compose container (no sudo on VPS); tunnel is dashboard-managed.
- `@`/`ftp` records are DNS-only so MX/FTP keep working; Tino shared hosting still serves the root site.

## Risks

- Auth accepts one origin: after the switch, the `*.ts.net` URL cannot sign in.
- Public exposure of club data (member names) once the hostname is live — owner chose to proceed.
- Changing DNS from an agent session may be blocked by the permission classifier; owner clicks those steps.
