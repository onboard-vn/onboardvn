---
phase: 3
title: "Hồ sơ + liên kết username BGG"
status: pending
effort: "0.5d"
dependencies: [2]
---
# Phase 3: Hồ sơ + liên kết BGG
- Cột `users.bgg_username` (nullable, unique) qua `additionalFields` (input: true, validate `[A-Za-z0-9_ -]{3,50}`).
- `/tai-khoan`: sửa tên hiển thị, username, bgg username, đổi mật khẩu, liên kết Google.
- Trang hồ sơ công khai `/u/[username]` tối giản (tên, BGG link `https://boardgamegeek.com/user/<name>`); không hiện email.
- Chưa gọi BGG API (chờ token, P4 tủ game).
