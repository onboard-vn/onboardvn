---
phase: 6
title: "Kèo: session → nhiều bàn (lõi Kèo)"
status: completed
effort: "4d"
dependencies: [1, 2]
---
# Phase 6: Kèo — session → nhiều bàn

## Context
- **Đã chốt: sự kiện = Kèo** (1 tính năng, roadmap không còn giai đoạn Kèo riêng). **Model (chốt 2026-09-25)**: 1 Kèo = 1 **session** (ngày, địa điểm) chứa **1..n bàn**; mỗi bàn có host, game, ghế, người ngồi, người mang game (tham chiếu app club ngoài, xem [report](../reports/planner-260925-1407-club-app-reference-integration.md)).
- Chạy **trước phase 3, 5** theo thứ tự thực thi (plan.md) → phase này **không** tạo `clubId`, visibility `club`, `plays.meetupId`; phase 5 và 3 thêm sau.
- Tái dùng: `canView`/`areFriends` (apps/api/src/lib/visibility.ts:16), `user_games` PK(userId,gameId) (apps/api/src/db/schema/shelf.ts:5-20), filter tỉnh/xã `apps/web/app/cafes/cafe-filters.tsx`. Địa bàn 2 cấp tỉnh → xã (docs/architecture.md, mục Admin units).

## Requirements
- **Session**: tiêu đề, mô tả, `startsAt` (+ `endsAt` tùy chọn), địa điểm = quán (`cafeId`, quán không `pending`) **hoặc** địa chỉ tự do + tỉnh/xã, `capacity` tùy chọn (tổng người `going`).
- `visibility`: `public` (**mặc định**, chốt 2026-09-25; liệt kê + lọc tỉnh/xã) | `friends` (bạn người tạo) | `private` (chỉ ai có link mời); `club` thêm ở phase 5.
- **Quyền xem (1 predicate dùng chung)**: `canViewMeetup(meetup, viewer)` + bản SQL `visibleMeetupsWhere(viewer)` dùng cho list, detail, calendar, feed, `/me/events`, sitemap. Creator + mọi participant (kể cả `invited`) luôn thấy; `friends` = bạn của creator (dùng `areFriends`, chặn `userBlocks`); `private` = creator/participant, hoặc detail có `?code=` hợp lệ (code **không** mở calendar/list). Người xem bị creator chặn → 404.
- **Bàn (table)**: 1..n / session. Mỗi bàn: host (user), game tùy chọn, `seats` tùy chọn (2-20, **tính cả host**: bàn 4 ghế = host + 3), người mang game tùy chọn, ghi chú. Người tạo session hoặc participant `going` tạo bàn → tự thành host và ngồi bàn đó. Host sửa/xóa bàn mình; người tạo session sửa/xóa mọi bàn. Xóa bàn → người ngồi về "chưa chọn bàn".
- **Mang game từ tủ**: chọn game → nếu `broughtByUserId` set thì `(broughtByUserId, gameId)` phải có trong `user_games` lúc ghi (validate, không FK). Chỉ chính user hoặc host bàn (chọn từ tủ của người ngồi bàn) gán. Game bị gỡ khỏi tủ sau đó → bàn giữ nguyên (snapshot).
- **RSVP ở session**: `going|maybe|declined`; `capacity` đếm mọi `going` **kể cả host các bàn và creator nếu going**; hết chỗ → `waitlist` **FIFO** theo `(waitlistedAt, userId)`: có chỗ trống (rời/declined/tăng capacity) → tự đẩy người đầu hàng lên `going` trong cùng transaction; người tạo mời bạn bè → `invited`. **Chọn bàn tùy chọn** chỉ khi `going`; bàn đầy `seats` → 409. Rời session → rời bàn.
- **Calendar tháng**: `/events?view=calendar` — mỗi ngày (Asia/Saigon): `players` = số user distinct `going` (host đã là `going`), `tables` = số bàn; aggregate chạy **trên `visibleMeetupsWhere(viewer)`** (không đếm rồi mới lọc), bỏ `cancelled`; `meetupIds` chỉ gồm session viewer thấy. Component dùng lại cho club (phase 5).
- Link mời có token → chia sẻ Zalo (share + Open Graph). Hủy session (`status=cancelled`), người tham gia thấy trạng thái.
- Feed "X sẽ tham gia Kèo Y" → thêm nhánh ở phase 4 (chạy sau), theo visibility session.
- "Ghi ván từ Kèo" (prefill người ngồi cùng bàn, `plays.meetupId`, `plays.meetupTableId`) → làm ở phase 3.

