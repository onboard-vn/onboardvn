---
title: "P1b – Tài khoản username/mật khẩu + SEO/robot/LLM"
description: "Đăng ký username+mật khẩu (bắt buộc email, SMTP), liên kết username BGG, robots/sitemap/JSON-LD/llms.txt/OpenAPI"
status: completed
priority: P1
effort: "5-6d"
tags: [auth, seo, llm, pre-mvp]
created: 2026-09-24
---

# P1b – Tài khoản + SEO/robot/LLM (trước MVP)

Nối tiếp [P1 foundation](../260924-1012-p1-foundation/plan.md). Làm sau khi batch fix review P1 xong.

## Quyết định (chủ nhân chốt 2026-09-24)
- Đăng ký **username + mật khẩu, bắt buộc email**, cần **SMTP** trước MVP. Giữ Google + email OTP (OTP chạy được khi có SMTP).
- **Không có "Login with BGG"** (BGG không có OAuth/OpenID) → chỉ **liên kết username BGG** trên hồ sơ (dùng cho import tủ game ở P4).
- **AI crawler: cho phép tất cả**, chỉ đường tới dataset/OpenAPI; chặn `/admin`, `/api/auth`.
- Chủ quán + import → [P2 plan](../260924-1854-p2-cafe-owners-import/plan.md) (sau MVP).

## Phases
| # | Phase | Effort | Depends |
|---|-------|--------|---------|
| 1 | [SMTP mailer](./phase-01-smtp-mailer.md) | 0.5d | – |
| 2 | [Username + mật khẩu](./phase-02-username-password.md) | 2d | 1 |
| 3 | [Hồ sơ + liên kết BGG](./phase-03-profile-bgg-link.md) | 0.5d | 2 |
| 4 | [SEO + robot + LLM](./phase-04-seo-robots-llm.md) | 2d | – (song song 1-3) |

## Success Criteria
- [x] Đăng ký username/email/mật khẩu → email xác minh → đăng nhập bằng username hoặc email.
- [x] Quên mật khẩu → email reset → đăng nhập được; link hết hạn/dùng 1 lần.
- [x] Prod thiếu `SMTP_URL` → API fail-fast lúc khởi động (vì email bắt buộc).
- [x] `/robots.txt`, `/sitemap.xml` (game, quán, tỉnh), JSON-LD hợp lệ (unit test parse; Rich Results Test chạy tay sau deploy), `/llms.txt`, `/api/openapi.json`.
- [x] Không lộ email/username người khác qua API công khai.

## Non-goals
MCP server, chủ quán, import CSV/JSON, 2FA, passkey, login BGG.

## Open questions
- ~~Nhà cung cấp SMTP~~: code chỉ cần `SMTP_URL`; docs mặc định Gmail app password, có Brevo/Resend.
- `/is-username-available` giữ mặc định Better Auth (username vốn công khai trên `/u/…`).
- Link GitHub dataset trên `/developers` chờ tạo org.
