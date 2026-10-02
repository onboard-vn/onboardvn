# Suggest sources API (club / friends / city) + user settings

Migration: apps/api/drizzle/0024_suggest_sources.sql (users.province_code FK provinces, users.club_shelf_suggest bool default true). Applied to dev DB.
Backup: backups/dev-onboard-20261002-2338.dump (pg_dump -Fc, taken before applying).

Files: db/schema/auth.ts, auth/better-auth.ts, test/fake-auth.ts, modules/me/routes.ts, modules/friends/{repo,service,friends.test}.ts, modules/suggest/{repo,service,suggest.test}.ts, drizzle journal/snapshot.
packages/shared: no changes.

Behavior:
- GET /api/me: provinceCode, clubShelfSuggest. PATCH /api/me/privacy persists both; unknown provinceCode -> 422.
- club: 401 anon, 422 no clubId, 403 non-member (also unknown club). Caller's own shelf always included.
- friends: 401 anon; friends with profile public/friends, block either direction excluded; own shelf included.
- city: 422 without provinceCode; public cafes of province UNION shelves of public-profile users in province (blocks excluded when logged in). cafeCount uses province counts.
- owners (max 5) / ownerCount exclude caller; omitted for other sources.

Tests: api 404 pass (39 files), shared 676 pass; lint, typecheck, prettier clean.

Notes/open: club source does not apply block checks (spec silent). Friend with 'friends' profile in city pool is not included (needs public), as specified. Dev API (:8787) needs restart.
