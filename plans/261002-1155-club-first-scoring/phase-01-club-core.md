---
phase: 1
title: "Club core"
status: pending
effort: "3d"
dependencies: []
---
# Phase 1: Club core

## Context
- Thiết kế gốc: [P1c phase-05](../260925-0009-p1c-players-community/phase-05-clubs.md) (Data, API, role, xóa user). Phase này làm **phần lõi**; tab thống kê/kho/bảng nội bộ ở phase 5 (cần `plays`).
- `meetups.visibility` hiện `public|friends|private` (apps/api/src/db/schema/meetups.ts:35). `visibleMeetupsWhere` (apps/api/src/modules/events/repo.ts:84-97) chưa có nhánh club. `canView` (apps/api/src/lib/visibility.ts:16-22).
- Middleware `requireUser` (apps/api/src/auth/middleware.ts:15), rate limit theo user (apps/api/src/lib/user-rate-limit.ts:14).
- Token mời Kèo lưu hash: tham chiếu `rotateInviteCodeService` (apps/api/src/modules/events/service.ts:434).

## Requirements
- Club: tên, slug, mô tả, tỉnh tùy chọn, `visibility public|private` **mặc định `private`**.
- Role `owner|admin|member`; owner chuyển quyền; owner duy nhất không rời được (422).
- Tham gia: private → invite code (hash sha256, code thô trả 1 lần khi tạo/rotate) hoặc admin club thêm bạn bè; public → nút Tham gia.
- Kèo: thêm `meetups.clubId` + visibility `club`; CHECK `visibility<>'club' OR club_id IS NOT NULL`; tạo Kèo `club` chỉ khi là member.
- `visibleMeetupsWhere` thêm nhánh `visibility='club' AND viewer ∈ club_members`. `canView` không đổi nghĩa `friends/private` (cùng club không mở privacy user).
- Xóa user: owner duy nhất → nâng admin lâu nhất → member lâu nhất → club rỗng thì xóa, Kèo `club` đổi `private` cùng transaction.
- Rate limit 5 club/ngày/user. Global admin quản lý qua `/admin/clubs` (không tự có quyền trong club).
- Cột `external_source text null, external_id text null`, UNIQUE(external_source, external_id) trên `clubs` để phase 7 dùng (tránh migration sau).

## Data flow
Client → `POST /clubs` (Zod `clubCreateSchema`) → service (rate limit, slug unique, sinh code) → repo insert `clubs` + `club_members(owner)` trong 1 tx → DTO (không lộ hash). Join: code → sha256 → lookup → insert member (idempotent).

## Files
- Create: `apps/api/src/db/schema/clubs.ts`, `apps/api/src/modules/clubs/{routes,service,repo,clubs.test}.ts`, `apps/api/src/auth/club-role.ts` (`requireClubRole`), `packages/shared/src/clubs.ts`, `apps/web/app/clubs/{page.tsx,new/page.tsx,[slug]/page.tsx,[slug]/manage/page.tsx,join/[code]/page.tsx}`, `apps/web/app/admin/clubs/page.tsx`.
- Modify: `apps/api/src/db/schema/meetups.ts` (clubId, enum), `apps/api/src/modules/events/{repo,service}.ts` (nhánh club, validate member), `apps/web/app/events/new/page.tsx` (chọn club), `apps/api/src/auth/better-auth.ts` (hook xóa user), đăng ký shared files.

## API
Như P1c phase-05 mục API, trừ `/members` stats và `/games` (phase 5). `GET /clubs/:slug` trả `{club, myRole?, memberCount, members?}` (members chỉ cho member).

## Steps
0. Backup DB dev (`pg_dump -Fc`). 1. Schema + migration. 2. Repo/service/routes + `requireClubRole`. 3. Events: enum + nhánh visibility + validate. 4. Hook xóa user. 5. Web pages (list mine, tạo, chi tiết, manage, join). 6. Admin list/xóa club.

## Validation
- Test: non-member xem club private → chỉ tên + count; join code sai → 404, đúng → member; code DB ≠ code thô; non-admin thêm member → 403; owner duy nhất rời → 422; Kèo `club` non-member → 404 và không đếm trên calendar; member `playsVisibility=friends` không bị lộ cho member không phải bạn; xóa owner → chuyển quyền đúng thứ tự; rate limit 6 club/ngày → 429.
- `pnpm -r typecheck && pnpm --filter api test`.

## Risks
| Risk | L×I | Mitigation |
|---|---|---|
| Nhánh visibility club lộ Kèo cho người ngoài | M×H | test calendar/list/detail cho non-member; một hàm `visibleMeetupsWhere` duy nhất |
| Enum migration làm hỏng Kèo cũ | L×M | chỉ thêm giá trị; CHECK chỉ chặn `club` thiếu clubId |

## Rollback
Đổi Kèo `club` → `private`, drop `meetups.club_id`, revert enum, drop `club_members`, `clubs`. Restore dump nếu lỗi dữ liệu.

## Open questions
- Club `public` có cần UI ngay không (mặc định private, giữ enum)?
