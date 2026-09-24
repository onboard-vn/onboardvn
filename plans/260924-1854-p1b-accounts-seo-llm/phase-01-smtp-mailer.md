---
phase: 1
title: "SMTP mailer"
status: pending
effort: "0.5d"
---
# Phase 1: SMTP mailer
- `apps/api/src/lib/mailer/`: interface `Mailer { send({to, subject, text, html}) }`; driver `smtp` (nodemailer, `SMTP_URL`, `MAIL_FROM`), driver `console` (dev/test, giữ `onOtpSent` hook cho test).
- env: `SMTP_URL`, `MAIL_FROM` — bắt buộc khi `NODE_ENV=production` (zod refine), optional ở dev.
- Template email tiếng Việt: xác minh email, OTP, reset mật khẩu (text + html đơn giản).
- `otp-mailer.ts` chuyển sang dùng `Mailer`.
- Test: console driver ghi nhận; smtp driver test bằng mock transport.
- Docs: deployment.md thêm cấu hình Gmail app password / Resend.
