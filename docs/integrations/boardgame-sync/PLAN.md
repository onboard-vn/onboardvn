# Roadmap triển khai sau nghiên cứu

2026-10-16. Proposal, chưa coding approval. [Scope](SCOPE.md), [research](RESEARCH.md), [architecture](ARCHITECTURE.md), [tests](TEST_PLAN.md). Research contract đã chốt; roadmap còn các gate dưới đây.

## Executive summary

Làm được ngay ở mức thiết kế/contract: tái dùng backend/scorer/private club adapter; thiết kế BG Stats user-confirmed play push và file import có preview. Android đã kết nối và mở cả hai app, xác nhận menu backup và link/file declarations. Chưa có adapter mới hoạt động trong OnBoardVN.

Đã thử current BG Stats JSON export và same-namespace create/replay/changed-score update. Còn thử UUID stability, file round-trip, timezone, cross-device links và BG Catalog backup/QR schema. Cần quyền: BGG application/license và quyền sử dụng dữ liệu theo mục tiêu; BGG writes hoặc external club writes chỉ khi có contract hợp lệ. Chưa nên làm: hứa full automatic two-way, private API/cookie/password integrations, UI automation production hoặc BGG làm kênh bảo toàn mọi field.

Đề xuất hybrid canonical + adapters. MVP tối ưu: web lưu ván thật + tính điểm theo scope đã nghiệm thu, preview/mapping/import file BG Stats và push BG Stats có user confirm; BGG public import là capability riêng chỉ bật sau approval. BG Catalog/CLB giới hạn theo contract thực có. Giữ cả ba vai trò sản phẩm và năm game ưu tiên trong roadmap; không cắt scope vì provider chưa có quyền.

## Giả định effort

Một kỹ sư quen TypeScript/PostgreSQL, hỗ trợ review bán thời gian, synthetic fixtures sẵn, không tính thời gian chờ provider hoặc hoàn thiện toàn bộ sản phẩm ngoài interoperability. Đơn vị ngày làm việc. Ước tính planning, không cam kết deadline; full game companions/print assets cần game-specific specs nên chưa thể báo tổng đáng tin.

| Phase | Dependency | Effort dự kiến | Gate |
|---|---|---|---|
| 0 Research/PoC và web decision | Không | 3–6 ngày còn lại | Current schemas, safe fixtures, owner chọn web surface |
| 1 Canonical import foundations + web MVP | 0 | 10–18 ngày | Real persistence, private preview/apply, 5 game scoring coverage matrix |
| 2 Interoperability adapters và UX | 1; quyền từng provider | 6–12 ngày | BG Stats file/link tests; BGG read gated; Catalog có contract |
| 3 Incremental reliability/conflicts | 2 verified capabilities | 8–15 ngày | Durable jobs, reconciliation, loop/concurrency/failure tests |
| 4 Expanded companions, print và ecosystem | 1; game specs/content rights | Phải estimate từng game | Approved rules/assets, no fabricated gameplay |

Các khoảng không bao gồm web framework migration/parity diện rộng; đánh giá riêng ở phase 0 trước khi cam kết phase 1.

## Phase 0 — research và controlled PoC

Goal: đóng các Unknown ảnh hưởng MVP. Không implementation/production sync. Owner đã duyệt narrow local synthetic batch theo SCOPE.md: tạo fixture, replay/update, local export/QR khi không remote upload, giữ records. BG Stats batch đã thực hiện như report; mọi bước ngoài scope đó vẫn cần phê duyệt.

