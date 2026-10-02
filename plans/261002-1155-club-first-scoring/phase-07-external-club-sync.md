---
phase: 7
title: "Adapter sync club ngoài (ACL)"
status: pending
effort: "2.5d"
dependencies: [1, 3]
---
# Phase 7: External club sync

## Context
- Recon: private notes (plans/private, gitignored). Data is read via plain GET of public pages (Next.js RSC flight payload), parsed by the private plugin.
- Thay P1d của P1c. Không Server Action, không secretId.
- `clubs.external_source/external_id` có từ phase 1; `upsertGameFromExternal` từ phase 3.

## Requirements
- Module cô lập `apps/api/src/integrations/external-club/ (generic) + private plugin`: `client.ts` (fetch GET + `RSC: 1`, UA rõ ràng, timeout, 1 req/s, retry 2), `rsc-parser.ts` (tách dòng `N:` → JSON, tìm object theo key `games|members|...`), `mappers.ts` (DTO ngoài → model nội bộ), `sync.ts` (orchestrate). Domain code **không import** gì từ module này ngoài `sync.ts` entry.
- Bước 0 (spike 0.5d): verify `/members`, `/history`, `/day/<date>` bằng curl, lưu fixture **đã ẩn danh** vào `__fixtures__/` (nickname → `member-N`), không commit dữ liệu thật.
- Bảng: `external_records(id, source, kind games|members|days, externalId, payloadHash, payload jsonb, firstSeenAt, lastSeenAt)` UNIQUE(source, kind, externalId); `sync_runs(id, source, startedAt, finishedAt, status, counts jsonb, error)`; `club_external_members(id, clubId, externalId, nickname, linkedUserId null → users set null)` UNIQUE(clubId, externalId); `club_external_ownerships(clubId, gameId, externalMemberId)` PK.
- Map: games → catalog qua `upsertGameFromExternal` (provenance `source_url`); members → `club_external_members` (placeholder club-scoped, private: chỉ member club thấy; user thật claim bằng cách join club + admin club link); owners → `club_external_ownerships` (kho club phase 5 union thêm nguồn này); days/history → chỉ `external_records` + đếm `players · tables` trên calendar club (chờ quyết định import thành Kèo).
- CLI `pnpm --filter api sync:club --club <slug> --club <slug> [--dry-run] [--kinds games,members,days]`; dry-run in diff (new/changed/gone). Chạy tay hoặc systemd timer/cron trên VPS (doc trong docs/deployment.md). Bản ghi biến mất ở nguồn → đánh dấu `lastSeenAt` cũ, không xóa cứng.
- Privacy: payload member chỉ trong DB; `.gitignore` cho `data/private/`; log không in nickname (chỉ count).
- Ghi ngược nickname/avatar: **ngoài phạm vi** (Server Action replay, fragile).

## Files
- Create: `apps/api/src/integrations/external-club/ (generic) + private plugin{client,rsc-parser,mappers,sync,sync-cli}.ts`, `.../{rsc-parser,sync}.test.ts`, `.../__fixtures__/*.rsc` (ẩn danh), `apps/api/src/db/schema/external.ts`, `deploy/onboard-club-sync.{service,timer}`.
- Modify: `apps/api/src/modules/clubs/stats-repo.ts` (union ownership ngoài + đếm days), `apps/api/package.json`, `.gitignore`, `docs/deployment.md`, đăng ký schema.

## Steps
0. Spike verify routes + fixture. 1. Backup DB + migration. 2. Parser + test fixture. 3. Mappers + sync idempotent (hash payload). 4. CLI dry-run/real. 5. Tích hợp kho/calendar club. 6. Timer VPS + doc.

## Validation
- Test: parser với fixture thật đã ẩn danh; payload đổi format (thiếu key) → run `failed`, không ghi nửa chừng (1 tx/kind); chạy 2 lần → 0 thay đổi; dry-run không ghi; game trùng tên với catalog → match, không tạo mới; `git grep` không có nickname thật.
- Manual: chạy trên VPS với club thật, so tổng game (≈596 base) và member (≈71).

## Risks
| Risk | L×I | Mitigation |
|---|---|---|
| App ngoài đổi RSC/route | H×M | ACL cô lập, fail-closed + `sync_runs.error`; fixture test báo sớm |
| Điều khoản/đồng ý của chủ app ngoài | M×H | xin phép admin club ngoài trước khi chạy cron; chỉ GET, rate-limited |
| Lộ dữ liệu member | M×H | placeholder chỉ hiện cho member club; không commit; log không PII |
| Trùng game do tên khác | M×M | chuẩn hóa + review danh sách tạo mới ở dry-run |

## Rollback
Tắt timer; drop `club_external_*`, `external_records`, `sync_runs`; game đã tạo giữ (có thể đã được dùng trong ván).

## Open questions
- Placeholder member hay bỏ qua member chưa có tài khoản? (đề xuất placeholder)
- Import day/table thành Kèo `club` thật (cần participant không phải user) hay chỉ raw + đếm? (đề xuất raw)
- Đã có đồng ý của admin app ngoài cho cron chưa?
