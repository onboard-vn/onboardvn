---
phase: 5
title: "Club"
status: pending
effort: "3.5d"
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
- **Mở rộng `canView`** (apps/api/src/lib/visibility.ts:9-22): `ViewerRelation` thêm `isClubMember?` — **chỉ** dùng cho tài nguyên có visibility `club` (Kèo `club`, club private). Không đổi ý nghĩa `public|friends|private` của privacy user: cùng club **không** mở `friends`/`private`. Tên/stat thành viên không đủ quyền → "Người chơi ẩn danh" (vẫn cộng vào tổng); tổng là số, không lộ danh tính.
- `visibleMeetupsWhere(viewer)` (phase 6) thêm nhánh `visibility='club' AND viewer ∈ club_members` → calendar/list/feed club tự áp cùng quy tắc.
- Ghi ván / tạo Kèo: chọn club mình là thành viên; gợi ý người chơi từ thành viên club.
- Kèo `visibility=club`: chỉ thành viên club thấy/RSVP.
- Feed: "X tham gia club Y".

## Data
- `clubs(id, slug unique, name, description, provinceCode null, visibility, inviteCodeHash unique (sha256, code thô trả 1 lần khi tạo/rotate), createdBy → users set null, createdAt, updatedAt)`.
- **Xóa user**: `club_members` cascade; nếu là owner duy nhất → tự nâng admin lâu nhất, không có thì member lâu nhất; club không còn ai → xóa club (trong transaction xóa user, hook `beforeDelete` Better Auth).
- `club_members(clubId, userId, role, joinedAt)` PK(clubId,userId), index userId.
- `plays` + `clubId null → clubs set null`. **Rule backfill/derive**: ván có `meetupId` → `clubId` luôn lấy từ `meetups.clubId` phía server (client gửi khác → 422); migration chạy `UPDATE plays SET club_id = m.club_id FROM meetups m WHERE plays.meetup_id = m.id AND plays.club_id IS NULL` (no-op lúc tạo cột, giữ để idempotent); không cho đổi `meetups.clubId` khi Kèo đã có ván.
- `meetups` + `clubId null → clubs set null` (club bị xóa → Kèo `club` đổi `private` cùng transaction), enum visibility + `club`, CHECK `visibility<>'club' OR clubId IS NOT NULL`; index `meetups(clubId, startsAt)`.

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
- Test: cùng club nhưng user `playsVisibility=friends` → vẫn ẩn danh với member không phải bạn; calendar club với non-member → không đếm Kèo `club`; ván từ Kèo club → `clubId` tự set, gửi club khác → 422; owner duy nhất xóa tài khoản → admin lâu nhất thành owner; code club không lưu thô; private club ẩn thành viên với người ngoài; join bằng code; non-admin thêm thành viên → 403; owner duy nhất rời → 422; gắn ván/Kèo vào club không phải thành viên → 422; Kèo `club` với non-member → 404; totals = SUM members; hosted chỉ đếm Kèo club; member `private` → ẩn danh nhưng tính tổng; kho club `nextBroughtOn` chỉ Kèo tương lai của club; calendar club không đếm Kèo ngoài club; bảng nội bộ đúng.

## Risks
- Spam tạo club (L×M) → rate limit 5 club/ngày/user.
- Kho club chậm với club lớn (65 member × ~100 game) (L×M) → phân trang + index `user_games(gameId)` có sẵn (shelf.ts:19).
- Global admin/maintainer **không** tự có quyền trong club trên UI công khai; gỡ club qua `/admin/clubs`.
- Rollback: drop cột `clubId` ở `plays`/`meetups` (đổi Kèo `club` → `private` trước), bảng clubs.
