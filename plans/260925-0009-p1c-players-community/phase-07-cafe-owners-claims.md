---
phase: 7
title: "Chủ quán: claim + membership"
status: pending
effort: "2.5d"
dependencies: ["P1b phase 1"]
---
# Phase 7: Chủ quán — claim + membership

## Context
- Tái dùng thiết kế P2 (plans/260924-1854-p2-cafe-owners-import/plan.md, mục Quyết định + phases 1-3): `cafe_members`, `cafe_claims`, `requireCafeRole`, dashboard `/quan-cua-toi`. **P2 cần cắt còn import CSV/JSON + preset + template** (ghi trong report; không sửa P2).
- Hiện mọi write route quán yêu cầu `requireRole('maintainer','admin')` (apps/api/src/modules/cafes/routes.ts:55,64,74,83,97,111,120). `requireRole` ở apps/api/src/auth/middleware.ts:22-30. Mailer ở `apps/api/src/lib/mailer/` (P1b-1).
- DTO manage có `addedBy` (apps/api/src/modules/cafes/service.ts:56) → không dùng cho chủ quán.

## Requirements
- User bấm "Tôi là chủ quán" trên trang quán → form bằng chứng (link tin nhắn fanpage, SĐT, ghi chú; ảnh để sau nếu chưa có upload — dùng `lib/storage` nếu sẵn).
- Chủ quán đề xuất quán mới → tạo `cafes` `consentStatus='pending'` + claim kèm theo.
- Admin/maintainer duyệt ở `/admin/claims`: approve → tạo `cafe_members owner`, `consentStatus='granted'`, `verifiedAt=now`, email thông báo; reject có lý do.
- Owner mời staff (bằng username) → `cafe_members staff`.
- Owner đã xác minh tạo cơ sở mới → tự duyệt (`granted`).
- `/quan-cua-toi`: danh sách cơ sở, sửa thông tin, quản lý kho (thêm/gỡ/số bản, quét — tái dùng scan-session), duyệt/gỡ đóng góp cộng đồng (phase 8).
- Chủ quán cũng là người chơi: không có role toàn cục mới.

## Data
- `cafe_members(cafeId, userId, role 'owner'|'staff', createdAt)` PK(cafeId,userId), index userId.
- `cafe_claims(id, cafeId, userId, evidence jsonb, status 'pending'|'approved'|'rejected', reviewNote, reviewedBy, reviewedAt, createdAt)`; partial unique (cafeId,userId) where pending.

## Files
- Create: `apps/api/src/db/schema/cafe-owners.ts`, `apps/api/src/auth/cafe-role.ts` (`requireCafeRole(...roles)`: staff global maintainer/admin pass-through; hoặc member có role), `apps/api/src/modules/cafe-claims/{routes,service,repo,cafe-claims.test}.ts`, `apps/api/src/lib/mailer/templates/claim-*.ts` (theo cấu trúc thật của mailer), `packages/shared/src/cafe-owners.ts`.
- Create web: `apps/web/app/cafes/[slug]/nhan-quan/page.tsx`, `apps/web/app/quan-cua-toi/{page.tsx,[id]/page.tsx,[id]/quet/page.tsx,moi/page.tsx}`, `apps/web/app/admin/claims/page.tsx`.
- Modify: `apps/api/src/modules/cafes/routes.ts` (PATCH `/:id`, games add/patch/delete/bulk → `requireCafeRole('owner','staff')`; POST `/`, DELETE `/:id`, `/manage` giữ staff global), `apps/api/src/modules/cafes/service.ts` (thêm `getCafeForOwnerService` DTO không `addedBy`), `apps/web/app/admin/scan/scan-session.tsx` → tách lõi thành `apps/web/components/scan-session.tsx` nhận `cafes` + `mode`, đăng ký.

## Steps
1. Schema + migration. 2. `requireCafeRole` + test ma trận (owner quán A vs quán B, staff, maintainer, anon). 3. Chuyển middleware cafe routes; chủ quán không được đổi `consentStatus`/`sourceUrl` (strip trong service theo actor). 4. Claim flow + admin review + mail. 5. Dashboard + tách scan-session dùng chung admin/owner. 6. Docs: `docs/` mục chủ quán (ngắn).

## Validation
- Test: owner A PATCH quán B → 403; approve claim → member + granted + mail console ghi nhận; claim trùng pending → 409; owner đổi consentStatus → bị bỏ qua/422; tất cả test cafes cũ (apps/api/src/modules/cafes/cafes.test.ts) vẫn pass.
- E2E headless: claim → admin duyệt → owner sửa giờ mở cửa.

## Risks
- Nới quyền route quán làm hở (M×H) → test 403 chéo quán cho từng route đã đổi.
- Claim giả (M×M) → duyệt thủ công + bằng chứng; admin thu hồi member.
- Rollback: trả middleware về `requireRole`; drop bảng mới (quán `pending` đã tạo giữ nguyên).
