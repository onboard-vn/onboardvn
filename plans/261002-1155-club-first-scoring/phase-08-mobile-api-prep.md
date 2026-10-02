---
phase: 8
title: "API v1 cho mobile"
status: pending
effort: "2.5d"
dependencies: [4, 5]
---
# Phase 8: Mobile API prep

## Context
- Research: [native stack](../reports/researcher-261002-1137-native-multiplatform-stack.md) — giữ Hono, contract OpenAPI 3.1 → client Kotlin (openapi-generator) / Swift (swift-openapi-generator).
- Hiện có `GET /api/openapi.json` dựng tay từ Zod (`apps/api/src/modules/openapi/document.ts`, `JSON_SCHEMA_OPTS = { target: 'openapi-3.0' }`, chỉ route đọc công khai; DTO mirror ở `dto-schemas.ts`). API mount `/api` (apps/api/src/app.ts:93).
- better-auth plugins: `emailOTP, username` (apps/api/src/auth/better-auth.ts:5,123) — chưa có bearer.
- docs còn Expo: docs/architecture.md:17,25,54; README.md:18,37; apps/mobile/README.md.

## Requirements
- **OpenAPI 3.1**: mở rộng generator hiện có (KISS, không migrate toàn bộ route sang `@hono/zod-openapi`): target `openapi-3.1` (verify Zod 4 `toJSONSchema` target hỗ trợ; nếu không → `draft-2020-12` vốn tương thích 3.1), phủ route mobile cần: auth/session, me, clubs, events (+RSVP, comments), plays, score-templates (+preview), games đọc. Kèm `securitySchemes` bearer + cookie.
- Test drift: snapshot `openapi.json` commit tại `apps/api/openapi/v1.json`; CI so khớp; thay đổi phá vỡ (xóa field/route) → fail (script diff đơn giản theo path+required).
- **`/v1`**: mount cùng router tại `/api/v1` (web giữ `/api`, alias không trùng logic). Mobile chỉ dùng `/api/v1`. Quy tắc: chỉ thay đổi additive trong v1.
- **Bearer**: thêm plugin `bearer()` của better-auth (verify tên/API theo docs hiện hành trước khi code); token trả qua header `set-auth-token`; CSRF middleware bỏ qua request có `Authorization: Bearer` và không cookie.
- **Phân trang**: cursor `(sortKey, id)` + `limit ≤ 50` thống nhất cho list mobile dùng (events, clubs, club games, plays) — `{items, nextCursor}`; list cũ của web giữ shape nếu đã khác (thêm cursor optional).
- Docs: bỏ Expo; ghi kiến trúc mới (Android Kotlin/Compose + iOS SwiftUI sau, client sinh từ OpenAPI, bearer); `apps/mobile/README.md` → trỏ `apps/android` (phase 9).

## Files
- Modify: `apps/api/src/modules/openapi/{document,dto-schemas,routes,openapi.test}.ts`, `apps/api/src/app.ts` (mount `/api/v1`), `apps/api/src/auth/better-auth.ts` (bearer), `apps/api/src/lib/csrf.ts`, các route list (thêm cursor), `docs/architecture.md`, `README.md`, `apps/mobile/README.md`.
- Create: `apps/api/openapi/v1.json`, `apps/api/scripts/openapi-diff.ts`.

## Steps
1. Bearer plugin + CSRF exemption + test. 2. Mount `/api/v1`. 3. Cursor pagination các list. 4. Generator 3.1 + phủ route + snapshot + diff CI. 5. Docs.

## Validation
- Test: `/api/v1/me` với bearer → 200, không token → 401; cookie-only POST không CSRF token vẫn bị chặn; bearer POST không bị CSRF chặn; spec pass `@redocly/cli lint` (hoặc tương đương) ở 3.1; diff script bắt được xóa field; `openapi-generator validate` pass.
- `pnpm -r typecheck test build`.

## Risks
| Risk | L×I | Mitigation |
|---|---|---|
| Bearer mở đường CSRF bypass | L×H | chỉ bỏ CSRF khi có Bearer **và** không cookie session |
| Spec lệch handler thật | M×M | test gọi route mẫu và validate response bằng schema spec |
| Đổi shape list làm vỡ web | M×M | cursor optional, shape cũ giữ |

## Rollback
Gỡ mount `/api/v1`, tắt plugin bearer (token đã phát hết hiệu lực theo session), revert generator. Không migration DB (bearer dùng bảng session sẵn có — verify).
