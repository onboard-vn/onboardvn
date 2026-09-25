---
phase: 6
title: "Kèo: session → nhiều bàn (lõi Kèo)"
status: pending
effort: "3.5d"
dependencies: [1, 2]
---
# Phase 6: Kèo — session → nhiều bàn

## Context
- **Đã chốt: sự kiện = Kèo** (1 tính năng, roadmap không còn giai đoạn Kèo riêng). **Model (chốt 2026-09-25)**: 1 Kèo = 1 **session** (ngày, địa điểm) chứa **1..n bàn**; mỗi bàn có host, game, ghế, người ngồi, người mang game (tham chiếu app club ngoài, xem [report](../reports/planner-260925-1407-club-app-reference-integration.md)).
- Chạy **trước phase 3, 5** theo thứ tự thực thi (plan.md) → phase này **không** tạo `clubId`, visibility `club`, `plays.meetupId`; phase 5 và 3 thêm sau.
- Tái dùng: `canView`/`areFriends` (apps/api/src/lib/visibility.ts:16), `user_games` PK(userId,gameId) (apps/api/src/db/schema/shelf.ts:5-20), filter tỉnh/xã `apps/web/app/cafes/cafe-filters.tsx`. Địa bàn 2 cấp tỉnh → xã (docs/architecture.md, mục Admin units).

## Requirements
- **Session**: tiêu đề, mô tả, `startsAt` (+ `endsAt` tùy chọn), địa điểm = quán (`cafeId`, quán không `pending`) **hoặc** địa chỉ tự do + tỉnh/xã, `capacity` tùy chọn (tổng người `going`).
- `visibility`: `public` (liệt kê + lọc tỉnh/xã) | `friends` (bạn người tạo) | `private` (chỉ ai có link mời); `club` thêm ở phase 5.
- **Bàn (table)**: 1..n / session. Mỗi bàn: host (user), game tùy chọn, `seats` tùy chọn (2-20), người mang game tùy chọn, ghi chú. Người tạo session hoặc participant `going` tạo bàn → tự thành host và ngồi bàn đó. Host sửa/xóa bàn mình; người tạo session sửa/xóa mọi bàn. Xóa bàn → người ngồi về "chưa chọn bàn".
- **Mang game từ tủ**: chọn game → nếu `broughtByUserId` set thì `(broughtByUserId, gameId)` phải có trong `user_games` lúc ghi (validate, không FK). Chỉ chính user hoặc host bàn (chọn từ tủ của người ngồi bàn) gán. Game bị gỡ khỏi tủ sau đó → bàn giữ nguyên (snapshot).
- **RSVP ở session**: `going|maybe|declined`; hết `capacity` → `waitlist`; người tạo mời bạn bè → `invited`. **Chọn bàn tùy chọn** chỉ khi `going`; bàn đầy `seats` → 409. Rời session → rời bàn.
- **Calendar tháng**: `/events?view=calendar` — mỗi ngày (Asia/Saigon): `players` = số user distinct `going` + host, `tables` = số bàn, chỉ đếm session viewer thấy được, bỏ `cancelled`. Component dùng lại cho club (phase 5).
- Link mời có token → chia sẻ Zalo (share + Open Graph). Hủy session (`status=cancelled`), người tham gia thấy trạng thái.
- Feed "X sẽ tham gia Kèo Y" → thêm nhánh ở phase 4 (chạy sau), theo visibility session.
- "Ghi ván từ Kèo" (prefill người ngồi cùng bàn, `plays.meetupId`, `plays.meetupTableId`) → làm ở phase 3.

