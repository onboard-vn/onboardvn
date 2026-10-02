# Handoff — mainline consolidation (2026-10-02 18:15)

Supersedes [onboardvn-club-first-20261002-1625.md](onboardvn-club-first-20261002-1625.md) for branch state; its "Decided" and "Known issues" still apply.

## Branch state

All work is merged into `main` and pushed: `feat/club-first-scoring`, `wip/scoring-v4` (scoring v4 paused work) and `feat/mobile-game-modules`. Old branches are kept on origin for reference; start new work from `main`.

Verified before push: `pnpm format:check`, `lint`, `typecheck`, `test` (shared 676, api 377 on `onboard_test`, mobile 20) and `build` all green. Two golden scoring tests were updated to the audited minimal-input templates (brass, gaia); prettier now ignores generated files (score templates, drizzle meta, `.expo`).

## Active plan

[plans/261002-1800-game-modules-public-deploy/plan.md](../261002-1800-game-modules-public-deploy/plan.md) — status table lists exactly what is done and next.

## Next (in order)

Done at 18:20: tunnel Healthy, `https://onboard.j2teamnnl.com` live (`/`, `/health`, `/app/games`, auth session 200), auth origin switched, Email Routing catch-all active.

1. Owner smoke test: sign in on the public domain; send a mail to e.g. `test@j2teamnnl.com` and check Gmail.
2. Email Worker (optional): prefix the subject with the alias local part (`fb@` → `[fb] …`). Forwarding via `message.forward` cannot change the subject, so the Worker must send a new message to the verified Gmail destination (From = alias, Reply-To = original sender) and fall back to `message.forward` on error. Until then use Gmail filters `deliveredto:fb@j2teamnnl.com`.
3. Redeploy `/app` after mobile changes: `docs/deployment.md` → "App Expo ở `/app`".
4. Product next steps from the club-first handoff (wire Expo to the real API, port remaining pages, resume scoring after BG Stats research).

## Environment notes

- VPS checkout `~/Code/onboardvn` had `deploy/Caddyfile` and `compose.vps.yml` copied in by scp before this push; `git pull` brings the same content. `deploy/mobile-web/` there is synced build output (excluded via `.git/info/exclude` and `.gitignore`).
- Cloudflare account: J2teamnnl@gmail.com; zone `j2teamnnl.com` on Free plan; `@` and `ftp` A records DNS-only; MX/SPF/DKIM now managed by Email Routing (old Tino MX deleted). Public resolvers may serve the old `onboard` A record (Tino IP) until its TTL expires.
- Tino ticket #525433: ICANN verification not needed (Tino confirmed); nameserver change done.
