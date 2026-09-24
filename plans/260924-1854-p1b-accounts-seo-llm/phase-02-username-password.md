---
phase: 2
title: "Username + mật khẩu"
status: pending
effort: "2d"
dependencies: [1]
---
# Phase 2: Username + mật khẩu
- Better Auth: `emailAndPassword { enabled, requireEmailVerification: true, sendResetPassword, minPasswordLength: 8 }`, `emailVerification.sendVerificationEmail`, plugin `username()` (min 3, max 30, `[a-z0-9_.]`, lowercase, reserved: admin, api, onboard, ...). Kiểm tra API thật trong node_modules/better-auth trước khi viết.
- Regenerate schema bằng `auth@<version> generate` → migration (cột `username`, `display_username`).
- Rate limit Better Auth cho sign-in/sign-up/reset chặt hơn (vd 5/phút/IP) dùng IP source đã fix ở batch review.
- Web: `/dang-ky` (username, email, mật khẩu, nhập lại), `/login` thêm tab mật khẩu (username hoặc email), `/quen-mat-khau`, `/dat-lai-mat-khau?token=`, trang "kiểm tra email".
- Test: đăng ký → verify (lấy link từ console mailer) → login bằng username và email; reset; username trùng/reserved → 422; login khi chưa verify → bị chặn.
- E2E: flow đăng ký + login mật khẩu headless.
