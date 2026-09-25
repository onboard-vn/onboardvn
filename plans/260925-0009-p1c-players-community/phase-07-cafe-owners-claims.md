---
phase: 7
title: "Chủ quán: link mời owner + consent + /my-cafes + import kho CSV"
status: completed
effort: "4.5d"
dependencies: ["P1b phase 1"]
---
# Phase 7: Chủ quán — link mời owner + consent + import kho CSV

## Context
- **Chốt 2026-09-25**: tạm thay self-claim bằng **link mời chủ quán do admin cấp**. Self-claim + admin duyệt chuyển sang **Later** (cuối file). Chạy ở bước (3) của thứ tự thực thi (plan.md), sau import quán Hà Nội.
- Dữ liệu đã vào DB dev (commit 0c323f3): 170 game, 20 thể loại, 25 quán Hà Nội `public_info_only`; `cafe_games` **chưa có dòng** → kho quán đến từ chủ quán (CSV/quét) hoặc cộng đồng (phase 8).
- Quán import hiện **public với thông tin cơ bản** (`consentStatus='public_info_only'`, ẩn chi tiết ở apps/api/src/modules/cafes/service.ts:24,60). Enum hiện có `granted|pending|public_info_only` + `consentNote` (apps/api/src/db/schema/cafes.ts:34-35).
- Tái dùng thiết kế P2 (plans/260924-1854-p2-cafe-owners-import/plan.md): `cafe_members`, `requireCafeRole`, dashboard. **P2 cắt còn import CSV/JSON + preset + template** (không sửa P2).
- Write route quán hiện `requireRole('maintainer','admin')` (apps/api/src/modules/cafes/routes.ts:55,64,74,83,97,111,120); `requireRole` ở apps/api/src/auth/middleware.ts:22-30. Mailer `apps/api/src/lib/mailer/` (P1b-1).
- DTO manage có `addedBy` (service.ts:56) → không dùng cho chủ quán.
- Hiện trạng lọc consent rải rác (cần gom): public list `ne(pending)` apps/api/src/modules/cafes/repo.ts:28; detail service.ts:132; dataset export apps/api/src/dataset/export.ts:180,214; import chỉ chặn hạ `granted` apps/api/src/dataset/import.ts:433-434; llms apps/web/lib/seo/llms-data.ts:19 (qua API); sitemap `apps/web/app/sitemap.ts`; enum shared `packages/shared/src/cafes.ts:3`.

## Chuẩn bị pitch (trước khi gửi link mời)
- **Xác minh trước pilot**: với từng quán mời — còn hoạt động không (fanpage/Maps cập nhật gần đây, gọi điện nếu mâu thuẫn), địa chỉ/tọa độ khớp; sửa hoặc đặt `pending` quán sai trước khi gửi link. Ghi kết quả vào `consentNote`.
- **Trang công khai `/data-sources`** "Nguồn dữ liệu & yêu cầu sửa/gỡ": nguồn (thông tin công khai từ fanpage/Maps, người đóng góp), mục đích (giúp người chơi tìm quán/game), quyền của chủ quán (sửa, từ chối hiển thị qua link mời hoặc liên hệ), kênh liên hệ (email + form/Zalo). Link từ footer + mỗi trang quán `public_info_only`.
- **Pháp lý**: rà lại căn cứ xử lý theo **Luật Bảo vệ dữ liệu cá nhân 91/2025/QH15** (hiệu lực 01-01-2026) trước pilot — dữ liệu công khai ≠ đã có consent; đặc biệt SĐT/tên chủ hộ kinh doanh cá nhân. Chưa rà xong → không hiển thị SĐT cá nhân, chỉ thông tin doanh nghiệp.

## Requirements
- **Tạo link**: admin/maintainer ở `/admin/cafes/[id]` bấm "Tạo link mời chủ quán" → token ngẫu nhiên 32 byte, **single-use**, hết hạn **30 ngày**; hiện 1 lần để copy (Zalo/fanpage). Tạo link mới → thu hồi link chưa dùng cũ của quán. Thu hồi thủ công được.
- **Nhận link** `/my-cafes/invite/[token]`: chưa đăng nhập → đăng ký/đăng nhập rồi quay lại. Token hợp lệ → transaction: `used_at/used_by` + `cafe_members owner` → chuyển trang consent. Token hết hạn/đã dùng/thu hồi → 410.
- **Consent** `/my-cafes/[id]/consent`:
  - "Đồng ý hiển thị" → `consentStatus='granted'`, `verifiedAt=now` → quản lý ở `/my-cafes`.
  - "Từ chối" → `consentStatus='declined'` + lý do vào `consentNote` → **ẩn khỏi public ngay** (list, chi tiết, sitemap, map, llms); giữ row. Owner bật lại được (→ `granted`).
  - Không phản hồi → giữ `public_info_only`.