- Source audit hoàn thành ở working tree; audit output trong research plan reports. Chọn Next.js hay Expo web bằng parity inventory/owner decision, không coi web-first là framework choice.
- Owner hoàn tất BG Stats onboarding nếu muốn inspect thêm; chuẩn bị synthetic exports và test account với Auto-post off. BG Catalog export/QR cần permission riêng khi tạo sample.
- BGG: owner chuẩn bị application approval và xác minh scope/license/transform/export; giữ token ngoài repository. PoC read-only chỉ sau available credentials/approval.
- Validate exact file refs, UUIDs, date precision, score text and duplicate/update behavior. Không chạy existing club sync vì ghi DB.
- File owners: research docs/reports; proposed API/shared/web owner list từ source audit. Không tạo migration trong phase nghiên cứu này.
- Acceptance: mỗi feasibility cell có evidence hoặc explicit Unknown; current fixtures sanitized; web decision và MVP acceptance được owner chốt.
- Risks/fallback: BGG 403/approval chậm → file/link lane độc lập; Catalog unknown → roadmap gate, không fake adapter. Test plan bên dưới.

## Phase 1 — canonical và web dùng thật

Goal: lưu ván thật, privacy-safe import foundation và five-game scoring acceptance. Out of scope: unattended two-way, unsupported provider writes, full in-play automation chưa có spec.

Backend/database/shared:

- Evolve `apps/api/src/db/schema/{games,shelf,plays,external,identities}.ts`, new integration schema, schema index và sequential Drizzle migrations. Backup/restore-check trước mọi DB change.
- Define account-scoped mappings/source snapshots, score-only historical mode, date precision, collections/copies, consent và tombstones. Migrate existing data không tự merge by slug/nickname.
- New `apps/api/src/integrations/boardgame-sync/` for capabilities/staging/preview/apply/idempotency; shared Zod DTOs in `packages/shared/src/`; Hono route→service→repo conventions. Register routes in app.ts, một owner cho schema/export indexes.
- Reuse shared scorer/version pinning; enforce server recompute only for calculated plays; historical imported final totals do not get fabricated inputs.

Web:

- Owning selected web surface gets actual score/history persistence; remove mock dependency from delivered flow without disturbing unrelated routes.
- Acquire/Agricola/Critter Kitchen/Grand Austria Hotel/The Gang acceptance matrix with editions, categories, outcomes, companion opportunities and known exclusions. Agricola template/UI and GAH edition require rule review. Critter Kitchen unsupported rumors/Sauces remain explicit pending verified rules, not silently claimed complete.
- Integrations list, upload/source scope, preview/loss/match/conflict and apply/history screens. Export canonical own data without provider-restricted fields.

Acceptance/tests: same source imported twice creates one mapping/result; stale preview/concurrent apply safe; no cross-club access; real web reload retains score/result; all five games have agreed minimal scoring/outcome flows. Generic unsupported rules visible. Failure leaves transaction unchanged.

Risk/fallback: unknown imported score semantics blocks canonical finalization design; resolve before migration. Rollback reversible import batches with rev checks; DB schema rollback backup-tested. Full web parity beyond these flows separately estimated.

## Phase 2 — adapter-based interoperability

Goal: usable user-assisted exchange and licensed reads; out of scope: claiming full auto sync.

- BG Stats exporter maps durable source IDs/UUIDs, emits only tested fields. Link review warns recipient matching, lossy fields and possible existing Auto-post. Track handoff ambiguous; no auto retries. JSON/.bgsplay parser versions/limits/refs validated with synthetic fixtures.
- BGG adapter public import metadata/collection/plays only after license/token gate. Separate application registration from unverified username, public/private data, item IDs/copies and play reporting owner.
- BG Catalog adapter remains disabled until stable export/QR schema and permission established. Reuse validated user-assisted transport, not app sandbox/private endpoints.
- Extend club read DTO only if actual permitted upstream data supports it; no development access required by design. Current roster/inventory/meetings support does not establish completed results or outbound writes.
- API/shared integration modules; web Settings/Integrations preview, source history, export/QR routes. Database staging/source mapping from phase 1.

Acceptance/tests: file round-trip and replay/update fixtures; link absent/cancel/oversize/midnight tests; BGG complete-pagination/202 tests and private exclusions; Catalog/club unsupported cells honestly disabled. Disconnect stops jobs; removing imported personal data respects shared sessions.

