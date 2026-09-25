---
phase: 3
title: "Ghi ván chơi (cá nhân + nhóm)"
status: pending
effort: "2.5d"
dependencies: [1]
---
# Phase 3: Ghi ván chơi

## Context
- Ván cá nhân = ván nhóm chỉ có 1 người chơi → **1 mô hình duy nhất**.
- Cafe tham chiếu `cafes.id` (apps/api/src/db/schema/cafes.ts:17); chỉ chọn quán không `pending` (cùng rule public tại apps/api/src/modules/cafes/repo.ts:26).
- `clubId`, `eventId` thêm ở phase 5/6 (nullable) — không tạo sớm.

## Requirements
- Người ghi (creator) nhập: game, ngày chơi, thời lượng (phút), quán tùy chọn, ghi chú; danh sách người chơi: user (chỉ **bạn bè của creator** hoặc chính creator) hoặc tên khách; mỗi người: điểm (số, tùy chọn), thắng (bool, cho phép nhiều người thắng/hòa).
- Ván hiện trong lịch sử của **mọi user tham gia**. User bị gắn có thể "Rời ván" (xóa mình khỏi ván).
- Chỉ creator sửa/xóa ván.
- Visibility theo plan.md: mặc định `playsVisibility=public`; participant luôn thấy; còn lại theo `playsVisibility` của chủ lịch sử đang xem. DTO không có email.

## Data
- `plays(id uuid, gameId, playedOn date, durationMin smallint null CHECK 1..1440, cafeId null, note text null, createdBy, createdAt, updatedAt)`, index (gameId), (createdBy, playedOn).
- `play_players(id uuid, playId cascade, userId null, guestName text null, score numeric(10,2) null, isWinner bool default false, position smallint)`; CHECK đúng 1 trong `userId|guestName`; UNIQUE(playId, userId); index (userId).
- Giới hạn 1-20 người/ván, guestName ≤ 50 ký tự.

## Files
- Create: `apps/api/src/db/schema/plays.ts`, `apps/api/src/modules/plays/{routes,service,repo,plays.test}.ts`, `packages/shared/src/plays.ts`.
- Create web: `apps/web/app/van-choi/moi/page.tsx`, `apps/web/app/van-choi/[id]/page.tsx`, `apps/web/app/van-choi/[id]/sua/page.tsx`, `apps/web/components/play-form.tsx`, `apps/web/components/friend-picker.tsx`.
- Modify: đăng ký schema/route/shared.

## API
- `POST /plays`, `GET /plays/:id`, `PATCH /plays/:id` (creator), `DELETE /plays/:id` (creator), `DELETE /plays/:id/me` (rời ván).
- `GET /users/:username/plays?cursor=` (lịch sử, phân trang cursor theo playedOn,id).
- DTO người chơi: `{userId?, username?, name, guest:boolean, score, isWinner}`; người chơi không đủ quyền → `{name:"Người chơi ẩn danh", hidden:true}`.

## Steps
1. Schema + migration. 2. Service validate: game tồn tại, cafe public, userIds ⊆ friends(creator) ∪ {creator}; sửa ván thay toàn bộ danh sách player trong 1 transaction. 3. Visibility filter trong service (dùng `lib/visibility.ts`). 4. Form web: chọn game (GamePicker), chọn bạn (FriendPicker), thêm khách, điểm/thắng. 5. Trang chi tiết ván.

## Validation
- Test: tạo ván 3 người → hiện trong lịch sử A, B; gắn non-friend → 422; non-creator PATCH → 403; B rời ván → mất khỏi lịch sử B, ván vẫn còn cho A; stranger xem lịch sử mặc định (`public`) → thấy ván, không có key `email`; đổi `friends` → rỗng + `hidden`; tên người chơi `private` bị ẩn.
- E2E headless: ghi ván từ form → mở trang chi tiết.

## Risks
- Gắn tên spam người lạ (M×M) → chỉ gắn bạn bè + rời ván.
- Rò danh tính qua ván của người khác (M×H) → ẩn danh theo quyền của từng player; test ma trận.
- Xóa user: `play_players.userId` → `set null` + đổi thành guestName "Người dùng đã xóa"? Chọn **cascade xóa dòng player** (KISS), ván giữ lại.
- Rollback: drop `play_players`, `plays`.
