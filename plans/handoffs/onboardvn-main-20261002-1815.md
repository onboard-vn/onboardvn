# Handoff — mainline consolidation (2026-10-02 18:15)

Supersedes [onboardvn-club-first-20261002-1625.md](onboardvn-club-first-20261002-1625.md) for branch state; its "Decided" and "Known issues" still apply.

## Branch state

All work is merged into `main` and pushed: `feat/club-first-scoring`, `wip/scoring-v4` (scoring v4 paused work) and `feat/mobile-game-modules`. Old branches are kept on origin for reference; start new work from `main`.

Verified before push: `pnpm format:check`, `lint`, `typecheck`, `test` (shared 676, api 377 on `onboard_test`, mobile 20) and `build` all green. Two golden scoring tests were updated to the audited minimal-input templates (brass, gaia); prettier now ignores generated files (score templates, drizzle meta, `.expo`).

## Active plan

[plans/261002-1800-game-modules-public-deploy/plan.md](../261002-1800-game-modules-public-deploy/plan.md) — status table lists exactly what is done and next.

## Next (in order)

1. Owner: add `CLOUDFLARE_TUNNEL_TOKEN=<token>` to `~/Code/onboardvn/.env.prod` on `vps` (token from Cloudflare → Networking → Tunnels → `onboard`).
2. On `vps`: `git pull` (main), then `dc --profile tunnel up -d cloudflared`; wait for the tunnel to show Healthy; add Public hostname `onboard.j2teamnnl.com` → HTTP `caddy:8080`.
3. Switch `BETTER_AUTH_URL`/`WEB_ORIGIN` to `https://onboard.j2teamnnl.com`, `dc up -d api web`, smoke test `/`, `/health`, `/app/games`, sign-in.
4. Email Routing catch-all → `j2teamnnl@gmail.com`; then an Email Worker that prefixes the subject with the alias local part, with plain-forward fallback.
5. Redeploy `/app` after mobile changes: steps in `docs/deployment.md` → "App Expo ở `/app`".

## Environment notes

- VPS checkout `~/Code/onboardvn` had `deploy/Caddyfile` and `compose.vps.yml` copied in by scp before this push; `git pull` brings the same content. `deploy/mobile-web/` there is synced build output (excluded via `.git/info/exclude` and `.gitignore`).
- Cloudflare account: J2teamnnl@gmail.com; zone `j2teamnnl.com` on Free plan; `@` and `ftp` A records DNS-only (MX → `j2teamnnl.com`).
- Tino ticket #525433: ICANN verification not needed (Tino confirmed); nameserver change done.
