---
phase: 5
title: "Club"
status: pending
effort: "3d"
dependencies: [1, 2, 3, 4, 6]
---
# Phase 5: Club

## Context
- Club = nhóm chơi có thành viên. Tái dùng token mời phase 1, `canView` (apps/api/src/lib/visibility.ts:16), FriendPicker, `memberStats()` phase 4, `session-calendar` phase 6.
- Chạy cuối track người chơi → thêm vào bảng đã có: `plays.clubId`, `meetups.clubId` + visibility `club`.
- Tham chiếu app club ngoài (Members/Games/calendar): [report](../reports/planner-260925-1407-club-app-reference-integration.md). Tích hợp với app đó = **P1d**, không làm ở đây.

## Requirements
- Tạo club: tên, slug, mô tả, tỉnh (tùy chọn), `visibility public|private`. Không có quán "nhà" (đã chốt).
- Vai trò: `owner|admin|member`. Owner chuyển quyền; owner duy nhất không rời được.
- Tham gia: public → "Tham gia"; private → link mời (token) hoặc admin club thêm bạn bè (vào thẳng, rời được).
- Trang `/clubs/[slug]` tab:
  - **Members**: tổng club `GAMES OWNED / TABLES HOSTED / GAMES BROUGHT` + mỗi thành viên "N owned · N hosted · N brought", tìm theo tên. **Scope**: `owned` = tủ toàn cục; `hosted/brought` chỉ đếm Kèo của club (`meetups.clubId`); tổng club = SUM các thành viên (giống app tham chiếu).
  - **Games** (kho club): union tủ thành viên, mỗi game: người sở hữu, ngày Kèo club sắp tới có người mang (`→ 2026-09-26`), số người muốn học + người dạy được (`user_game_interests`), `clubExp` = số ván của game có `plays.clubId=club`.
  - **Calendar**: tháng, mỗi ngày `players · tables` chỉ Kèo của club (tái dùng `GET /events/calendar?clubId=`).
  - **Kèo sắp tới**, ván gần đây, bảng nội bộ (ván/thắng theo thành viên).
  - Private club: người ngoài chỉ thấy tên + số thành viên.
- Tên/stat thành viên trong club vẫn theo privacy của từng người: thành viên club = viewer có quan hệ "club" nhưng **không** mở `private` (không đủ quyền → "Người chơi ẩn danh", vẫn cộng vào tổng).
- Ghi ván / tạo Kèo: chọn club mình là thành viên; gợi ý người chơi từ thành viên club.
- Kèo `visibility=club`: chỉ thành viên club thấy/RSVP.
- Feed: "X tham gia club Y".

## Data
- `clubs(id, slug unique, name, description, provinceCode null, visibility, inviteCode unique, createdBy, createdAt, updatedAt)`.
- `club_members(clubId, userId, role, joinedAt)` PK(clubId,userId), index userId.
- `plays` + `clubId null → clubs set null`; `meetups` + `clubId null → clubs set null`, enum visibility + `club`, CHECK `visibility<>'club' OR clubId IS NOT NULL`; index `meetups(clubId, startsAt)`.

## Files
- Create: `apps/api/src/db/schema/clubs.ts`, `apps/api/src/modules/clubs/{routes,service,repo,clubs.test}.ts`, `packages/shared/src/clubs.ts`, `apps/web/app/clubs/{page.tsx,new/page.tsx,[slug]/page.tsx,[slug]/manage/page.tsx}`, `apps/web/app/clubs/join/[code]/page.tsx`, `apps/web/app/admin/clubs/page.tsx`.
- Modify: `apps/api/src/db/schema/{plays,meetups}.ts` (clubId), `apps/api/src/modules/{plays,events}/service.ts` (validate member + visibility club), `apps/api/src/modules/events/repo.ts` (calendar `clubId`), `apps/web/components/play-form.tsx`, `apps/web/app/events/new/page.tsx` (chọn club), `apps/api/src/modules/profiles/repo.ts` (feed + `memberStats` scope club), đăng ký.

## API
- `GET /clubs?provinceCode=&q=` (public), `POST /clubs`, `GET /clubs/:slug`, `PATCH /clubs/:id` (owner/admin), `DELETE /clubs/:id` (owner).
- `GET /clubs/:slug/members?q=` → `{totals:{owned,hosted,brought}, members:[{userId?,username?,name,hidden?,owned,hosted,brought,role}]}`.
- `GET /clubs/:slug/games?cursor=` → `[{gameId,name,year,minPlayers,maxPlayers,owners[],nextBroughtOn[],learners,teachers[],clubExp}]`.
- `POST /clubs/:id/join`, `POST /clubs/join/:code`, `DELETE /clubs/:id/members/me`, `POST /clubs/:id/members {userId}` (admin, chỉ bạn), `DELETE /clubs/:id/members/:userId`, `PATCH .../:userId {role}`, `POST /clubs/:id/invite-code/rotate`.
- Middleware `requireClubRole(...roles)`.

## Steps
1. Schema + migration (clubs, `plays.clubId`, `meetups.clubId` + enum). 2. Module + middleware + tests. 3. Tích hợp plays + events (visibility `club`, calendar filter). 4. Members stats + kho club (tái dùng `memberStats`). 5. Web pages. 6. Feed branch.

## Validation
- Test: private club ẩn thành viên với người ngoài; join bằng code; non-admin thêm thành viên → 403; owner duy nhất rời → 422; gắn ván/Kèo vào club không phải thành viên → 422; Kèo `club` với non-member → 404; totals = SUM members; hosted chỉ đếm Kèo club; member `private` → ẩn danh nhưng tính tổng; kho club `nextBroughtOn` chỉ Kèo tương lai của club; calendar club không đếm Kèo ngoài club; bảng nội bộ đúng.

## Risks
- Spam tạo club (L×M) → rate limit 5 club/ngày/user.
- Kho club chậm với club lớn (65 member × ~100 game) (L×M) → phân trang + index `user_games(gameId)` có sẵn (shelf.ts:19).
- Global admin/maintainer **không** tự có quyền trong club trên UI công khai; gỡ club qua `/admin/clubs`.
- Rollback: drop cột `clubId` ở `plays`/`meetups` (đổi Kèo `club` → `private` trước), bảng clubs.
