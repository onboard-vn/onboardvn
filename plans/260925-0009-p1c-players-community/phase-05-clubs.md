---
phase: 5
title: "Club"
status: pending
effort: "2d"
dependencies: [1, 3]
---
# Phase 5: Club

## Context
- Club = nhóm chơi có thành viên. Tái dùng pattern token mời của phase 1, visibility helper, FriendPicker.
- Ván có thể gắn club (`plays.clubId` nullable) → thống kê nội bộ.

## Requirements
- Tạo club: tên, slug, mô tả, tỉnh (tùy chọn), `visibility public|private`. Không có quán "nhà" (đã chốt).
- Vai trò trong club: `owner|admin|member`. Owner chuyển quyền được; không thể rời nếu là owner duy nhất.
- Tham gia: public → bấm "Tham gia"; private → qua link mời (token club) hoặc được admin club mời bạn bè (vào thẳng, có thể rời).
- Trang club `/clubs/[slug]`: thành viên, ván gần đây, bảng nội bộ (ván/thắng theo thành viên), sự kiện (phase 6). Private club: người ngoài chỉ thấy tên + số thành viên.
- Khi ghi ván: chọn club mình là thành viên; người chơi gợi ý từ thành viên club (vẫn cho gắn bạn bè).
- Feed: "X tham gia club Y".

## Data
- `clubs(id, slug unique, name, description, provinceCode null, visibility, inviteCode unique, createdBy, createdAt, updatedAt)`.
- `club_members(clubId, userId, role, joinedAt)` PK(clubId,userId), index userId.
- `plays` thêm `clubId uuid null references clubs on delete set null`.

## Files
- Create: `apps/api/src/db/schema/clubs.ts`, `apps/api/src/modules/clubs/{routes,service,repo,clubs.test}.ts`, `packages/shared/src/clubs.ts`, `apps/web/app/clubs/{page.tsx,moi/page.tsx,[slug]/page.tsx,[slug]/quan-ly/page.tsx}`, `apps/web/app/clubs/tham-gia/[code]/page.tsx`.
- Modify: `apps/api/src/db/schema/plays.ts` (clubId), `apps/api/src/modules/plays/service.ts` (validate member), `apps/web/components/play-form.tsx`, `apps/api/src/modules/profiles/repo.ts` (nhánh feed), đăng ký.

## API
- `GET /clubs?provinceCode=&q=` (chỉ public), `POST /clubs`, `GET /clubs/:slug`, `PATCH /clubs/:id` (owner/admin club), `DELETE /clubs/:id` (owner).
- `POST /clubs/:id/join`, `POST /clubs/join/:code`, `DELETE /clubs/:id/members/me`, `POST /clubs/:id/members {userId}` (admin club, chỉ bạn của mình), `DELETE /clubs/:id/members/:userId`, `PATCH .../:userId {role}`, `POST /clubs/:id/invite-code/rotate`.
- Middleware `requireClubRole(...roles)` (per-club, cùng tinh thần `requireCafeRole` ở phase 7).

## Steps
1. Schema + migration (gồm cột `plays.clubId`). 2. Module + middleware + tests. 3. Plays tích hợp. 4. Web pages. 5. Feed branch.

## Validation
- Test: private club ẩn thành viên với người ngoài; join bằng code; non-admin thêm thành viên → 403; owner duy nhất rời → 422; gắn ván vào club không phải thành viên → 422; bảng nội bộ đúng.

## Risks
- Spam tạo club (L×M) → rate limit 5 club/ngày/user.
- Global admin/maintainer **không** tự có quyền trong club trên UI công khai; gỡ club vi phạm qua `/admin` (thêm màn đơn giản `apps/web/app/admin/clubs/page.tsx`).
- Rollback: drop cột `plays.clubId`, bảng clubs.
