---
phase: 3
title: "Ghi ván chơi (cá nhân + nhóm)"
status: pending
effort: "3d"
dependencies: [1, 6]
---
# Phase 3: Ghi ván chơi

## Context
- Ván cá nhân = ván nhóm chỉ có 1 người chơi → **1 mô hình duy nhất**.
- Cafe tham chiếu `cafes.id` (apps/api/src/db/schema/cafes.ts:17); chỉ chọn quán không `pending` (cùng rule public tại apps/api/src/modules/cafes/repo.ts:26).
- Chạy sau phase 6 (thứ tự thực thi, plan.md) → phase này thêm `plays.meetupId`, `plays.meetupTableId` (bảng `meetups`, `meetup_tables` của [phase 6](./phase-06-events.md)). `clubId` thêm ở phase 5 — không tạo sớm.
- `exp(user, game)` (định nghĩa ở [phase 4](./phase-04-profile-stats-feed.md)) = `COUNT(DISTINCT plays.id)` qua `play_players.userId` → phase này chỉ cần đảm bảo index; không lưu counter.

## Requirements
- Người ghi (creator) nhập: game, ngày chơi, thời lượng (phút), quán tùy chọn, ghi chú; danh sách người chơi: user (chỉ **bạn bè của creator** hoặc chính creator) hoặc tên khách; mỗi người: điểm (số, tùy chọn), thắng (bool, cho phép nhiều người thắng/hòa).
- Ván hiện trong lịch sử của **mọi user tham gia**. User bị gắn có thể "Rời ván" (xóa mình khỏi ván).
- Chỉ creator sửa/xóa ván.
- **Ghi ván từ Kèo/bàn**: trên `/events/[slug]` (Kèo đã bắt đầu, không `cancelled`) mỗi bàn có nút "Ghi ván" → `/plays/new?meetupTableId=` prefill game của bàn, ngày Kèo, quán, người chơi = host + người ngồi bàn. Chỉ host bàn, người ngồi bàn hoặc người tạo Kèo được ghi. Người chơi prefill là thành viên bàn → được gắn dù không phải bạn creator (ngoại lệ duy nhất của rule bạn bè). 1 bàn có thể có nhiều ván.
- Visibility theo plan.md: mặc định `playsVisibility=public`; participant luôn thấy; còn lại theo `playsVisibility` của chủ lịch sử đang xem. DTO không có email.

## Data
- `plays(id uuid, gameId, playedOn date, durationMin smallint null CHECK 1..1440, cafeId null, note text null, meetupId null → meetups set null, meetupTableId null → meetup_tables set null, createdBy, createdAt, updatedAt)`, index (gameId), (createdBy, playedOn), (meetupTableId).
- `play_players(id uuid, playId cascade, userId null, guestName text null, score numeric(10,2) null, isWinner bool default false, position smallint)`; CHECK đúng 1 trong `userId|guestName`; UNIQUE(playId, userId); index (userId) — dùng cho stats/exp phase 4.
- Giới hạn 1-20 người/ván, guestName ≤ 50 ký tự.

## Files
- Create: `apps/api/src/db/schema/plays.ts`, `apps/api/src/modules/plays/{routes,service,repo,plays.test}.ts`, `packages/shared/src/plays.ts`.
- Create web: `apps/web/app/plays/new/page.tsx`, `apps/web/app/plays/[id]/page.tsx`, `apps/web/app/plays/[id]/edit/page.tsx`, `apps/web/components/play-form.tsx`, `apps/web/components/friend-picker.tsx`.
- Modify: `apps/web/app/events/[slug]/page.tsx` + `apps/web/components/session-table-card.tsx` (nút "Ghi ván"), đăng ký schema/route/shared.

## API
- `POST /plays {..., meetupTableId?}` (server tự set `meetupId` từ bàn), `GET /plays/:id`, `PATCH /plays/:id` (creator), `DELETE /plays/:id` (creator), `DELETE /plays/:id/me` (rời ván).
- `GET /users/:username/plays?cursor=` (lịch sử, phân trang cursor theo playedOn,id).
- DTO người chơi: `{userId?, username?, name, guest:boolean, score, isWinner}`; người chơi không đủ quyền → `{name:"Người chơi ẩn danh", hidden:true}`.

## Steps
1. Schema + migration. 2. Service validate: game tồn tại, cafe public, userIds ⊆ friends(creator) ∪ {creator}; với `meetupTableId`: kiểm quyền bàn, cho phép player ∈ thành viên bàn; sửa ván thay toàn bộ danh sách player trong 1 transaction. 3. Visibility filter trong service (dùng `lib/visibility.ts`). 4. Form web: chọn game (GamePicker), chọn bạn (FriendPicker), thêm khách, điểm/thắng. 5. Trang chi tiết ván.

## Validation
- Test: tạo ván 3 người → hiện trong lịch sử A, B; gắn non-friend → 422; non-creator PATCH → 403; B rời ván → mất khỏi lịch sử B, ván vẫn còn cho A; stranger xem lịch sử mặc định (`public`) → thấy ván, không có key `email`; đổi `friends` → rỗng + `hidden`; tên người chơi `private` bị ẩn; ghi ván từ bàn → prefill đúng, gắn người ngồi bàn không phải bạn → 201, người ngoài bàn ghi → 403, Kèo `cancelled` → 422; xóa bàn → `plays.meetupTableId=null`, ván còn.
- E2E headless: ghi ván từ form → mở trang chi tiết; ghi ván từ bàn Kèo.

## Risks
- Gắn tên spam người lạ (M×M) → chỉ gắn bạn bè + rời ván.
- Rò danh tính qua ván của người khác (M×H) → ẩn danh theo quyền của từng player; test ma trận.
- Xóa user: `play_players.userId` → `set null` + đổi thành guestName "Người dùng đã xóa"? Chọn **cascade xóa dòng player** (KISS), ván giữ lại.
- Ngoại lệ gắn non-friend qua bàn (L×M) → chỉ thành viên bàn thật (`meetup_participants.tableId` hoặc host), test.
- Rollback: drop `play_players`, `plays`.
