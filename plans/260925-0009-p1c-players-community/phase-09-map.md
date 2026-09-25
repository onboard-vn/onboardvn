---
phase: 9
title: "/map: bản đồ quán (MapLibre + OpenFreeMap) + ghim tay"
status: pending
effort: "2d"
dependencies: [7]
---
# Phase 9: /map — bản đồ quán + ghim tay

## Context
- Chạy **ngay sau phase 7** (thứ tự thực thi, plan.md). Cần predicate `publicCafeWhere` + `requireCafeRole` của phase 7.
- `cafes.lat/lng numeric(9,6)` có sẵn (apps/api/src/db/schema/cafes.ts:29-30). **25 quán Hà Nội đã import đều chưa có tọa độ** (data/staging/cafes/cafes.csv, cột `lat,lng` trống) → ghim tay là đường chính.
- Public DTO hiện **ẩn `lat/lng` khi `public_info_only`** (apps/api/src/modules/cafes/service.ts:24,34-35) → cần quyết định (Open question) trước khi map có pin.
- Game finder có sẵn: `GET /games/:slug/cafes` (apps/api/src/modules/games/routes.ts:38 → `getCafesForGameService` apps/api/src/modules/cafes/service.ts:268).
- Tile: **OpenFreeMap** (không key, style URL công khai); render **MapLibre GL JS** client-only (`next/dynamic` `ssr:false`).

## Requirements
- `/map`: bản đồ toàn màn hình, pin mọi quán công khai có tọa độ (`publicCafeWhere` + `lat/lng NOT NULL`); fit bounds theo tỉnh đang lọc; mặc định Hà Nội.
- Bộ lọc: **tỉnh** (tái dùng `apps/web/app/cafes/cafe-filters.tsx`) + **"có game X"** (GamePicker → lọc theo `cafe_games`). Đồng bộ query string (`?province=01&game=slug`) để share link.
- Popup pin: card quán (tên, địa chỉ, số game, nhãn thông tin cơ bản nếu `public_info_only`) + link trang quán + **"Chỉ đường"** = `https://www.google.com/maps/dir/?api=1&destination={lat},{lng}` (link ngoài, không gọi API Google).
- **Ghim tay** (admin/maintainer ở `/admin/cafes/[id]/edit`, owner/staff ở `/my-cafes/[id]`): component map nhỏ, marker kéo thả → lưu `lat/lng` (6 chữ số). **Geocode-assist**: ô tìm địa chỉ gọi Nominatim/OpenFreeMap-compatible search **chỉ để recenter map**; không tự lưu kết quả, không geocode hàng loạt, không lưu tọa độ bên thứ ba — người dùng phải thả/kéo marker rồi bấm Lưu.
- Danh sách quán thiếu tọa độ ở `/admin/cafes?missingPin=1` để ghim dần.
- Attribution OpenFreeMap/OpenStreetMap luôn hiển thị.
- Mobile: pin cluster khi > 50 pin trong viewport; popup dạng bottom sheet.
- **Later**: pin Kèo public sắp tới (phase 6) — layer thứ 2, cùng API pattern, bật sau khi phase 6 xong.

## Data
- Không bảng mới. Thêm `cafes.pinnedBy text null → users set null`, `cafes.pinnedAt timestamp null` (audit ai ghim).
- Validate: lat 8-24, lng 102-110 (Việt Nam); ngoài khoảng → 422.

## Data flow
`/map` (server component đọc filter) → `GET /cafes/map?provinceCode=&gameSlug=` → `publicCafeWhere` + có tọa độ → `[{id, slug, name, lat, lng, gameCount, basicOnly}]` (payload nhẹ, không inventory) → MapLibre GeoJSON source + cluster. Ghim: marker drag → `PATCH /cafes/:id/pin {lat,lng}` (`requireCafeRole('owner','staff')`, staff global pass-through) → set `pinnedBy/pinnedAt` → revalidate trang quán + `/map`.

## Files
- Create: `apps/web/app/map/{page.tsx,map-view.tsx}`, `apps/web/components/{cafe-map,pin-editor,cafe-map-popup}.tsx`, `apps/api/src/modules/cafes/map.test.ts`.
- Modify: `apps/api/src/modules/cafes/{routes,service,repo}.ts` (`GET /cafes/map`, `PATCH /cafes/:id/pin`, lọc `missingPin`), `apps/api/src/db/schema/cafes.ts` (`pinnedBy/pinnedAt`), `packages/shared/src/cafes.ts` (DTO + pin schema), `apps/web/app/admin/cafes/[id]/edit/page.tsx`, `apps/web/app/my-cafes/[id]/page.tsx`, `apps/web/app/admin/cafes/page.tsx` (filter thiếu pin), `apps/web/package.json` (`maplibre-gl`), `apps/web/app/sitemap.ts` (`/map`), nav chính.

## Steps
1. Migration `pinnedBy/pinnedAt`. 2. `GET /cafes/map` + `PATCH /cafes/:id/pin` + test. 3. Component `cafe-map` (MapLibre + OpenFreeMap style, cluster, popup). 4. `/map` + filter tỉnh/game + query string. 5. `pin-editor` (drag + geocode recenter) ở admin + my-cafes. 6. Ghim 25 quán Hà Nội (admin, thủ công, dùng kết quả xác minh phase 7).

## Validation (acceptance)
- API: `GET /cafes/map` không trả quán `pending`/`declined`/không tọa độ; lọc `gameSlug` chỉ quán có game; payload không có `addedBy`, email, inventory.
- `PATCH /cafes/:id/pin`: owner quán A ghim quán B → 403; anon → 401; lat ngoài VN → 422; lưu `pinnedBy`.
- Geocode-assist: test component — chọn kết quả tìm kiếm chỉ đổi center, **không** gọi PATCH; request PATCH chỉ khi bấm Lưu.
- E2E headless: admin ghim quán → `/map?province=01` hiện pin → bấm pin → popup có link "Chỉ đường" đúng tọa độ; lọc game X → pin quán không có X biến mất.
- Lighthouse mobile `/map` không lỗi console; attribution hiển thị.

## Risks
- `public_info_only` ẩn tọa độ → map rỗng (H×H) → chốt Open question trước bước 2.
- OpenFreeMap downtime/rate (L×M) → style URL cấu hình qua env, fallback thông báo "bản đồ tạm lỗi", danh sách quán vẫn dùng được.
- Lưu nhầm tọa độ từ geocoder (M×M, rủi ro license) → chỉ recenter, bắt buộc thao tác marker + Lưu; test.
- Bundle nặng (M×L) → dynamic import chỉ ở `/map` + pin editor.
- Rollback: gỡ route `/map` + component; drop `pinnedBy/pinnedAt`; tọa độ đã ghim giữ nguyên (dữ liệu hợp lệ).

## Open question
- Quán `public_info_only` có hiện pin (tọa độ do admin ghim từ địa chỉ công khai) không? Đề xuất **có** (đổi `hideDetails` không ẩn `lat/lng`, service.ts:34-35); nếu không → map chỉ có quán `granted`.
