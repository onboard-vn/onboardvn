---
phase: 6
title: "Template do user đóng góp + kiểm duyệt"
status: pending
effort: "2d"
dependencies: [3]
---
# Phase 6: Template contributions + moderation

## Context
- Pattern tái dùng (commit d624215, 2c97a65): `apps/api/src/modules/cafes/community.ts` (`addCommunityGamesService`:54, `adminListContributionsService`:156, `adminBlockContributionsService`:197, `adminUnblockContributionsService`:218), audit `cafe_game_events` (apps/api/src/db/schema/cafes.ts:94), `admin_audit_log` (apps/api/src/db/schema/meetups.ts:115), cờ `users.contributionBlockedAt` (apps/api/src/db/schema/auth.ts:38), web `apps/web/app/admin/contributions/`.
- Khác café: template cần **duyệt trước khi công khai** (café hiện ngay).
- Chạy sau phase 5 vì thứ tự migration (dùng chung thư mục drizzle).

## Requirements
- User đăng nhập (không bị `contributionBlockedAt`): tạo template mới cho game chưa có / đề xuất version mới từ version hiện hành → `score_template_versions.status=pending`, `authorId`, `sources` ≥1, `confidence` tự chọn.
- Editor web: form theo schema (categories, formula, tiebreakers) + JSON nâng cao; preview live với `computeScores`; bắt buộc ≥1 test case (input + expected total) lưu trong `definition`-kèm `testCases` (cột riêng `test_cases jsonb`) → server chạy khi submit, fail → 422.
- Pending chỉ tác giả + admin/maintainer thấy; dùng được trong ván riêng của tác giả? **Không** (giữ đơn giản: chỉ approved dùng để ghi ván).
- Admin `/admin/score-templates`: danh sách pending (diff JSON so với current), approve (→ current, cũ `superseded`), reject (note), block contributor (dùng chung cờ). Danh tính tác giả: chỉ admin thấy (như café) — public DTO không có `authorId`.
- Audit: mỗi submit/approve/reject vào `admin_audit_log` (hoặc bảng events riêng nếu log hiện tại chỉ cho admin action — giữ 1 nguồn: `admin_audit_log` cho approve/reject, submit lưu ở chính version row).
- Rate limit 10 submit/ngày/user.

## Files
- Create: `apps/api/src/modules/score-templates/contributions.ts` (+ test), `apps/web/app/games/[slug]/score-template/edit/page.tsx`, `apps/web/components/score-template-editor.tsx`, `apps/web/app/admin/score-templates/page.tsx`.
- Modify: `apps/api/src/db/schema/score-templates.ts` (`testCases`), `apps/api/src/modules/score-templates/routes.ts`, `packages/shared/src/score-templates.ts`.

## Steps
0. Backup DB. 1. Migration `test_cases`. 2. Service submit/approve/reject + rate limit + block. 3. Routes user + admin. 4. Editor + preview. 5. Admin queue + diff.

## Validation
- Test: user bị block → 403; submit invalid/expr độc hại → 422; test case sai → 422; pending không hiện ở `GET /games/:slug/score-templates` cho người khác; approve → current đổi, ván cũ giữ version; DTO public không có authorId; 11 submit/ngày → 429; audit có dòng approve/reject.

## Risks
| Risk | L×I | Mitigation |
|---|---|---|
| Template sai lan vào ván | M×M | duyệt bắt buộc + test case + confidence hiển thị |
| Editor phức tạp, tốn công | M×M | form cơ bản + JSON textarea có validate; không builder kéo thả |

## Rollback
Tắt route submit; drop cột `test_cases`; pending rows xóa theo `status='pending'`.
