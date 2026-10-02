---
phase: 4
title: "Plays + lịch sử ván + bảng điểm"
status: pending
effort: "4d"
dependencies: [1, 3]
---
# Phase 4: Plays + bảng điểm

## Context
- Thiết kế gốc: [P1c phase-03](../260925-0009-p1c-players-community/phase-03-play-log.md) (plays, play_players, quyền, prefill từ bàn Kèo, visibility, DTO ẩn danh). Phase này = phase-03 **+ clubId + score sheet**.
- `users.playsVisibility` (apps/api/src/db/schema/auth.ts:31); `canView` (apps/api/src/lib/visibility.ts:16).
- Bàn Kèo `meetupTables` (apps/api/src/db/schema/meetups.ts:63).

## Requirements
- Như phase-03 gốc, cộng:
  - Ghi ván bất kỳ lúc nào; Kèo/bàn chỉ là prefill (`?meetupTableId=`).
  - Người chơi được gắn: bạn của creator ∪ creator ∪ người ngồi bàn (khi từ Kèo) ∪ **member cùng club** (khi `clubId` set).
  - `plays.clubId` (creator phải là member); ván từ Kèo → `clubId` lấy từ `meetups.clubId` server-side, client gửi khác → 422.
  - Bảng điểm: chọn template (current approved của game, chọn variant) hoặc "điểm tự do" (không template, nhập total + winner như phase-03).
  - `plays.scoreTemplateVersionId → score_template_versions restrict` (pin), `plays.outcome win|loss null` (coop), `plays.scoreInput jsonb` (input thô cho `computeScores`), `play_players.teamKey null`, `play_players.score` = total server tính, `rank`, `isWinner` (server tính; chỉnh tay chỉ khi `tieUnresolved` hoặc winRule `objective|none`).
  - Sửa ván: giữ version pinned; tùy chọn "nâng lên version mới" (tính lại).
- Lịch sử: `GET /users/:username/plays?cursor=`, `GET /clubs/:slug/plays?cursor=` (member), chi tiết ván hiển thị điểm từng hạng mục.

## Data flow
Form web → `POST /plays {gameId, playedOn, players[], clubId?, meetupTableId?, scoreTemplateVersionId?, scoreInput?}` → service: validate quyền/người chơi → load version → `validateTemplate` + `computeScores` → tx insert `plays` + `play_players(score, rank, isWinner)` → DTO (ẩn danh theo privacy).

## Files
- Create: `apps/api/src/db/schema/plays.ts`, `apps/api/src/modules/plays/{routes,service,repo,plays.test}.ts`, `packages/shared/src/plays.ts`, `apps/web/app/plays/{new/page.tsx,[id]/page.tsx,[id]/edit/page.tsx}`, `apps/web/components/{play-form,score-sheet,friend-picker}.tsx`.
- Modify: `apps/web/app/events/[slug]/page.tsx` + `apps/web/components/session-table-card.tsx` (nút "Ghi ván"), `apps/web/app/u/[username]/page.tsx` (tab lịch sử), `apps/web/app/clubs/[slug]/page.tsx` (ván gần đây), đăng ký shared files.

## Steps
0. Backup DB. 1. Schema + migration (plays, play_players, index theo phase-03 + `(clubId, playedOn)`). 2. Service validate + compute + tx. 3. Routes + phân trang cursor `(playedOn, id)`. 4. `score-sheet.tsx`: lưới người chơi × hạng mục theo `input` (number/count/repeating/exclusive/bool/counts), tổng live dùng chung `computeScores` client-side. 5. Prefill từ bàn Kèo. 6. Trang chi tiết + lịch sử.

## Validation
- Test: client gửi total sai → server ghi total đúng; template bump → ván cũ vẫn hiển thị theo version cũ; restrict xóa version đang được pin; người lạ không bạn/không club → 422; member club gắn được member khác; ván từ Kèo club gửi clubId khác → 422; `playsVisibility=friends` → người lạ thấy ẩn danh; coop thua → không ai thắng; tie unresolved → cho chọn tay; điểm tự do không template vẫn chạy.
- E2E (Playwright headless): ghi ván 3 người có template → trang chi tiết đúng tổng/winner.

## Risks
| Risk | L×I | Mitigation |
|---|---|---|
| Client/server lệch kết quả | M×H | cùng 1 hàm shared; server là nguồn sự thật |
| `scoreInput` jsonb phình | L×L | giới hạn 64KB, 20 người |
| Lộ danh tính qua lịch sử club | M×H | dùng chung DTO ẩn danh phase-03; test |

## Rollback
Drop `play_players`, `plays` (chưa có phụ thuộc ngoài phase 5). Restore dump nếu đã có dữ liệu thật.