## Data
- `meetups(id uuid, slug unique, title, description null, startsAt timestamptz, endsAt null, cafeId null, addressLine null, provinceCode, wardCode null, capacity smallint null, visibility default 'public', inviteCodeHash unique (sha256), status 'scheduled'|'cancelled', createdBy → users **cascade**, createdAt, updatedAt)`; CHECK `cafeId` hoặc `addressLine`; index (provinceCode, startsAt), (startsAt).
- `meetup_tables(id uuid, meetupId cascade, hostUserId → users **cascade**, gameId null → games set null, seats smallint null CHECK 2..20, broughtByUserId null → users set null, note null, position smallint, createdAt)`; index (meetupId), (hostUserId), (broughtByUserId).
- `meetup_participants(meetupId cascade, userId cascade, status 'going'|'maybe'|'declined'|'waitlist'|'invited', tableId null → meetup_tables set null, waitlistedAt null, respondedAt)` PK(meetupId,userId); index (userId), (tableId).
- Giới hạn 1-30 bàn/session. Thời gian lưu UTC, hiển thị Asia/Saigon.
- **Xóa user (chốt)**: xóa Kèo họ tạo (cascade → bàn, participant; `plays.meetupId/meetupTableId` → null, ván còn); xóa bàn họ host (người ngồi → `tableId=null`); `broughtByUserId` → null; dòng participant của họ xóa → đẩy waitlist.
- **Token mời hash**: chỉ lưu `inviteCodeHash`; code thô trả 1 lần khi tạo/rotate; "copy lại link" = rotate (link cũ chết). Bảng đặt tên `meetups*` vì export `sessions` đã là bảng Better Auth (apps/api/src/db/schema/auth.ts:42); "session" chỉ là thuật ngữ nghiệp vụ.

## Data flow
Form tạo → `POST /events` (session + bàn đầu tuỳ chọn, 1 transaction) → người khác mở `/events/[slug]` (`canView` + code) → `POST /events/:id/rsvp` (lock session, đếm capacity) → `POST /events/:id/tables/:tableId/seat` (lock bàn, đếm seats) → calendar/stats đọc aggregate (không bảng thống kê).

## Files
- Create: `apps/api/src/db/schema/meetups.ts`, `apps/api/src/modules/events/{routes,service,repo,events.test}.ts`, `packages/shared/src/events.ts`.
- Create web: `apps/web/app/events/{page.tsx,new/page.tsx,[slug]/page.tsx,[slug]/edit/page.tsx}`, `apps/web/app/events/join/[code]/page.tsx`, `apps/web/components/{session-calendar,session-table-card,shelf-game-picker}.tsx`.
- Modify: đăng ký schema/route/shared; `apps/web/app/sitemap.ts` (session public sắp tới).

## API
- `GET /events?provinceCode=&wardCode=&from=&cafeId=` (public sắp tới), `GET /events/calendar?month=YYYY-MM` → `[{date, players, tables, meetupIds}]`, `GET /me/events`.
- `POST /events` (→ `{..., inviteUrl}` 1 lần), `GET /events/:slug` (`?code=` cho private), `PATCH/DELETE /events/:id` (creator), `POST /events/:id/invite {userIds}` (chỉ bạn bè), `POST /events/:id/invite-code/rotate`.
- `POST /events/:id/rsvp {status, tableId?, code?}`.
- `POST /events/:id/tables`, `PATCH/DELETE /events/:id/tables/:tableId` (host|creator), `POST/DELETE /events/:id/tables/:tableId/seat` (chính mình).
- RSVP: transaction + `SELECT ... FOR UPDATE` session; chọn bàn: `FOR UPDATE` bàn.

## Steps
1. Schema + migration. 2. Service visibility (`canView` + code). 3. RSVP/capacity + bàn/seats + validate brought-from-shelf. 4. Calendar aggregate (GROUP BY ngày theo `AT TIME ZONE 'Asia/Saigon'`). 5. Web list/calendar/chi tiết (danh sách bàn)/form/share.

## Validation
- Test: mặc định tạo → `public`; private không code → 404; code đúng → detail 200 nhưng không hiện trong calendar/list của người đó; người bị creator chặn → 404; capacity 2, người thứ 3, 4 → waitlist, người going rời → người thứ 3 (không phải 4) lên going; host tính vào seats (bàn 2 ghế: host + 1, người thứ 2 → 409); xóa user host → bàn mất, người ngồi `tableId=null`; DB không có code thô; RSVP đồng thời không vượt capacity; bàn 4 ghế, người thứ 5 → 409; ngồi bàn khi `maybe` → 422; mang game không có trong tủ → 422; xóa bàn → người ngồi `tableId=null`; host A sửa bàn của B → 403; cancelled xem được, không RSVP/tạo bàn; calendar: 2 session cùng ngày (3 bàn, 7 người distinct) → `{players:7, tables:3}`, session `friends` không đếm với người lạ; list public chỉ trả public tương lai; DTO không có email.
- E2E headless: tạo Kèo 2 bàn → user khác mở link → RSVP going + chọn bàn → calendar hiện ngày đó.

## Risks
- Race capacity/seats (M×M) → row lock + test đồng thời.
- Lộ session qua calendar (M×H) → calendar dùng cùng filter visibility với list; test.
- Spam Kèo public (M×M) → rate limit 10/ngày/user; admin gỡ qua `apps/web/app/admin/events/page.tsx`.
- Rollback: drop `meetup_participants`, `meetup_tables`, `meetups`; route/web mới gỡ độc lập (chưa phase nào phụ thuộc lúc chạy).
