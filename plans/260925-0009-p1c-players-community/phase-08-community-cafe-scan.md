---
phase: 8
title: "Cộng đồng quét kho quán"
status: pending
effort: "2d"
dependencies: [1, 7]
---
# Phase 8: Cộng đồng quét kho quán

## Context
- `cafe_games` (apps/api/src/db/schema/cafes.ts:46-64) có `addedBy`, `addedVia 'manual'|'scan'`; chưa phân biệt nguồn.
- Public DTO `toInventoryDto` (apps/api/src/modules/cafes/service.ts:42-51) không có `addedBy` — giữ; manage DTO (service.ts:54-57) có `addedBy` cho `/manage` maintainer+admin.
- Lookup barcode chỉ maintainer (apps/api/src/modules/barcodes/routes.ts:11,17). Rate limit hiện theo IP (apps/api/src/lib/rate-limit.ts:6-15).

## Requirements
- User đăng nhập (email đã xác minh) quét/thêm game vào kho quán bất kỳ không `pending` → hiện ngay, nhãn "Cộng đồng đóng góp".
- Game đã có trong kho → không đổi gì (không ghi đè nguồn).
- Chủ quán/staff (phase 7) hoặc maintainer/admin: **gỡ** hoặc **xác nhận** (bỏ nhãn → `source='owner'|'staff'`).
- Danh tính người đóng góp: **chỉ role `admin`** thấy (đã chốt). Maintainer/chủ quán/public chỉ thấy nhãn.
- Chống lạm dụng: rate limit theo user (30 request thêm/giờ, bulk ≤ 20 game), audit mọi thêm/gỡ/xác nhận; game đã bị chủ quán/staff gỡ thì cộng đồng không thêm lại được; admin chặn user đóng góp + gỡ hàng loạt đóng góp của 1 user.

## Data
- `cafe_games` thêm `source text enum('staff','owner','community') default 'staff' not null` (dòng cũ = staff).
- `cafe_game_events(id, cafeId, gameId, userId, action 'add'|'remove'|'confirm', source, createdAt)` index (cafeId,gameId), (userId, createdAt).
- `users.contributionBlockedAt timestamp null` (additionalField, input false).

## Files
- Create: `apps/api/src/modules/cafes/community.ts` (service community add/confirm/remove + audit), `apps/api/src/modules/cafes/community.test.ts`, `apps/web/app/cafes/[slug]/dong-gop/page.tsx` (quét/tìm game → thêm), `apps/web/app/admin/dong-gop/page.tsx`.
- Modify: `apps/api/src/lib/user-rate-limit.ts` (tạo ở phase 1; thêm limiter đóng góp), `apps/api/src/db/schema/cafes.ts`, `apps/api/src/modules/cafes/{routes,service,repo}.ts` (DTO: public/owner thêm `community:boolean`; `addedBy` chỉ khi actor là admin), `packages/shared/src/cafes.ts` (enum source, DTO), `apps/api/src/modules/barcodes/routes.ts` (GET lookup → requireUser + user rate limit; POST link giữ maintainer), `apps/api/src/auth/better-auth.ts`, `apps/web/components/scan-session.tsx` (mode `community`: không link barcode — đã chốt, chỉ chọn game có sẵn; mã chưa biết → báo "chưa có trong catalog"), `apps/web/app/cafes/[slug]/page.tsx` (nhãn + nút "Đóng góp"), `apps/web/app/quan-cua-toi/[id]/page.tsx` (lọc + xác nhận/gỡ).

## API
- `POST /cafes/:id/community-games {gameIds}` (requireUser, verified, not blocked, user rate limit).
- `POST /cafes/:id/games/:gameId/confirm` (requireCafeRole owner/staff hoặc maintainer/admin).
- `DELETE /cafes/:id/games/:gameId` hiện có → ghi audit `remove`.
- Admin: `GET /admin/contributions?userId=&cafeId=`, `POST /admin/users/:id/contribution-block`, `DELETE /admin/users/:id/community-games` (gỡ mọi dòng `source=community` của user) — `requireRole('admin')`.

## Steps
1. Migration cột `source` + bảng audit + cột block. 2. Community service + audit trong cùng transaction. 3. Tách DTO theo actor: 1 hàm `toInventoryDto(row, actor)` quyết định `addedBy`; audit grep mọi nơi trả `addedBy` (service.ts:56). 4. Mở barcode lookup cho user + rate limit user. 5. Web: trang đóng góp, nhãn, màn chủ quán, màn admin.

## Validation
- Test: user thêm → public GET có `community:true`, **không có key `addedBy`**; owner GET cũng không; maintainer `/manage` không có `addedBy` với dòng community; admin có. Thêm lại game đã bị gỡ → 409. Vượt 30/giờ → 429. User bị block → 403. Chưa verify email → 403. Mỗi action có 1 dòng audit.
- Snapshot test JSON response public/owner/admin để chống rò về sau.

## Risks
- Rò danh tính qua endpoint khác (M×H) → test snapshot + grep `addedBy` trong mọi DTO.
- Vandal thêm game rác (M×M) → nhãn rõ, gỡ 1 chạm, gỡ hàng loạt, block.
- Mở lookup làm tốn quota GameUPC (M×M) → cache hiện có (`barcode_lookups`) + rate limit user.
- Rollback: revert route/DTO; cột `source` giữ không hại; drop audit nếu cần.
