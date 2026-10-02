---
title: "Club-first + score calculator + mobile prep"
description: "Club private + identities/guests + lịch sử ván + máy tính điểm theo game + sync club ngoài (plugin private) + một app Expo cho iOS/Android/web"
status: in-progress
priority: P1
effort: "27d"
branch: feat/club-first-scoring
tags: [clubs, plays, scoring, sync, mobile, openapi]
created: 2026-10-02
---

# Club-first + score calculator + mobile prep

Thay thứ tự P1c còn lại ([plan P1c](../260925-0009-p1c-players-community/plan.md)): **club + ván chơi trước**. Tái dùng thiết kế [phase-05-clubs](../260925-0009-p1c-players-community/phase-05-clubs.md) và [phase-03-play-log](../260925-0009-p1c-players-community/phase-03-play-log.md); file này chỉ ghi phần thay đổi/bổ sung. Thay thế **P1d** (tích hợp club ngoài) bằng phase 7 dưới đây.

## Quyết định (chủ nhân chốt 2026-10-02)
1. Ưu tiên: club (private mặc định, role, Kèo `club`, invite code) + bảng `plays` (lịch sử ván).
2. Máy tính điểm theo game là lõi: template engine generic theo [schema.json](../../data/staging/score-templates/schema.json); template lưu Postgres jsonb, có version, ván pin version; hàm tính thuần TS trong `packages/shared`; evaluator biểu thức an toàn (không `eval`). Seed từ `data/staging/score-templates/*.json` (lưu `sources` + `confidence`). User tạo/sửa template qua kiểm duyệt (pattern community café). Bắt đầu với game trong tủ club.
3. Ghi ván bất kỳ lúc nào; Kèo prefill được ván. Comment thread trong Kèo. Link-out BGG/BGW/BG Stats/Boardgami trên trang game, không clone.
4. Sync club ngoài: adapter cô lập (ACL), chỉ GET `RSC: 1`; import vào DB với `external_source`+`external_id`; dữ liệu member private, không commit git; chạy tay/cron trên VPS. Ghi ngược (nickname/avatar) = để sau.
5. (bổ sung) Bộ lọc giàu cho catalog + tủ club: số người (+ BGG best), band độ nặng, thời gian, thể loại, cơ chế, `scoringFamily`, owner, có bảng điểm, độ tin cậy template. Dữ liệu enrichment (`enrichment/batch-*.json`) import vào `games`/`categories`/`game_categories` sẵn có. Research template theo lô `scoringFamily × weightBand`.
6. ~~Mobile native Kotlin/SwiftUI~~ → **đã thay bằng một app Expo** (xem Decisions cuối file).

## Quy tắc xuyên suốt
- `routes → service → repo` ([docs/architecture.md](../../docs/architecture.md)); Zod/DTO ở `packages/shared`.
- **Backup DB trước mỗi migration prod**: `deploy/backup.sh` + restore-check theo [docs/deployment.md:119-140](../../docs/deployment.md); dev: `pg_dump -Fc` trước `db:migrate`.
- Migration sinh tuần tự (`drizzle-kit generate`) → phase có migration chạy **tuần tự**: 1 → 3 → 4 → 5 → 6 → 7.
- File đăng ký dùng chung (1 owner/lúc, chỉ append): `apps/api/src/db/schema/index.ts`, `apps/api/src/app.ts:45-61`, `packages/shared/src/index.ts`, `apps/api/drizzle/*`.
- Server luôn tự tính lại tổng điểm/người thắng; không tin client.