- Owner mời staff (bằng username) → `cafe_members staff`. Owner đã xác minh tạo cơ sở mới → `granted`.
- `/my-cafes`: danh sách cơ sở, sửa thông tin, kho (thêm/gỡ/số bản, quét — tái dùng scan-session), duyệt/gỡ đóng góp cộng đồng (phase 8), đổi consent.
- Chủ quán không đổi `sourceUrl`; `consentStatus` chỉ qua endpoint consent. Không role toàn cục mới.
- **Import kho CSV tối thiểu (bắt buộc trước pilot, chốt 2026-09-25)** ở `/my-cafes/[id]/import`:
  - Tải template CSV: `name` (bắt buộc; tên VI hoặc EN), `nameEn` (tùy chọn), `bggId` (tùy chọn), `copies` (mặc định 1, 1-99). UTF-8, ≤ 500 dòng.
  - Match catalog theo thứ tự: `bggId` → tên chính xác (`nameVi`/`nameEn`, không phân biệt hoa thường) → `unaccent_immutable` + trigram (`similarity ≥ 0.4`, top 3 gợi ý; pg_trgm/unaccent đã bật ở apps/api/drizzle/0002_enable_search_extensions.sql).
  - **Dry-run preview**: mỗi dòng `matched | suggested | unmatched | error`; dòng chưa khớp → owner chọn game gợi ý/tìm catalog hoặc bỏ qua. Không tạo game mới (chủ quán không mở rộng catalog, giống rule barcode).
  - **Apply**: 1 transaction; upsert `cafe_games` (`copies`, `addedVia='import'`, `source='owner'` nếu phase 8 đã có cột); dòng đã có → cập nhật `copies`; không xóa game không có trong file. Audit 1 dòng/lần import.
  - Tái dùng pattern `apps/api/src/dataset/import.ts` (plan → errors → `applied` flag, `importCafeGamesCsv` :520, `blankToUndefined`/`parseNumber`), parser `apps/api/src/dataset/csv.ts`.

## Public visibility quán (1 predicate)
- `isPubliclyVisibleCafe` (TS) + `publicCafeWhere()` (SQL) = `consentStatus NOT IN ('pending','declined')` trong `apps/api/src/modules/cafes/visibility.ts`; **mọi** surface dùng nó: list (repo.ts:28), detail (service.ts:132), game finder `GET /games/:slug/cafes` (apps/api/src/modules/games/routes.ts:38 → `getCafesForGameService` service.ts:268), sitemap, `/map` (phase 9), llms/llms-full (qua API list), dataset export (export.ts:180,214), đóng góp cộng đồng (phase 8 → 403).
- **Import dataset không tái xuất bản**: `importCafesCsv` (import.ts:433) mở rộng — quán hiện `declined` → `skip` (không đổi status, không đổi dữ liệu); `granted` → không hạ cấp (giữ rule cũ); chỉ owner/admin qua UI đổi được. Test cả 2.

## Data
- `cafes.consentStatus` enum + `'declined'` ở **cả** `apps/api/src/db/schema/cafes.ts:34` và `packages/shared/src/cafes.ts:3` (`cafeConsentStatusEnum`), `apps/api/src/modules/cafes/repo.ts:47` (type), OpenAPI `apps/api/src/modules/openapi/dto-schemas.ts`, form admin `apps/web/app/admin/cafes/cafe-form.tsx`. Refine `sourceUrl` bắt buộc (shared cafes.ts:38) vẫn áp dụng cho `declined`.
- `cafe_games.addedVia` enum + `'import'` (apps/api/src/db/schema/cafes.ts:56).
- `cafe_members(cafeId, userId, role 'owner'|'staff', createdAt)` PK(cafeId,userId), index userId.
- `cafe_owner_invites(id, tokenHash unique (sha256), cafeId cascade, createdBy, createdAt, expiresAt, usedAt null, usedBy null, revokedAt null)`; partial unique (cafeId) where `usedAt IS NULL AND revokedAt IS NULL`. Không lưu token thô.
- `cafe_claims` **chưa tạo** (Later).

## Files
- Create: `apps/api/src/modules/cafes/visibility.ts` (+ test), `apps/api/src/modules/cafe-owners/inventory-import.ts` (+ test), `apps/web/app/data-sources/page.tsx`, `apps/web/app/my-cafes/[id]/import/page.tsx`, `apps/web/public/templates/cafe-inventory.csv`, `apps/api/src/db/schema/cafe-owners.ts`, `apps/api/src/auth/cafe-role.ts` (`requireCafeRole(...roles)`: maintainer/admin pass-through; hoặc member có role), `apps/api/src/modules/cafe-owners/{routes,service,repo,cafe-owners.test}.ts`, `packages/shared/src/cafe-owners.ts`.
- Create web: `apps/web/app/my-cafes/{page.tsx,invite/[token]/page.tsx,[id]/page.tsx,[id]/consent/page.tsx,[id]/scan/page.tsx,new/page.tsx}`, `apps/web/app/admin/cafes/[id]/owner-invite.tsx`.
- Modify: `packages/shared/src/cafes.ts` (enum), `apps/api/src/dataset/{import,export}.ts` (predicate + skip declined), `apps/api/src/modules/openapi/dto-schemas.ts`, `apps/web/app/admin/cafes/cafe-form.tsx`, `apps/web/lib/seo/llms-data.ts` (nếu lọc riêng), `apps/api/src/db/schema/cafes.ts` (enum), `apps/api/src/modules/cafes/{repo,service}.ts` (filter `declined`, `getCafeForOwnerService` không `addedBy`), `apps/api/src/modules/cafes/routes.ts` (PATCH `/:id`, games add/patch/delete/bulk → `requireCafeRole('owner','staff')`; POST `/`, DELETE `/:id`, `/manage` giữ staff global), `apps/web/app/admin/scan/scan-session.tsx` → tách lõi `apps/web/components/scan-session.tsx`, `apps/web/app/sitemap.ts`, đăng ký.

