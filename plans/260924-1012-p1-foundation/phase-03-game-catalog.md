---
phase: 3
title: "Catalog game"
status: completed
priority: P1
effort: "4d"
dependencies: [2]
---

# Phase 3: Catalog game

## Overview
Danh mục game do cộng đồng/maintainer nhập: tên VN/EN, số người, thời gian, độ khó, tuổi, thể loại, mã vạch, `bgg_id`. Trang danh sách + chi tiết.

## Requirements
- Functional: maintainer CRUD game + barcodes; public list (search, lọc số người/thời gian/độ khó/thể loại, phân trang), chi tiết theo slug; đánh dấu "Thuần Việt / Việt hóa".
- Non-functional: search tiếng Việt không dấu (`unaccent` + trigram); slug ổn định.

## Architecture
```ts
// apps/api/src/db/schema/games.ts (rút gọn)
export const games = pgTable('games', {
  id: uuid().primaryKey().defaultRandom(),
  slug: text().notNull().unique(),
  nameVi: text(), nameEn: text().notNull(),
  minPlayers: smallint(), maxPlayers: smallint(),
  playMinutes: smallint(), weight: numeric({ precision: 3, scale: 2 }),
  minAge: smallint(), isVietnamese: boolean().default(false),
  bggId: integer().unique(),
  descriptionVi: text(),               // do cộng đồng viết, CC BY-SA
  createdBy: text().references(() => users.id),
  updatedAt: timestamp().defaultNow(),
});
export const gameBarcodes = pgTable('game_barcodes', {
  code: text().primaryKey(),          // EAN-13/UPC-A đã chuẩn hoá
  gameId: uuid().notNull().references(() => games.id),
  edition: text(),                     // bản VN, bản EN...
  source: text({ enum: ['manual', 'gameupc'] }).notNull(),
});
// categories + game_categories (n-n)
```
- Không lưu mô tả/ảnh từ BGG; chỉ `bggId` → link ngoài.
- Ảnh bìa: upload do maintainer qua interface `StorageDriver` (MVP: volume local; S3/R2 sau), có trường `imageCredit`. <!-- Updated: Validation Session 1 - storage local 0đ -->

## Related Code Files
- Create: `apps/api/src/modules/games/*`, schema games/categories, `packages/shared/src/games.ts` (zod), `apps/web/app/games/page.tsx`, `apps/web/app/games/[slug]/page.tsx`, `apps/web/app/admin/games/*`.

## Implementation Steps
1. Schema + migration + extension `unaccent`, `pg_trgm`.
2. Zod schema chung (create/update/filter) trong shared.
3. Service: tạo slug từ `nameEn`, chuẩn hoá barcode (checksum EAN/UPC).
4. Routes public + maintainer.
5. Web: list (SSR, query params làm filter), detail, form admin.
6. Test: service (slug trùng, barcode sai checksum), route filter.

## Success Criteria
- [ ] Tìm "ma soi" ra "Ma Sói".
- [ ] Barcode sai checksum bị từ chối (422).
- [ ] Trang chi tiết có link BGG khi có `bggId`.

## Risk Assessment
- Nhập liệu ban đầu tốn công → phase 6 có import CSV; phase 5 barcode giúp tạo nhanh.

## Addendum — Nội dung & provenance mô tả (chốt 2026-09-24, làm sau Phase 4)
- 3 tầng: (1) tóm tắt VN do cộng đồng tự viết + nút "Xem mô tả gốc trên BGG (EN)"; (2) bản dịch đầy đủ chỉ khi NPH cho phép, gắn nhãn nguồn; (3) dữ kiện BGG khi có token (P2).
- Cột mới trên `games`: `descriptionSource ('original'|'translated_with_permission')`, `descriptionRightsHolder?`, `descriptionPermissionRef?`, `descriptionLicense ('CC-BY-SA-4.0'|'permission-only')`, `videoUrls text[]`.
- Bảng `game_revisions` (gameId, editorId, snapshot jsonb, createdAt, licenseAcceptedAt) — mỗi lần sửa lưu 1 bản.
- Form admin: dòng đồng ý CC BY-SA bắt buộc khi nguồn là `original`.
- Categories có `bggMechanicId?`/`bggCategoryId?` + `nameVi` (tên VN hiển thị, EN làm phụ).
- Không dịch/lưu mô tả BGG khi chưa có phép chủ bản quyền (thường là NPH, không phải BGG). Tham khảo cách BGW làm: dán mô tả EN từ BGG — Onboard không theo vì dataset CC BY-SA.
- Phase 6: export tách `facts.*` và `descriptions.*`; chỉ export mô tả có `descriptionLicense = 'CC-BY-SA-4.0'`.