## Trạng thái (2026-10-02, cuối session)
| Phase | Trạng thái |
|---|---|
| 1 Club core | ✅ xong (API + web + e2e `apps/web/e2e/clubs.spec.ts`) |
| 2 Score engine | ✅ xong (`packages/shared/src/scoring`), v4 dở trên nhánh `wip/scoring-v4` |
| 3 Enrichment + templates DB | 🟡 BGG metadata + 551 templates đã import; bộ lọc catalog chưa làm |
| 4 Plays + identities + guests | 🟡 backend xong (migration 0021/0022, SSE, claim); UI Expo mới là mock |
| 5 Club tabs + comment Kèo | ⬜ |
| 6 Template contributions | ⬜ |
| 7 External sync | ✅ plugin private `onboard-vn/onboardvn-private`; 100 ngày + 59 khách đã sync (dev + VPS) |
| 8 API mobile | 🟡 bearer + CORS dev; OpenAPI `/v1` chưa |
| 9 App | 🔁 chuyển sang Expo (`apps/mobile`, SDK 57) |

**Tạm dừng: toàn bộ phần tính điểm** (UI bảng điểm, rà soát template) — chủ nhân sẽ tham khảo BG Stats trước. Không làm tiếp khi chưa được yêu cầu. Handoff: [plans/handoffs/onboardvn-club-first-20261002-1625.md](../handoffs/onboardvn-club-first-20261002-1625.md).

## Phases
| # | Phase | Effort | Depends | Song song |
|---|-------|--------|---------|-----------|
| 1 | [Club core (private, role, invite, Kèo `club`)](./phase-01-club-core.md) | 3d | — | với 2 |
| 2 | [Score engine thuần TS + safe expr + test vectors](./phase-02-score-engine.md) | 2.5d | — | với 1 |
| 3 | [Game enrichment + bộ lọc + score templates DB + seed + link-outs](./phase-03-score-templates-db.md) | 3d | 1, 2 | — |
| 4 | [Plays + lịch sử ván + bảng điểm](./phase-04-plays-score-sheet.md) | 4d | 1, 3 | — |
| 5 | [Club tabs (members/games+lọc/calendar/bảng) + comment Kèo](./phase-05-club-tabs-meetup-comments.md) | 3d | 4 | — |
| 6 | [Template do user đóng góp + kiểm duyệt](./phase-06-template-contributions.md) | 2d | 3 | sau 5 (migration) |
| 7 | [Adapter sync club ngoài (ACL, RSC GET)](./phase-07-external-club-sync.md) | 2.5d | 1, 3 | sau 6 (migration) |
| 8 | [API v1 cho mobile: OpenAPI 3.1, bearer, phân trang, docs](./phase-08-mobile-api-prep.md) | 2.5d | 4, 5 | không migration |
| 9 | [Android MVP (Kotlin/Compose) + build CI/VPS](./phase-09-android-mvp.md) | 4.5d | 8 | — |

Tổng 27d. iOS/SwiftUI ngoài phạm vi (cần macOS, làm sau Android).

## Phụ thuộc
```
1 ─┬─> 3 ─> 4 ─> 5 ─> 8 ─> 9
2 ─┘    └─> 6 (sau 5)   
1,3 ──────> 7 (sau 6)
```

## Acceptance
- [ ] Tạo club private → người ngoài chỉ thấy tên + số member; join qua code; code chỉ lưu hash; Kèo `club` → non-member 404.
- [ ] `pnpm --filter @onboard/shared test`: mọi template seed có file vector và pass (gate: thiếu vector → fail).
- [ ] Evaluator từ chối `constructor`, `__proto__`, gọi hàm ngoài whitelist, chuỗi > 500 ký tự.
- [ ] Import enrichment idempotent, không ghi bggId chưa verify; `/games` và tủ club lọc được `players+bestAt`, weight band, time, category, mechanic, scoringFamily, (club: owner), hasScoreTemplate, confidence.
- [ ] Ghi ván (không cần Kèo) với template → tổng/rank/winner server tính khớp hàm shared; ván cũ giữ version khi template lên version mới.
- [ ] Ghi ván từ bàn Kèo club → prefill game + người ngồi, `clubId` tự set.
- [ ] Comment Kèo: chỉ người xem được Kèo mới đọc/viết; rate limit → 429.
- [ ] User gửi template → `pending`, chỉ tác giả + admin thấy; admin duyệt → thành version hiện hành; mọi thao tác có audit.
- [ ] `sync:club --dry-run` in diff, không ghi DB; chạy thật idempotent (lần 2 = 0 thay đổi); không file member nào trong git.
- [ ] `GET /api/v1/openapi.json` hợp lệ OpenAPI 3.1, test drift pass; request `Authorization: Bearer` gọi được `/api/v1/me`.
- [ ] APK debug build từ CI/VPS; login → xem club → RSVP Kèo → ghi ván có bảng điểm.
- [ ] docs/architecture.md, README.md, apps/mobile/README.md không còn Expo.

