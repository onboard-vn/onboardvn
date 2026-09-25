---
title: P1b tài khoản + SEO/LLM xong
date: 2026-09-25
summary: "SMTP mailer, SEO/robot/LLM/OpenAPI, username+mật khẩu, hồ sơ + BGG; 3 vòng review bắt lỗi timing enumeration và giả mạo handle"
---

# P1b tài khoản + SEO/LLM xong

## What happened
- P1b hoàn tất 4 phase (commits 351fe70..428019e, chưa push). Phase 4 do subagent làm song song Phase 1.
- Phase 1: `lib/mailer` (smtp/console), prod thiếu `SMTP_URL`/`MAIL_FROM` → fail-fast; compose.prod bắt buộc cả service `migrate`.
- Phase 4: robots/sitemap/llms render runtime, JSON-LD Game/EntertainmentBusiness, OpenAPI tay từ zod `toJSONSchema`, Cache-Control ẩn danh + `Vary: Cookie`.
- Phase 2: Better Auth emailAndPassword + requireEmailVerification + plugin username; web /dang-ky, /quen-mat-khau, /dat-lai-mat-khau, /kiem-tra-email.
- Phase 3: /tai-khoan, /u/[username], `GET /api/users/:username`, `auth/profile-guard.ts`.

## Lỗi review bắt được
- `robots.ts` prerender tĩnh → `Sitemap: localhost` trong image prod (image build không có SITE_URL) → `force-dynamic`.
- `generateSitemaps` không sinh `/sitemap.xml` → 404; bỏ, dùng 1 sitemap ≤50k.
- Sitemap/llms-full fan-out ~N/50 request tới API từ 1 IP web → dễ 429 toàn SSR → `memoizeTtl` 1h + throw khi trang lỗi (không trả danh sách cụt).
- Better Auth `runInBackgroundOrAwait` await SMTP khi không có handler → timing lộ email đã đăng ký (sign-up/reset) → `advanced.backgroundTasks`.
- Plugin username: lỗi sign-up trả 400 (không 422); sign-in validate trước normalize → validator lowercase.
- `displayUsername` không kiểm khớp username → giả mạo handle; unique `bgg_username` phân biệt hoa/thường → 0008 unique index `lower()`; duplicate trước đó ra 500.

## Decision
- Giữ status code của thư viện; không tự viết endpoint auth.
- Cho đổi username; BGG chưa xác minh sở hữu (ai liên kết trước giữ tên).
- Plan P1c (người chơi & cộng đồng, 8 phase ~17d) tạo mới; P2 cần cắt còn import.

## Next steps
- Thêm `SMTP_URL`, `MAIL_FROM`, `SITE_URL` vào `.env.example` (agent không có quyền).
- Rich Results Test sau deploy; tạo GitHub org cho link dataset.
- Duyệt và bắt đầu P1c phase 1.

> Historical work record — not durable authority. Prefer docs/specs/ADRs for current decisions.
