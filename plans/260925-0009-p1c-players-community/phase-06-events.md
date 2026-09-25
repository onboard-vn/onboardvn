---
phase: 6
title: "Sự kiện (lõi Kèo)"
status: pending
effort: "2.5d"
dependencies: [1, 5]
---
# Phase 6: Sự kiện (lõi Kèo)

## Context
- **Đã chốt: sự kiện = Kèo** (1 tính năng). Phase này là lõi Kèo của vision (public/private, địa bàn, RSVP, link mời Zalo); roadmap không còn giai đoạn Kèo riêng. UI có thể gọi "Kèo" (chốt copy lúc làm).
- Địa bàn 2 cấp tỉnh → xã (docs/architecture.md, mục Admin units); quán tham chiếu `cafes.id`.

## Requirements
- Tạo sự kiện: tiêu đề, mô tả, thời gian bắt đầu (+ kết thúc tùy chọn), game dự kiến (0-n), địa điểm = quán **hoặc** địa chỉ tự do + tỉnh/xã, sức chứa tùy chọn.
- `visibility`: `public` (liệt kê + lọc theo tỉnh/xã), `friends` (bạn của người tạo), `club` (thành viên club), `private` (chỉ ai có link mời).
- RSVP: `going|maybe|declined`; hết chỗ → `waitlist`. Người tạo mời bạn bè (status `invited`).
- Link mời có token → chia sẻ Zalo (nút share + Open Graph meta).
- Sau sự kiện: "Ghi ván từ sự kiện" → play-form điền sẵn người tham gia, `plays.eventId`.
- Hủy sự kiện (status `cancelled`), người tham gia thấy trạng thái.
- Feed: "X sẽ tham gia sự kiện Y" (theo visibility sự kiện).

## Data
- `events(id, slug, title, description, startsAt timestamptz, endsAt null, cafeId null, addressLine null, provinceCode, wardCode null, capacity null, visibility, clubId null, inviteCode unique, status 'scheduled'|'cancelled', createdBy, createdAt, updatedAt)`; index (provinceCode, startsAt), (clubId).
- `event_games(eventId, gameId)` PK.
- `event_participants(eventId, userId, status, respondedAt)` PK; index userId.
- `plays` thêm `eventId null on delete set null`.
- Thời gian lưu UTC, hiển thị Asia/Saigon.

## Files
- Create: `apps/api/src/db/schema/events.ts`, `apps/api/src/modules/events/{routes,service,repo,events.test}.ts`, `packages/shared/src/events.ts`, `apps/web/app/su-kien/{page.tsx,moi/page.tsx,[slug]/page.tsx,[slug]/sua/page.tsx}`, `apps/web/app/su-kien/moi-tham-gia/[code]/page.tsx`.
- Modify: `apps/api/src/db/schema/plays.ts` (eventId), `apps/api/src/modules/plays/service.ts`, `apps/web/components/play-form.tsx` (prefill), `apps/api/src/modules/profiles/repo.ts` (feed), `apps/web/app/clubs/[slug]/page.tsx` (danh sách sự kiện), đăng ký; sitemap (chỉ sự kiện public sắp tới) nếu P1b có `sitemap.ts`.

## API
- `GET /events?provinceCode=&wardCode=&from=&cafeId=` (public, sắp diễn ra), `GET /me/events`, `POST /events`, `GET /events/:slug` (kiểm visibility; có `?code=` cho private), `PATCH/DELETE /events/:id` (creator), `POST /events/:id/rsvp {status, code?}`, `POST /events/:id/invite {userIds}` (chỉ bạn bè), `POST /events/:id/invite-code/rotate`.
- RSVP trong transaction + `SELECT ... FOR UPDATE` trên event để đếm capacity.

## Steps
1. Schema + migration. 2. Service visibility (dùng `canView` + club membership + code). 3. RSVP/capacity. 4. Web list + filter tỉnh/xã (tái dùng filter của `apps/web/app/cafes/cafe-filters.tsx`), chi tiết, form, share. 5. Tích hợp play-form + feed.

## Validation
- Test: private không có code → 404; club event với non-member → 404; capacity 2, người thứ 3 → waitlist; RSVP đồng thời không vượt capacity; list public chỉ trả sự kiện public tương lai; cancelled vẫn xem được, không RSVP được.
- E2E headless: tạo sự kiện public → user khác mở link → RSVP going.

## Risks
- Race capacity (M×M) → row lock. Spam sự kiện public (M×M) → rate limit 10/ngày/user; admin gỡ qua `apps/web/app/admin/events/page.tsx`.
- Rollback: drop cột `plays.eventId`, bảng events*.