## API
- `POST /admin/cafes/:id/owner-invites` → `{url, expiresAt}` (token chỉ trả 1 lần), `DELETE /admin/cafes/:id/owner-invites/:inviteId`, `GET /admin/cafes/:id/owner-invites` (không trả token).
- `GET /owner-invites/:token` (preview tên quán, trạng thái), `POST /owner-invites/:token/accept` (requireUser).
- `POST /me/cafes/:id/inventory/import?dryRun=1` (multipart CSV) → `{rows:[{line, input, status, gameId?, suggestions[]}]}`; `POST /me/cafes/:id/inventory/import/apply {rows:[{line, gameId|null, copies}]}` (owner|staff; rate limit 10/giờ).
- `POST /me/cafes/:id/consent {decision:'granted'|'declined', reason?}` (owner), `GET /me/cafes`, `POST /me/cafes/:id/staff {username}`.

## Steps
0. Xác minh quán + trang `/data-sources` + rà luật 91/2025 (song song, không chặn code). 1. Schema + migration (enum shared+DB, `addedVia import`, `cafe_members`, `cafe_owner_invites`). 2. Predicate `publicCafeWhere` + chuyển mọi surface + dataset import/export + test từng surface. 3. `requireCafeRole` + ma trận test. 4. Invite: tạo/thu hồi/accept (transaction, `FOR UPDATE` invite). 5. Consent + mail thông báo admin khi owner từ chối. 6. `/my-cafes` + tách scan-session. 6b. Import kho CSV (dry-run → chọn → apply). 7. Docs `docs/` mục chủ quán (ngắn).

## Validation
- Test per surface với quán `declined`: list, detail (404), game finder, sitemap, map API, llms-full, dataset export → đều vắng; admin `/manage` vẫn thấy; `dataset:import --apply` file có quán `declined` với status `public_info_only` → skip, vẫn `declined`; quán `granted` không bị hạ.
- Test import kho: dòng `bggId` khớp; tên có dấu/không dấu khớp; tên gần đúng → `suggested`; tên lạ → `unmatched`; dry-run không ghi DB; apply upsert `copies`, không xóa game ngoài file; owner quán B → 403; > 500 dòng → 422.
- Test: accept token → owner + `usedAt`; dùng lại → 410; quá 30 ngày → 410; tạo link mới → link cũ 410; 2 accept đồng thời → 1 thành công; DB không có token thô; từ chối → quán biến khỏi list/chi tiết/sitemap (404 public), admin vẫn thấy; bật lại → hiện `granted`; không phản hồi → vẫn `public_info_only`; owner A PATCH quán B → 403; owner gửi `consentStatus` qua PATCH → bị bỏ qua; test cafes cũ (apps/api/src/modules/cafes/cafes.test.ts) vẫn pass.
- E2E headless: admin tạo link → user mới đăng ký qua link → đồng ý → sửa giờ mở cửa → import CSV 5 dòng (1 unmatched bỏ qua) → trang quán public hiện 4 game.

## Risks
- Link lộ/chuyển nhầm (M×H) → single-use, 30 ngày, hash, thu hồi; admin gỡ member.
- Nới quyền route quán (M×H) → test 403 chéo quán từng route.
- Quên filter `declined` ở 1 surface (M×H) → 1 predicate `publicCafeWhere`; grep `consentStatus` phải chỉ còn trong predicate + admin; test từng surface.
- Import CSV khớp nhầm game (M×M) → trigram chỉ gợi ý, owner phải chọn; không auto-apply `suggested`.
- Pitch sai dữ liệu/pháp lý (M×H) → xác minh trước pilot + trang nguồn dữ liệu + rà luật 91/2025.
- Rollback: trả middleware về `requireRole`; đổi `declined` → `public_info_only` rồi bỏ enum; drop bảng mới.

## Later: self-claim + admin duyệt
User bấm "Tôi là chủ quán" → bằng chứng → `cafe_claims(id, cafeId, userId, evidence jsonb, status pending|approved|rejected, reviewNote, reviewedBy, reviewedAt, createdAt)` → `/admin/claims` duyệt → `cafe_members owner` + consent như trên. Ước 1-1.5d, lập kế hoạch lại khi cần.
