---
phase: 4
title: "Địa bàn, quán, kho game"
status: completed
priority: P1
effort: "4d"
dependencies: [3]
---

# Phase 4: Địa bàn, quán, kho game

## Overview
Seed đơn vị hành chính, danh bạ quán (maintainer nhập hộ), kho game từng quán; trang quán theo tỉnh/phường, trang game hiện "quán có game này".

## Requirements
- Functional: list quán lọc tỉnh → phường, sắp theo số game; chi tiết quán (địa chỉ, giờ mở, link map/fanpage, kho game); maintainer CRUD quán + thêm/bớt game vào kho.
- Non-functional: provenance bắt buộc cho quán; lat/lng tùy chọn (chuẩn bị "gần tôi" ở P2).

## Architecture
```ts
provinces(code PK, name, slug)
wards(code PK, provinceCode FK, name, slug)
cafes {
  id, slug, name, provinceCode, wardCode, addressLine, legacyDistrict?,  // "Quận 3 cũ"
  lat?, lng?, openingHours jsonb, links jsonb,                            // fanpage, maps
  sourceUrl?, consentStatus: 'granted' | 'pending' | 'public_info_only',
  consentNote?, verifiedAt?, createdBy
}
cafe_games { cafeId, gameId, copies default 1, addedBy, addedVia: 'manual'|'scan', PK(cafeId, gameId) }
```
- `consentStatus = public_info_only`: chỉ hiện tên/địa chỉ/link; không đăng lại bài/ảnh fanpage cho tới khi `granted`.

## Related Code Files
- Create: `apps/api/src/modules/{locations,cafes}/*`, `apps/api/scripts/seed-locations.ts`, `apps/web/app/cafes/*`, `apps/web/app/admin/cafes/*`; sửa `apps/web/app/games/[slug]/page.tsx` (block "Nơi chơi").

## Implementation Steps
1. Chọn nguồn dữ liệu hành chính sau 07/2025 có license cho phép (kiểm tra trước, ghi vào `docs/references.md`); seed idempotent.
2. Schema + migration cafes, cafe_games.
3. Service: đếm game theo quán (view hoặc cột cache cập nhật trong transaction).
4. Routes public (list/filter/detail) + maintainer.
5. Web: `/cafes?tinh=ho-chi-minh&phuong=...`, trang quán, block "Nơi chơi" trên trang game.
6. Test: lọc địa bàn, không cho thêm trùng game vào kho, provenance required.

## Success Criteria
- [ ] Lọc quán theo tỉnh → phường chính xác.
- [ ] Trang game liệt kê các quán có game.
- [ ] Không lưu được quán thiếu `consentStatus`.

## Risk Assessment
- Dữ liệu hành chính còn thay đổi → seed theo `code`, upsert được.
- Nhập hộ quán từ fanpage: rủi ro bản quyền nếu đăng lại nội dung → chặn bằng `consentStatus`.
