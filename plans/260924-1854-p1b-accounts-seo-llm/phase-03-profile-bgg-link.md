---
phase: 3
title: "Hồ sơ + liên kết username BGG"
status: completed
effort: "0.5d"
dependencies: [2]
---
# Phase 3: Hồ sơ + liên kết BGG
- Cột `users.bgg_username` (nullable, unique) qua `additionalFields` (input: true, validate `[A-Za-z0-9_ -]{3,50}`).
- `/tai-khoan`: sửa tên hiển thị, username, bgg username, đổi mật khẩu, liên kết Google.
- Trang hồ sơ công khai `/u/[username]` tối giản (tên, BGG link `https://boardgamegeek.com/user/<name>`); không hiện email.
- Chưa gọi BGG API (chờ token, P4 tủ game).

## Từ review phase 2 (2026-09-25)
- `immutableUsername`? hoặc cho đổi username có giới hạn; thêm `displayUsernameValidator` (chặn tên dành riêng, độ dài).
- Sign-up đang đặt `name = username`: nơi công khai hiển thị `users.name` sẽ lộ username — cho sửa tên hiển thị ở `/tai-khoan`.
- `/is-username-available` bật mặc định (30/phút) — cân nhắc tắt hoặc siết rate limit.

## Kết quả
- Cho đổi username (không `immutableUsername`); `displayUsername` phải khớp username (chỉ khác hoa/thường) — `auth/profile-guard.ts`.
- BGG username unique theo `lower()` (migration 0008); chưa xác minh quyền sở hữu BGG (chấp nhận, ai liên kết trước giữ tên).
- Không cho tự đặt `image` qua `/update-user`; `name` 1-100 ký tự.
- `/is-username-available`: giữ mặc định.