## Non-goals
iOS app, push notification, offline sync, ghi ngược lên app club ngoài, clone thống kê kiểu BG Stats, import BGG collection, bảng xếp hạng toàn quốc.

## Open questions
Xem cuối từng phase; tổng hợp: (a) club `public` có cần ngay không hay chỉ `private`; (b) member ngoài chưa có tài khoản: placeholder club-scoped (đề xuất) hay bỏ qua; (c) import lịch sử day/table của app ngoài thành Kèo hay chỉ lưu raw + đếm trên calendar (đề xuất raw); (d) Android tính điểm qua endpoint preview server (đề xuất) hay port hàm sang Kotlin; (e) CI Android: GitHub Actions hosted hay self-hosted runner trên VPS.

## Decisions (2026-10-02, owner)
- Clubs: private only in MVP.
- External members: separate table `club_external_members` (externalId, nickname, stats, external login ID stored for matching, userId nullable). Matching via private club invite link where the member enters their external ID. External login ID never returned in any API/DTO.
- External history: each day → private club Kèo; each table → meetup_table with players.
- Android: offline scoring (Kotlin port of engine, shared JSON golden vectors with TS), plays stored locally with client UUID, idempotent sync; server recomputes authoritative totals.
- Android builds: local (Android Studio) for dev; release APK/AAB via GitHub Actions (hosted runner). Remove `apps/mobile` Expo stub → `apps/android`.
- Score templates: schema v3 (`data/staging/score-templates/schema.json`), imported into `score_templates` by `pnpm db:import-club-games`; BGG raw cached in gitignored `data/private/`, stored in `game_external_metadata` (private).
- Open-source hygiene: club data (inventory snapshot, members, recon notes) lives only in gitignored `data/private/` and `plans/private/`. External club base URL comes from env (`EXTERNAL_CLUB_BASE_URL`), never hardcoded; adapter ships generic (Next.js RSC flight parser) without club-specific secrets.
- External club adapter = private plugin repo `../onboard-vn-private` (sibling dir, local git, deployed only to the owner's VPS). Public repo defines `ExternalClubSource` interface (returns normalized DTOs: games, members, days/tables) + generic sync service writing DB + loader via env `EXTERNAL_CLUB_PLUGIN` (path to plugin module) and `EXTERNAL_CLUB_BASE_URL`. On VPS the plugin dir is mounted into the API container. Nothing club-specific committed to the public repo.
- Phase 7: owner approved syncing members/history into the private club (never public; visible only to club members).
- 2026-10-02 (supersedes the Android/Kotlin decisions above): ALL clients move to one Expo app (Expo Router, universal iOS + Android + web). SEO is not a priority (non-profit). Score engine, Zod contracts and API client are reused directly from `packages/shared`; offline scoring = same TS engine on device. Next.js `apps/web` is feature-frozen (bug fixes only) and retired once the Expo web build reaches parity. Builds: Android via `eas build --local` on the VPS or EAS cloud; iOS via EAS cloud (no local Xcode needed); store upload via EAS Submit.
- Score UI = hybrid: generic renderer from template (quick-total + detailed modes) + per-game custom input components registered by slug for the ~20 most-played club games; both write the same template categories.
- Guests: unified `identities` (member | guest | external). Guest = display name + optional birth year, linked to inviter; claim via link or self-claim confirmed by inviter/club admin; merge moves all plays/seats to the user.