## Data
- `meetups(id uuid, slug unique, title, description null, startsAt timestamptz, endsAt null, cafeId null, addressLine null, provinceCode, wardCode null, capacity smallint null, visibility default 'public', inviteCode unique, status 'scheduled'|'cancelled', createdBy, createdAt, updatedAt)`; CHECK `cafeId` hoặc `addressLine`; index (provinceCode, startsAt), (startsAt).
- `meetup_tables(id uuid, meetupId cascade, hostUserId, gameId null → games set null, seats smallint null CHECK 2..20, broughtByUserId null → users set null, note null, position smallint, createdAt)`; index (meetupId), (hostUserId), (broughtByUserId).
- `meetup_participants(meetupId cascade, userId cascade, status 'going'|'maybe'|'declined'|'waitlist'|'invited', tableId null → meetup_tables set null, respondedAt)` PK(meetupId,userId); index (userId), (tableId).
- Giới hạn 1-30 bàn/session. Thời gian lưu UTC, hiển thị Asia/Saigon. Bảng đặt tên `meetups*` vì export `sessions` đã là bảng Better Auth (apps/api/src/db/schema/auth.ts:42); "session" chỉ là thuật ngữ nghiệp vụ.

## Data flow
Form tạo → `POST /events` (session + bàn đầu tuỳ chọn, 1 transaction) → người khác mở `/events/[slug]` (`canView` + code) → `POST /events/:id/rsvp` (lock session, đếm capacity) → `POST /events/:id/tables/:tableId/seat` (lock bàn, đếm seats) → calendar/stats đọc aggregate (không bảng thống kê).

## Files
- Create: `apps/api/src/db/schema/meetups.ts`, `apps/api/src/modules/events/{routes,service,repo,events.test}.ts`, `packages/shared/src/events.ts`.
- Create web: `apps/web/app/events/{page.tsx,new/page.tsx,[slug]/page.tsx,[slug]/edit/page.tsx}`, `apps/web/app/events/join/[code]/page.tsx`, `apps/web/components/{session-calendar,session-table-card,shelf-game-picker}.tsx`.
- Modify: đăng ký schema/route/shared; `apps/web/app/sitemap.ts` (session public sắp tới).

## API
- `GET /events?provinceCode=&wardCode=&from=&cafeId=` (public sắp tới), `GET /events/calendar?month=YYYY-MM` → `[{date, players, tables, meetupIds}]`, `GET /me/events`.
- `POST /events`, `GET /events/:slug` (`?code=` cho private), `PATCH/DELETE /events/:id` (creator), `POST /events/:id/invite {userIds}` (chỉ bạn bè), `POST /events/:id/invite-code/rotate`.
- `POST /events/:id/rsvp {status, tableId?, code?}`.
- `POST /events/:id/tables`, `PATCH/DELETE /events/:id/tables/:tableId` (host|creator), `POST/DELETE /events/:id/tables/:tableId/seat` (chính mình).
- RSVP: transaction + `SELECT ... FOR UPDATE` session; chọn bàn: `FOR UPDATE` bàn.

## Steps
1. Schema + migration. 2. Service visibility (`canView` + code). 3. RSVP/capacity + bàn/seats + validate brought-from-shelf. 4. Calendar aggregate (GROUP BY ngày theo `AT TIME ZONE 'Asia/Saigon'`). 5. Web list/calendar/chi tiết (danh sách bàn)/form/share.

## Validation
- Test: private không code → 404; capacity 2, người thứ 3 → waitlist; RSVP đồng thời không vượt capacity; bàn 4 ghế, người thứ 5 → 409; ngồi bàn khi `maybe` → 422; mang game không có trong tủ → 422; xóa bàn → người ngồi `tableId=null`; host A sửa bàn của B → 403; cancelled xem được, không RSVP/tạo bàn; calendar: 2 session cùng ngày (3 bàn, 7 người distinct) → `{players:7, tables:3}`, session `friends` không đếm với người lạ; list public chỉ trả public tương lai; DTO không có email.
- E2E headless: tạo Kèo 2 bàn → user khác mở link → RSVP going + chọn bàn → calendar hiện ngày đó.

## Risks
- Race capacity/seats (M×M) → row lock + test đồng thời.
- Lộ session qua calendar (M×H) → calendar dùng cùng filter visibility với list; test.
- Spam Kèo public (M×M) → rate limit 10/ngày/user; admin gỡ qua `apps/web/app/admin/events/page.tsx`.
- Rollback: drop `meetup_participants`, `meetup_tables`, `meetups`; route/web mới gỡ độc lập (chưa phase nào phụ thuộc lúc chạy).
