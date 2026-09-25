---
phase: 2
title: "Tủ game riêng"
status: completed
effort: "1d"
dependencies: ["P1b phase 3", 1]
---
# Phase 2: Tủ game riêng

## Context
- Kéo từ P4 (vision). Chỉ "sở hữu"; cho mượn vẫn P4. Import BGG (`bgg_username` từ P1b-3) để sau khi có token.
- Tái dùng GamePicker + BarcodeScanner (apps/web/app/admin/scan/scan-session.tsx:50, apps/web/components/barcode-scanner.tsx). Lookup barcode hiện chỉ maintainer (apps/api/src/modules/barcodes/routes.ts:11) → phase 8 mở cho user; phase này thêm bằng tìm kiếm tên, quét mã chỉ tra `game_barcodes` local.

## Requirements
- User thêm/gỡ game khỏi tủ; ghi chú ngắn tùy chọn; hiển thị trên `/u/[username]` theo `profileVisibility`.
- Trang `/tu-game` quản lý tủ của mình.
- Trang game hiện "N người có game này" (chỉ đếm, không danh tính).

## Data
- `user_games(userId, gameId, note text null, createdAt)` PK(userId, gameId), index `gameId`. Cascade khi xóa user/game.

## Files
- Create: `apps/api/src/db/schema/shelf.ts`, `apps/api/src/modules/shelf/{routes,service,repo,shelf.test}.ts`, `packages/shared/src/shelf.ts`, `apps/web/app/tu-game/page.tsx`, `apps/web/components/game-picker.tsx` (tách GamePicker ra khỏi scan-session).
- Modify: `apps/web/app/admin/scan/scan-session.tsx` (import GamePicker từ component mới, không đổi behavior), `/u/[username]` page (mục Tủ game), `apps/web/app/games/[slug]/page.tsx` (số người sở hữu), đăng ký schema/route/shared.

## API
- `GET /me/shelf`, `POST /me/shelf {gameId, note?}` (idempotent), `DELETE /me/shelf/:gameId`.
- `GET /users/:username/shelf` → theo `canView(profileVisibility)`; 404 nếu username không tồn tại, `{hidden:true}` nếu không đủ quyền.
- `GET /games/:slug` thêm `ownersCount`.
- `GET /barcodes/local/:code` (requireUser): tra `game_barcodes` local, không gọi GameUPC.

## Steps
1. Schema + migration. 2. Module + test. 3. Tách GamePicker (refactor thuần). 4. Trang `/tu-game` (tìm kiếm + nút quét dùng lookup local). 5. Mục tủ game trên hồ sơ.

## Validation
- Test: thêm trùng không lỗi; gỡ; stranger xem tủ `private` → hidden; `ownersCount` đúng.
- Kiểm tra `/admin/scan` vẫn chạy như cũ sau khi tách GamePicker (test hiện có + thao tác tay).

## Risks
- Refactor GamePicker phá admin scan (L×M) → chỉ di chuyển code, không đổi props.
- Rollback: drop `user_games`; revert tách component độc lập.
