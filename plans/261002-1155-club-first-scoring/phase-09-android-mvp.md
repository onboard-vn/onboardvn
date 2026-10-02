---
phase: 9
title: "Android MVP (Kotlin/Compose)"
status: pending
effort: "4.5d"
dependencies: [8]
---
# Phase 9: Android MVP

## Context
- Quyết định: native Kotlin/Compose trước, SwiftUI sau, 1 backend ([research](../reports/researcher-261002-1137-native-multiplatform-stack.md)).
- Contract: `apps/api/openapi/v1.json` (phase 8). VPS: Ubuntu 24.04 x86_64, 20 core, 30GB RAM, Docker.

## Requirements
- `apps/android` (Gradle, không thuộc pnpm workspace; turbo bỏ qua): Kotlin, Compose Material 3, MVVM + coroutines/Flow, client sinh bằng openapi-generator `kotlin` (`jvm-retrofit2` hoặc `jvm-ktor` + kotlinx.serialization) từ v1.json lúc build (không commit code sinh).
- Màn MVP: đăng nhập (username/email + mật khẩu, OTP email) → token lưu EncryptedSharedPreferences/Keystore; Club của tôi + chi tiết (members, Kèo sắp tới); Kèo chi tiết + RSVP + chọn bàn + comment; Ghi ván: chọn game, người chơi, bảng điểm theo template — tổng/winner qua `POST /api/v1/score-templates/preview` (không port engine); lịch sử ván của tôi.
- Không offline, không push.
- Build: Docker image `gradle:jdk21` + Android SDK cmdline-tools; job CI build `assembleDebug` + unit test; release ký bằng keystore lưu secret CI (không commit). Chạy trên GitHub Actions hosted hoặc self-hosted runner trên VPS (open question).

## Files
- Create: `apps/android/**` (settings.gradle.kts, app module, `build.gradle.kts` với openapi-generator plugin), `.github/workflows/android.yml`, `deploy/android-build.Dockerfile`, `apps/android/README.md`.
- Modify: `apps/mobile/README.md` (trỏ android; hoặc xóa `apps/mobile` nếu chủ nhân đồng ý), `pnpm-workspace.yaml`/`turbo.json` chỉ nếu cần loại trừ.

## Steps
1. Skeleton Gradle + generator + CI build xanh. 2. Auth + token storage + interceptor bearer. 3. Clubs + Kèo + RSVP + comment. 4. Ghi ván + score sheet (preview server). 5. Lịch sử. 6. Release build ký + internal track (tùy chọn).

## Validation
- CI: `./gradlew assembleDebug testDebugUnitTest` xanh; generator chạy với spec hiện tại.
- Manual trên emulator/thiết bị trỏ API staging: login → club → RSVP → ghi ván 3 người có template → web hiện cùng ván, cùng tổng.
- Unit: ViewModel ghi ván map input → request đúng; token hết hạn → về màn login.

## Risks
| Risk | L×I | Mitigation |
|---|---|---|
| Generator Kotlin sinh code lỗi với 3.1 (nullable/oneOf) | M×M | giữ schema đơn giản; nếu lỗi → xuất spec phụ 3.0 cho generator |
| Ước lượng UI thiếu (dev solo, Compose mới) | M×M | MVP 5 màn, UI tối giản Material mặc định |
| Lộ keystore | L×H | secret CI, không commit; debug build không cần |

## Rollback
App độc lập; gỡ workflow CI. Backend không đổi.

## Open questions
- CI: GitHub Actions hosted hay self-hosted runner trên VPS?
- Có cần Google login trên Android ngay không?
- Xóa hẳn `apps/mobile` placeholder hay giữ README trỏ sang `apps/android`?
