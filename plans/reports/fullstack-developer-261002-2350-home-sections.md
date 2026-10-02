# Home game sections

Status: DONE_WITH_CONCERNS

## Changes
- packages/shared/src/cafes.ts: export `boolQueryParam`.
- packages/shared/src/games.ts: `gameFilterSchema` + `isVietnamese` (bool query), `sort` enum `name|cafes` (default `name`).
- apps/api/src/modules/games/repo.ts: isVietnamese condition; `sort=cafes` orders by correlated count of public cafes (`publicCafeWhere`), tie-break nameEn.
- apps/api/src/modules/games/games.test.ts: isVietnamese filter + 422 on bad value; sort=cafes (pending cafe ignored) + 422 on bad sort.
- apps/mobile/src/features/games/game-rail.tsx (new): horizontal compact cards (cover via mediaUrl, name, summaryMeta, link /games/[slug]; letter placeholder when no cover).
- apps/mobile/src/app/index.tsx: `GameSection` x3 (maxWeight 2+maxTime 60 / isVietnamese=true / sort=cafes, pageSize 10), hidden when empty/error, placed after "Bắt đầu từ đâu?".

## Verify
shared build+test, api lint/typecheck/test (406), mobile lint/typecheck/test (130), prettier --check: all pass.

## Concerns
- /games does not read query params, so "Xem tất cả" links to plain /games.
- API on :8787 not restarted: until restart, unknown params are stripped, so all 3 sections show the same unfiltered games. Not browser-checked for that reason.
- sort=cafes includes games with 0 cafes (at the tail); "Nhiều quán có nhất" may list such games when few have cafes.
