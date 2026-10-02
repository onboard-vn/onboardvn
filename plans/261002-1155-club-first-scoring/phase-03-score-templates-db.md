---
phase: 3
title: "Game enrichment + bộ lọc + score templates DB + seed + link-outs"
status: pending
effort: "3d"
dependencies: [1, 2]
---
# Phase 3: Game enrichment + bộ lọc + score templates DB + seed

## Context
- `games` có `slug` unique, `bggId` unique (apps/api/src/db/schema/games.ts:18-50). Catalog hiện 170 game Hà Nội; game tủ club ([games.json](../../data/staging/clubs/<external-club>), có `slug,name,year,min/maxPlayers,playingTimeMinutes,complexity,imageUrl,externalId,priority`, **không bggId**) phần lớn chưa có trong catalog.
- Provenance bắt buộc theo docs/architecture.md mục Data provenance.
- Phụ thuộc phase 1 chỉ vì thứ tự migration.
- Enrichment đang sinh vào `data/private/<club>/enrichment/batch-*.json`: `slug, bggId, bggIdVerified, nameCanonical, year, weight, minPlayers, maxPlayers, bestPlayers[], playTimeMin, playTimeMax, minAge, categories[] (≤5), mechanics[] (≤6), scoringFamily (19 giá trị: point-salad-euro … roll-write, other), scoringNotes, confidence, isExpansionOrDuplicate`.
- Bảng có sẵn: `categories(name unique, kind category|mechanic, bggId)` + UNIQUE(kind,bggId) (games.ts:53-65), `game_categories` (games.ts:90-104). Filter hiện tại: `gameFilterSchema` (packages/shared/src/games.ts:87-95: q, players, maxTime, maxWeight, categoryId), `buildWhere` (apps/api/src/modules/games/repo.ts:24).

## Requirements
### A. Enrichment import + bộ lọc
- Cột mới `games`: `bestPlayers smallint[] default '{}'`, `playMaxMinutes smallint null`, `scoringFamily text enum(19 giá trị) null`, `bggIdVerified bool default false`. Enum `scoringFamily` đặt 1 chỗ trong `packages/shared` (DRY, dùng cho DB/filter/research batch).
- CLI `pnpm --filter api import:game-enrichment [--dry-run]`: đọc `enrichment/batch-*.json` (Zod), bỏ `isExpansionOrDuplicate=true` (ghi báo cáo); upsert game qua `upsertGameFromExternal` (match `bggId` verified → slug → name+year chuẩn hóa); **không ghi `bggId` nếu `bggIdVerified=false`** (tránh đụng UNIQUE sai); `weight/minAge/players/playMinutes` chỉ ghi khi trống hoặc nguồn cũ cũng là import (không đè sửa tay admin); categories/mechanics → `categories` theo (kind, name) tạo nếu thiếu → `game_categories`. Idempotent. `confidence=low` → chỉ báo cáo, không ghi field không chắc.
- Mở rộng `gameFilterSchema` (additive, giữ field cũ): `players` + `bestAt` (bool: `players ∈ bestPlayers`), `weightBand` (`light <2`, `medium 2-3`, `heavy >3`; hoặc `minWeight/maxWeight`), `minTime/maxTime`, `categoryIds[]`, `mechanicIds[]` (AND), `scoringFamily[]`, `hasScoreTemplate`, `templateConfidence[]`. Index: GIN `best_players`, btree `scoring_family`, `weight`.
- Web `/games`: thêm control bộ lọc (chip số người + "best", band độ nặng, thời gian, thể loại, cơ chế, scoringFamily, có bảng điểm, độ tin cậy). Club shelf dùng **cùng schema + component** ở phase 5 (thêm owner).
- Ưu tiên seed template theo **lô đồng nhất `scoringFamily × weightBand`** (không theo độ phổ biến): seed CLI báo coverage theo ô (family × band) để biết lô nào còn thiếu.

### B. Score templates
- Bảng:
  - `score_templates(id, gameId → games cascade, variant text null, currentVersionId null, createdAt)` UNIQUE(gameId, coalesce(variant,'')).
  - `score_template_versions(id, templateId cascade, version int, definition jsonb, sources jsonb, confidence enum high|medium|low, needsReview bool, status enum pending|approved|rejected|superseded, authorId → users set null, reviewedBy null, reviewedAt null, reviewNote null, createdAt)` UNIQUE(templateId, version). Version `approved` bất biến (service chặn UPDATE definition).
