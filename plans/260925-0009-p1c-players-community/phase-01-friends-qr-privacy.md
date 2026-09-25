---
phase: 1
title: "Bạn bè (QR + lời mời) + cài đặt riêng tư"
status: completed
effort: "2.5d"
dependencies: ["P1b phase 3"]
---
# Phase 1: Bạn bè (QR + lời mời) + riêng tư

## Context
- P1b-3 tạo `users.username`, `/u/[username]`, `/tai-khoan`. User schema: apps/api/src/db/schema/auth.ts:4-17; Better Auth `additionalFields` tại apps/api/src/auth/better-auth.ts:22-25. Mailer: `apps/api/src/lib/mailer/` (P1b-1).
- Scanner hiện chỉ đọc `ean_13|upc_a|ean_8` (apps/web/components/barcode-scanner.tsx:5); `barcode-detector` polyfill hỗ trợ `qr_code`.

## Requirements
- **QR/link (thành bạn ngay)**: mỗi user có mã mời (token ngẫu nhiên, đổi được); link `/ket-ban/<token>` → xác nhận → friendship 2 chiều. Chưa đăng nhập → login rồi quay lại.
- **Lời mời chờ duyệt** từ `/u/[username]`: gửi / chấp nhận / từ chối / hủy. Nếu B đã gửi cho A mà A gửi cho B → tự chấp nhận.
- **Chống spam**: chặn user (block → xóa friendship + request, người bị chặn không gửi được, không thấy hồ sơ friends-only); rate limit gửi 20 lời mời/ngày/user; tối đa 50 lời mời pending đi; từ chối → không gửi lại cùng người trong 7 ngày.
- **Thông báo**: badge số lời mời pending trên header (poll `GET /friends/requests/count` khi mở trang), trang `/ban-be` có tab Lời mời. Email thông báo **tùy chọn** (user bật trong cài đặt, mặc định tắt) qua Mailer.
- Hủy kết bạn. Danh sách bạn bè `/ban-be`.
- Cài đặt riêng tư: `profileVisibility` (hồ sơ + tủ game), `playsVisibility` (ván + thống kê), `friendsVisibility` — `public|friends|private`; mặc định **`public`, `public`, `friends`**.
- Helper dùng chung `canView(viewerId, ownerId, level)` cho phase 2-6 (block → luôn false).

## Data
- `users` additionalFields (input: false cho token): `friendCode text unique`, `profileVisibility`, `playsVisibility`, `friendsVisibility`, `emailOnFriendRequest bool default false`.
- `friendships(userA, userB, createdAt)` PK(userA,userB), CHECK `userA < userB`, index `userB`.
- `friend_requests(fromUserId, toUserId, status 'pending'|'declined', createdAt, respondedAt)` PK(from,to), index (toUserId, status). Chấp nhận/hủy → xóa dòng.
- `user_blocks(blockerId, blockedId, createdAt)` PK.

## Files
- Create: `apps/api/src/db/schema/social.ts`, `apps/api/src/modules/friends/{routes,service,repo,friends.test}.ts`, `apps/api/src/lib/visibility.ts` (+ test), `packages/shared/src/social.ts`.
- Create web: `apps/web/app/ket-ban/[code]/page.tsx`, `apps/web/app/ban-be/page.tsx` (tabs Bạn bè / Lời mời / Đã chặn), `apps/web/components/friend-qr.tsx` (lib `qrcode`, SVG client-side), `apps/web/components/friend-button.tsx` (trạng thái: kết bạn / đã gửi / chấp nhận / bạn bè), `apps/web/components/friend-request-badge.tsx`.
- Modify: `apps/api/src/auth/better-auth.ts`, `apps/web/components/barcode-scanner.tsx` (prop `formats` tùy chọn, mặc định giữ nguyên), `/tai-khoan` + `/u/[username]` (P1b), header layout (badge), mailer templates (P1b), đăng ký schema/route/shared.

## API
- `GET /me/friend-code`, `POST /me/friend-code/rotate`; `GET|POST /friends/invite/:code` (preview không email; tạo friendship idempotent; self → 422).
- `POST /friends/requests {username}`, `GET /friends/requests?dir=in|out`, `GET /friends/requests/count`, `POST /friends/requests/:fromUserId/accept|decline`, `DELETE /friends/requests/:toUserId` (hủy).
- `GET /friends`, `GET /users/:username/friends` (theo `friendsVisibility`), `DELETE /friends/:userId`.
- `POST /blocks {userId}`, `DELETE /blocks/:userId`, `GET /blocks`. `PATCH /me/privacy`.
- User rate limit (hono-rate-limiter key = user.id; tạo `apps/api/src/lib/user-rate-limit.ts` ở phase này, phase 8 dùng lại).

## Steps
1. Schema + migration; backfill `friendCode` cho user cũ; user mới qua `databaseHooks.user.create.before` [kiểm tra API Better Auth 1.7.5 trong node_modules].
2. `visibility.ts` + block check. Admin **không** bypass trên trang công khai.
3. Friends/requests/blocks service + tests. 4. Email tùy chọn khi có request mới.
5. Web: QR trên `/tai-khoan`; nút kết bạn trên hồ sơ; `/ket-ban/[code]`; "Quét QR bạn bè" với `formats=['qr_code']`, chỉ điều hướng path cùng origin; badge header.

## Validation
- Test: invite → 1 friendship dù gọi 2 lần/2 chiều; rotate → code cũ 404; request → accept → bạn; request chéo tự accept; decline → gửi lại trong 7 ngày 409; blocked gửi → 403; quá 20/ngày → 429; `canView` ma trận 3 mức × (self, friend, stranger, anon, blocked); response hồ sơ/request không có `email`.
- E2E headless: A mở link mời B → cả hai thấy nhau; C gửi lời mời D → D thấy badge 1 → accept.

## Risks
- Token QR lộ → ai cũng kết bạn: chấp nhận (QR chia sẻ cố ý), có rotate + block. (M×L)
- Spam lời mời (M×M) → rate limit + cap pending + cooldown decline + block.
- Scanner mở URL ngoài (L×H) → chỉ điều hướng cùng origin.
- Rollback: drop `friendships`, `friend_requests`, `user_blocks` + cột mới; không động dữ liệu cũ.
