---
phase: 5
title: "Club tabs + comment Kèo"
status: pending
effort: "3d"
dependencies: [4]
---
# Phase 5: Club tabs + comment Kèo

## Context
- Tab Members/Games/Calendar/bảng nội bộ: spec ở [P1c phase-05](../260925-0009-p1c-players-community/phase-05-clubs.md) mục Requirements + API (`/members` totals owned/hosted/brought, `/games` kho club, calendar `clubId`).
- Calendar hiện có `getCalendarService` (apps/api/src/modules/events/service.ts:536); tủ game `user_games` (apps/api/src/db/schema/shelf.ts).
- Comment trong Kèo: BGW mới thêm và được đánh giá hữu ích ([report FB/BGW](../reports/research-261002-1137-fb-posts-boardgamewikia.md)). App club ngoài có comment theo bàn.
- `user_game_interests` (muốn học/dạy) thuộc P1c phase 4 — **chưa có** → cột learners/teachers bỏ qua đến khi phase đó xong.

## Requirements
- `GET /clubs/:slug/members?q=` totals + per member (ẩn danh theo privacy, vẫn cộng tổng).
- `GET /clubs/:slug/games?cursor=` union tủ member (+ ownership ngoài sau phase 7): owners, `nextBroughtOn` (Kèo club tương lai), `clubExp` (số ván `plays.clubId`), `hasScoreTemplate`, `templateConfidence`. **Bộ lọc**: tái dùng `gameFilterSchema` mở rộng ở phase 3 (players + bestAt, weightBand, time, categories, mechanics, scoringFamily, hasScoreTemplate, templateConfidence) + `ownerId` (member hoặc external member) + `mine`; dùng chung `buildWhere` của games repo (không viết lại) và `game-filter-panel.tsx`.
- Calendar club: `GET /events/calendar?clubId=` (member).
- Bảng nội bộ: ván/thắng theo member trong club (tháng/tất cả).
- Comment Kèo: `meetup_comments(id, meetupId cascade, tableId null → meetup_tables cascade, authorId → users set null, body ≤1000, createdAt, editedAt, deletedAt)`. Chỉ người xem được Kèo (dùng `canViewMeetup`, service.ts:84) đọc/viết; tác giả sửa/xóa mềm; người tạo Kèo + global admin xóa. Rate limit 10/phút/user. Không realtime (refetch khi gửi).
- Feed "X tham gia club Y": bỏ nếu feed P1c phase 4 chưa có.

## Files
- Create: `apps/api/src/modules/clubs/stats-repo.ts` (gọi `buildWhere` từ games repo), `apps/api/src/modules/events/comments.ts` (+ test), `apps/web/components/{club-members-tab,club-games-tab,meetup-comments}.tsx`, `apps/web/app/clubs/[slug]/{members,games,calendar}/page.tsx`.
- Modify: `apps/api/src/db/schema/meetups.ts` (`meetupComments`), `apps/api/src/modules/clubs/routes.ts`, `apps/api/src/modules/events/{routes,repo}.ts`, `apps/web/app/events/[slug]/page.tsx`, `packages/shared/src/{clubs,events}.ts`.

## Steps
0. Backup DB. 1. Migration `meetup_comments`. 2. Comments service/routes + test. 3. Stats repo (SQL aggregate, index sẵn). 4. Routes club tabs. 5. Web tabs + comment UI.

## Validation
- Test: filter club shelf `owner=X&players=5&bestAt=true&scoringFamily=area-majority` đúng; owner không phải member → 422; totals = SUM members; hosted/brought chỉ Kèo club; member private → ẩn danh nhưng tính tổng; non-member → 404 với tabs; comment Kèo `club` non-member → 404; comment Kèo `friends` người lạ → 404; xóa mềm không trả body; rate limit 429.
- Hiệu năng: seed 70 member × 100 game → `/games` trang 1 < 300ms (EXPLAIN).

## Risks
| Risk | L×I | Mitigation |
|---|---|---|
| Aggregate chậm club lớn | M×M | phân trang, index `user_games(gameId)`, `plays(clubId, playedOn)` |
| Spam/abuse comment | M×M | rate limit, xóa bởi host/admin, `contributionBlockedAt` (auth.ts:38) chặn viết |

## Rollback
Drop `meetup_comments`; tabs chỉ đọc → revert code.