- Seed CLI `pnpm --filter api seed:score-templates [--dry-run]`:
  1. Đọc `data/staging/score-templates/*.json`, `validateTemplate` (phase 2); lỗi → báo, bỏ file.
  2. Tìm game theo `bggId` → `slug` → (name+year chuẩn hóa). Không có → upsert từ games.json club (slug, nameEn, players, playMinutes, weight, `source_url`) qua helper `upsertGameFromExternal` (tái dùng ở phase 7).
  3. Upsert template; nếu `templateVersion` mới hơn → thêm version `approved` (author null = hệ thống), set current, version cũ → `superseded`. Idempotent (hash definition).
  4. Chỉ game có trong tủ club (games.json/enrichment); thứ tự lô theo `scoringFamily × weightBand`.
- API đọc: `GET /games/:slug/score-templates` (chỉ approved current + danh sách variant), `GET /score-templates/versions/:id` (định nghĩa pinned, cho ván cũ), `POST /score-templates/preview {versionId, input}` → `computeScores` (dùng cho web + Android).
- Trang game: section "Bảng điểm" (có template / chưa có), hiển thị `confidence` + nguồn (link). **Link-out**: BGG (`/boardgame/{bggId}` nếu có), BGW (tìm theo tên), BG Stats, Boardgami (`app.boardgami.com/vi/learn` khi có) — chỉ link, `rel="noopener nofollow"`.
- Thêm export `scoring` vào `packages/shared/src/index.ts`.

## Files
- Create: `apps/api/src/dataset/game-enrichment-import.ts` (+ test), `apps/web/components/game-filter-panel.tsx`, `apps/api/src/db/schema/score-templates.ts`, `apps/api/src/modules/score-templates/{routes,service,repo,score-templates.test}.ts`, `apps/api/src/modules/score-templates/seed-cli.ts`, `apps/api/src/modules/games/upsert-external.ts`, `packages/shared/src/score-templates.ts` (DTO), `apps/web/components/game-links.tsx`, `apps/web/components/score-template-info.tsx`.
- Modify: `apps/api/src/db/schema/games.ts` (cột mới + index), `packages/shared/src/games.ts` (enum + filter), `apps/api/src/modules/games/repo.ts` (`buildWhere`), `apps/api/src/modules/openapi/document.ts` (filter mới), `apps/web/app/games/{page.tsx,game-filters.tsx,[slug]/page.tsx}`, `apps/api/src/dataset/columns.ts` (export cột mới nếu dataset public), `apps/api/package.json` (script), đăng ký shared files.

## Steps
0. Backup DB. 1. Migration (cột games + 2 bảng template). 2. `upsertGameFromExternal` + test match. 3. Import enrichment + dry-run review. 4. Filter schema + `buildWhere` + web panel. 5. Repo/service template + preview. 6. Seed CLI + coverage family×band. 7. Web section + link-outs.

## Validation
- Test enrichment: import 2 lần → 0 thay đổi; `bggIdVerified=false` không ghi bggId; expansion/dup bị bỏ; không đè field admin sửa tay; mechanic/category tạo đúng `kind`.
- Test filter: `players=4&bestAt=true` chỉ game có 4 ∈ bestPlayers; band light/medium/heavy biên 2.0/3.0; `mechanicIds` AND; `hasScoreTemplate`/`templateConfidence` đúng; filter cũ (`maxWeight`, `categoryId`) vẫn chạy.
- Test template: seed 2 lần → lần 2 không đổi; template bump version → version cũ `superseded`, current mới; file invalid bị bỏ + báo; preview khớp `computeScores`; UPDATE definition approved → 409; game không có bggId vẫn match slug; trang game hiện nguồn + confidence.

## Risks
| Risk | L×I | Mitigation |
|---|---|---|
| Tạo game trùng (tên khác hoa/thường, năm) | M×M | chuẩn hóa unaccent+lower+year; dry-run in danh sách tạo mới để duyệt |
| jsonb definition hỏng do sửa tay DB | L×M | validate khi đọc; lỗi → ẩn template + log |
| Enrichment sai (bggId/weight) | M×M | chỉ ghi bggId verified; low confidence không ghi; dry-run review |
| Đè dữ liệu admin sửa tay | M×M | chỉ điền field trống/nguồn import |
| Bản quyền rulebook | L×M | chỉ lưu cấu trúc tính điểm + link nguồn, không chép văn bản luật |

## Rollback
Drop 2 bảng template + cột games mới (dữ liệu enrichment tái import được); game tạo bởi seed có `source_url` = club → xóa theo nguồn nếu cần (chưa có ván tham chiếu).

## Open questions
- Link BGW: có URL theo slug ổn định không hay chỉ link tìm kiếm?
