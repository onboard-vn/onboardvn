---
phase: 7
title: "Chủ quán: link mời owner + consent + /my-cafes"
status: pending
effort: "2.5d"
dependencies: ["P1b phase 1"]
---
# Phase 7: Chủ quán — link mời owner + consent

## Context
- **Chốt 2026-09-25**: tạm thay self-claim bằng **link mời chủ quán do admin cấp**. Self-claim + admin duyệt chuyển sang **Later** (cuối file). Chạy ở bước (3) của thứ tự thực thi (plan.md), sau import quán Hà Nội.
- Quán import hiện **public với thông tin cơ bản** (`consentStatus='public_info_only'`, ẩn chi tiết ở apps/api/src/modules/cafes/service.ts:24,60). Enum hiện có `granted|pending|public_info_only` + `consentNote` (apps/api/src/db/schema/cafes.ts:34-35).
- Tái dùng thiết kế P2 (plans/260924-1854-p2-cafe-owners-import/plan.md): `cafe_members`, `requireCafeRole`, dashboard. **P2 cắt còn import CSV/JSON + preset + template** (không sửa P2).
- Write route quán hiện `requireRole('maintainer','admin')` (apps/api/src/modules/cafes/routes.ts:55,64,74,83,97,111,120); `requireRole` ở apps/api/src/auth/middleware.ts:22-30. Mailer `apps/api/src/lib/mailer/` (P1b-1).
- DTO manage có `addedBy` (service.ts:56) → không dùng cho chủ quán.

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

## Data
- `cafes.consentStatus` enum + `'declined'`; filter public loại `pending` **và** `declined` (apps/api/src/modules/cafes/repo.ts:26, service.ts:132).
- `cafe_members(cafeId, userId, role 'owner'|'staff', createdAt)` PK(cafeId,userId), index userId.
- `cafe_owner_invites(id, tokenHash unique (sha256), cafeId cascade, createdBy, createdAt, expiresAt, usedAt null, usedBy null, revokedAt null)`; partial unique (cafeId) where `usedAt IS NULL AND revokedAt IS NULL`. Không lưu token thô.
- `cafe_claims` **chưa tạo** (Later).

## Files
- Create: `apps/api/src/db/schema/cafe-owners.ts`, `apps/api/src/auth/cafe-role.ts` (`requireCafeRole(...roles)`: maintainer/admin pass-through; hoặc member có role), `apps/api/src/modules/cafe-owners/{routes,service,repo,cafe-owners.test}.ts`, `packages/shared/src/cafe-owners.ts`.
- Create web: `apps/web/app/my-cafes/{page.tsx,invite/[token]/page.tsx,[id]/page.tsx,[id]/consent/page.tsx,[id]/scan/page.tsx,new/page.tsx}`, `apps/web/app/admin/cafes/[id]/owner-invite.tsx`.
- Modify: `apps/api/src/db/schema/cafes.ts` (enum), `apps/api/src/modules/cafes/{repo,service}.ts` (filter `declined`, `getCafeForOwnerService` không `addedBy`), `apps/api/src/modules/cafes/routes.ts` (PATCH `/:id`, games add/patch/delete/bulk → `requireCafeRole('owner','staff')`; POST `/`, DELETE `/:id`, `/manage` giữ staff global), `apps/web/app/admin/scan/scan-session.tsx` → tách lõi `apps/web/components/scan-session.tsx`, `apps/web/app/sitemap.ts`, đăng ký.

## API
- `POST /admin/cafes/:id/owner-invites` → `{url, expiresAt}` (token chỉ trả 1 lần), `DELETE /admin/cafes/:id/owner-invites/:inviteId`, `GET /admin/cafes/:id/owner-invites` (không trả token).
- `GET /owner-invites/:token` (preview tên quán, trạng thái), `POST /owner-invites/:token/accept` (requireUser).
- `POST /me/cafes/:id/consent {decision:'granted'|'declined', reason?}` (owner), `GET /me/cafes`, `POST /me/cafes/:id/staff {username}`.

## Steps
1. Schema + migration (enum, `cafe_members`, `cafe_owner_invites`). 2. Filter `declined` + test public. 3. `requireCafeRole` + ma trận test. 4. Invite: tạo/thu hồi/accept (transaction, `FOR UPDATE` invite). 5. Consent + mail thông báo admin khi owner từ chối. 6. `/my-cafes` + tách scan-session. 7. Docs `docs/` mục chủ quán (ngắn).

## Validation
- Test: accept token → owner + `usedAt`; dùng lại → 410; quá 30 ngày → 410; tạo link mới → link cũ 410; 2 accept đồng thời → 1 thành công; DB không có token thô; từ chối → quán biến khỏi list/chi tiết/sitemap (404 public), admin vẫn thấy; bật lại → hiện `granted`; không phản hồi → vẫn `public_info_only`; owner A PATCH quán B → 403; owner gửi `consentStatus` qua PATCH → bị bỏ qua; test cafes cũ (apps/api/src/modules/cafes/cafes.test.ts) vẫn pass.
- E2E headless: admin tạo link → user mới đăng ký qua link → đồng ý → sửa giờ mở cửa ở `/my-cafes`.

## Risks
- Link lộ/chuyển nhầm (M×H) → single-use, 30 ngày, hash, thu hồi; admin gỡ member.
- Nới quyền route quán (M×H) → test 403 chéo quán từng route.
- Quên filter `declined` ở 1 surface (M×H) → gom 1 hàm `isPubliclyVisible` dùng cho list/detail/sitemap/map/llms; test từng surface.
- Rollback: trả middleware về `requireRole`; đổi `declined` → `public_info_only` rồi bỏ enum; drop bảng mới.

## Later: self-claim + admin duyệt
User bấm "Tôi là chủ quán" → bằng chứng → `cafe_claims(id, cafeId, userId, evidence jsonb, status pending|approved|rejected, reviewNote, reviewedBy, reviewedAt, createdAt)` → `/admin/claims` duyệt → `cafe_members owner` + consent như trên. Ước 1-1.5d, lập kế hoạch lại khi cần.