Risk/fallback: provider change → capability disabled, canonical data retained, own export available. Never use BG Stats as unapproved hidden BGG write proxy; user intentionally controls its own app settings.

## Phase 3 — incremental reliability

Goal: background behavior for verified lanes. Out of scope: unsupported real-time/webhooks and automatic destructive merge/delete.

- PostgreSQL-backed jobs/checkpoints/leases, worker entrypoint and scheduler; provider request budget, jitter/backoff, bounded attempts and action-required states. No new queue service without demonstrated need.
- Full/rotating reconciliation detects old edits and candidate deletions; partial/failed scope cannot advance watermark or remove records.
- Three-way conflicts/field provenance and policy, outbox/receipt only for licensed writes; origin/revision suppression prevents echo loops. Shared multi-user session reporting copies remain separate mappings.
- UI manual resolution, retry, revoked/offline/provider-down states, dry-run summaries and rollback safeguards.

Acceptance/tests: two workers at-least-once safe; response lost/no duplicate; crash resume; source→BGG→source loop stable; offline changes/conflicts surfaced; ambiguous handoff not repeated. BGG/club writes require independent provider authorization, not phase number.

Risk/fallback: provider lacks modified cursor → bounded full scans plus explicit freshness limits; cannot meet budget → show delayed state rather than claim up to date.

## Phase 4 — companions, printing và ecosystem

Goal: deliver owner's broader vision game by game. Không bỏ năm game ưu tiên hoặc mặc định mọi game cần cùng mức automation.

- For each game: inventory current scorer/assets; specify setup, in-play actions, hidden info, round tracking, finalization and allowed advanced rules. Owner accepts before coding.
- Printable cards: determine existing/licensed/user-supplied assets, translations, card size/bleed/front-back alignment, print PDF acceptance; respect private content and redistribution permissions. Do not equate source repo license with rights to all game artwork.
- Companion and print state links to canonical sessions when useful; local-only hidden roles must not leak through shared export. No automatic game-state claim beyond implemented rules.
- Shared sessions/social extensions reuse existing identity/access gates, optional future providers get isolated adapter contracts.
- Files/modules and effort determined per accepted game spec; use existing game modules before creating new ones. Test rules against official sources and physical play; proof print one sheet before batch.

## Blockers và owner preparation

1. Web surface choice after parity inventory; stable web acceptance beyond integration scope.
2. Synthetic BG Stats and BG Catalog samples/test accounts; explicit permission before any write PoC.
3. BGG approval/license, attribution and allowed normalization/export; future writes require cooperation.
4. Club upstream permitted interface and semantics; no outbound/result contract assumed.
5. Game editions/advanced rule scope and printable asset rights. Current source work is unverified WIP, not production parity.

Research/plan delivery không cho phép triển khai. Không commit/push/deploy trong task này.

## Follow-up evidence và adjustment 2026-10-16

- BG Stats device menus đã inspect sau đăng nhập; BGG inbound không update existing plays. Phase 0 phải thử riêng BGG-new-only versus JSON/.bgsplay update, không áp dụng cùng semantics.
- Canonical foundation cần source-to-session link grouping cho quantity/split; expansion/variant text comments không thay structured data.
- CLB logged-in browser confirms planning/history/catalog/member surfaces, không xác nhận completed results hoặc stable public API. RSC POST từ read UI không được tự replay thành write adapter.
- Khảo sát đầu giữ read-only; approved synthetic follow-up sau đó đã tạo/update fixture và local JSON export trong BG Stats. Không remote share/sync hoặc settings changes. Latest reports trong RESEARCH.md.

## Synthetic experiment progress

BG Stats local createPlay create/replay/update and JSON export completed under separate owner approval; one persisted play after score/comment revision. Phase 0 remaining: timezone semantics, current file newer/older UUID reimport, .bgsplay, full collection/tag/sheet coverage and Catalog format. No generic capability completion inferred. See RESEARCH.md synthetic evidence; no application implementation authorized.
