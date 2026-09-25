---
title: "P1c – Người chơi & cộng đồng"
description: "Bạn bè qua QR, tủ game riêng, ghi ván + thống kê kiểu Steam, club, Kèo (session → nhiều bàn), chủ quán, cộng đồng quét kho quán"
status: pending
priority: P1
effort: "19.5-20.5d"
tags: [players, social, community, owners, pre-mvp]
created: 2026-09-25
---

# P1c – Người chơi & cộng đồng

Chạy **sau [P1b](../260924-1854-p1b-accounts-seo-llm/plan.md)** (cần username, `/u/[username]`, `bgg_username`, Mailer).

## Quyết định (chủ nhân chốt 2026-09-25)
- **Ghi ván**: 1 người ghi ván (game, ngày, thời lượng, quán tùy chọn); người chơi = user hoặc tên khách; điểm/thắng. Ván hiện trong lịch sử mọi người tham gia. Thống kê: giờ chơi/game, số ván, số thắng (tham chiếu Steam).
- **Bạn bè**: quét QR / link mời = thành bạn ngay; **thêm lời mời chờ duyệt** từ hồ sơ (gửi/chấp nhận/từ chối/hủy, chặn + rate limit, badge thông báo trong app, email tùy chọn). Bạn bè được thêm vào ván, sự kiện, club.
- **Sự kiện + Club** (club có thành viên, **không có quán "nhà"**, có bảng thắng/ván nội bộ).
- **Tủ game riêng** kéo từ P4 về; import BGG để sau (cần token).
- **Admin cũng là người chơi**: mọi tính năng user dùng `requireUser`; quản trị chỉ ở `/admin`; trang công khai không trộn nút quản trị.
- **Cộng đồng quét kho quán**: user đăng nhập thêm game → hiện ngay, nhãn "cộng đồng đóng góp"; chủ quán hoặc admin/maintainer gỡ. **Danh tính người đóng góp chỉ role `admin` thấy** (không maintainer, không chủ quán; lọc ở DTO API). User thường **không được link barcode mới**, chỉ chọn game có sẵn. Có rate limit + audit.
- **Chủ quán** kéo vào đây (tạm thời qua link mời do admin cấp, xem phase 7; self-claim để sau), tái dùng thiết kế `cafe_members` + `cafe_claims` của [P2](../260924-1854-p2-cafe-owners-import/plan.md). **P2 phải cắt còn import CSV/JSON + preset** (phase 1-3 của P2 chuyển sang đây; không sửa file P2 trong plan này). Đề xuất đổi tiêu đề P2 thành **"P2 – Import quán/kho"**.

## Quyết định bổ sung (chủ nhân chốt 2026-09-25, sau review plan)
- **Sự kiện = Kèo**: gộp làm 1 tính năng; phase 6 là lõi Kèo. Roadmap **không còn giai đoạn Kèo riêng** (vision P2 Kèo được P1c hấp thụ).
- **Lịch sử ván + thống kê mặc định `public`** (như Steam); user đổi được `friends|private`.
- Chỉ role `admin` thấy người đóng góp (xem trên).
- Lời mời kết bạn chờ duyệt được thêm vào phase 1 (+0.5d).

## Quyết định bổ sung (chủ nhân chốt 2026-09-25, tham chiếu app club ngoài)
- **Kèo = session → nhiều bàn**: session (ngày, quán hoặc địa chỉ tự do, visibility `public|friends|club|private`, capacity tùy chọn) chứa 1..n bàn (host, game tùy chọn, ghế, người ngồi, người mang game từ tủ). RSVP ở session + chọn bàn tùy chọn. Bảng DB `meetups*` (tránh trùng `sessions` của Better Auth). Chi tiết: [phase 6](./phase-06-events.md).
- **Calendar tháng** (người chơi · bàn / ngày) cho Kèo và club; **stats owned / hosted / brought** trên hồ sơ (phase 4) và danh sách thành viên club (phase 5).
- **Muốn học / dạy được** theo user-game + `exp` = số ván đã ghi của user với game đó (định nghĩa chính xác ở [phase 4](./phase-04-profile-stats-feed.md)).
- **Tích hợp app club ngoài = 2 chiều**, giữ cả 2 hệ → phase riêng **P1d – Tích hợp club ngoài**, chờ thông tin app nguồn. Phân tích + phương án: [report](../reports/planner-260925-1407-club-app-reference-integration.md). Không scraping.

## Quy tắc xuyên suốt
- Ranh giới module `routes → service → repo` ([docs/architecture.md](../../docs/architecture.md)). Zod schema/DTO ở `packages/shared`.
- **Quyền riêng tư mặc định**: hồ sơ cơ bản + tủ game + lịch sử ván + thống kê = `public`; danh sách bạn = `friends`. User đổi được `public|friends|private` cho từng nhóm. Người tham gia ván luôn thấy ván đó. Tên người chơi khác trong ván hiển thị theo quyền riêng tư của chính họ (không đủ quyền → "Người chơi ẩn danh"). Tên khách chỉ hiện cho người xem có quyền xem ván.
- Trang/DTO công khai (kể cả hồ sơ public) **không bao giờ chứa email**, `addedBy`, `createdBy` của đóng góp cộng đồng.
- Migration Drizzle sinh tuần tự bằng `drizzle-kit generate` → chạy các phase **tuần tự** (xem file ownership).

## Phases
| # | Phase | Effort | Depends |
|---|-------|--------|---------|
| 1 | [Bạn bè (QR + lời mời) + riêng tư](./phase-01-friends-qr-privacy.md) | 2.5d | P1b-3 |
| 2 | [Tủ game riêng](./phase-02-personal-shelf.md) | 1d | 1 |
| 3 | [Ghi ván chơi (cá nhân + nhóm + từ bàn Kèo)](./phase-03-play-log.md) | 3d | 1,6 |
| 4 | [Hồ sơ kiểu Steam: thống kê + feed + học/dạy](./phase-04-profile-stats-feed.md) | 2d | 1,2,3,6 |
| 5 | [Club (members stats, kho club, calendar)](./phase-05-clubs.md) | 3d | 1,2,3,4,6 |
| 6 | [Kèo: session → nhiều bàn](./phase-06-events.md) | 3.5d | 1,2 |
| 7 | [Chủ quán: link mời owner + consent + /my-cafes](./phase-07-cafe-owners-claims.md) | 2.5d | P1b-1 |
| 8 | [Cộng đồng quét kho quán](./phase-08-community-cafe-scan.md) | 2d | 1,7 |

Phase 1, 2 đã xong. Tổng 19.5d (còn lại phase 3-8: 16d); range 19.5-20.5d cho buffer.

## Thứ tự thực thi (chốt với chủ nhân 2026-09-25)
1. Route tiếng Anh (`/account`, `/friends`, `/invite/[code]`, `/shelf`, `/map`, `/my-cafes`, `/events`) — **DONE**.
2. Import quán + game Hà Nội (seed data, ngoài phase P1c).
3. Link mời chủ quán do admin cấp + consent + `/my-cafes` (phase 7) — **thay self-claim trong lúc này**; self-claim + admin duyệt làm sau.
4. `/map` MapLibre + OpenFreeMap, đặt pin thủ công (ngoài phase P1c).
5. Kèo session → bàn (phase 6).
6. Rồi phase 8 → 3 → 4 → 5.

Hệ quả phụ thuộc: phase 6 chạy trước 3/5 nên **không** tạo `clubId`, visibility `club`, `plays.meetupId`; phase 3 thêm `plays.meetupId/meetupTableId` + "Ghi ván từ Kèo", phase 5 thêm `meetups.clubId` + visibility `club`.
Migration luôn tuần tự; chỉ chạy song song nếu một người giữ quyền duy nhất trên `db/schema/index.ts`, `app.ts`, `packages/shared/src/index.ts`, thư mục migration.

## Phase tương lai
- **P1d – Tích hợp club ngoài** (2 chiều: connector API/webhook > export/import > thủ công; `external_sources`, `external_links`, `external_account_links`, `sync_runs`; consent từng member; token mã hóa server-side). Chờ chi tiết app nguồn — xem câu hỏi trong [report](../reports/planner-260925-1407-club-app-reference-integration.md). Phụ thuộc phase 5 + 6.

## File đăng ký dùng chung (chỉ append, 1 owner tại 1 thời điểm)
`apps/api/src/db/schema/index.ts`, `apps/api/src/app.ts` (`.route(...)` tại app.ts:40-46), `packages/shared/src/index.ts`, `apps/api/drizzle/*`, `apps/web/app/sitemap.ts` (nếu P1b tạo).

## Success Criteria
- [ ] A quét QR của B → hai người thành bạn; A thêm B vào ván, sự kiện, club.
- [ ] C gửi lời mời từ hồ sơ D → D thấy badge, chấp nhận → thành bạn; D chặn C → C không gửi lại được; vượt rate limit → 429.
- [ ] A ghi ván 3 người (A, B, 1 khách) có điểm + người thắng → ván hiện trong lịch sử A và B; thống kê giờ/ván/thắng của B cập nhật đúng.
- [ ] Người lạ xem `/u/b` với mặc định → thấy tủ game + lịch sử ván + thống kê, không có email; B đổi `playsVisibility=friends` → người lạ nhận `hidden:true`.
- [ ] Tạo Kèo public có quán + tỉnh với 2 bàn (1 bàn game mang từ tủ, 4 ghế) → người khác mở link, RSVP `going`, chọn bàn; người thứ 5 vào bàn đầy → 409; calendar tháng hiện đúng `players · tables` ngày đó.
- [ ] Tạo club, mời bạn, tạo Kèo `club` → non-member 404; trang Members hiện tổng + "N owned · N hosted · N brought" khớp dữ liệu seed; kho club hiện người sở hữu + ngày Kèo có người mang.
- [ ] B bật "muốn học" game X, đã chơi X 3 ván → hồ sơ B: `exp=3`, cờ muốn học; kho club hiện B trong người muốn học.
- [ ] Admin tạo link mời chủ quán → user đăng ký qua link → owner; link dùng lại/quá 30 ngày → 410; "Đồng ý" → `granted`, sửa được quán mình, 403 với quán khác; "Từ chối" → quán biến khỏi mọi trang public ngay, bật lại được; không phản hồi → vẫn `public_info_only`.
- [ ] Ghi ván từ bàn Kèo → prefill game + người ngồi bàn; exp của từng người tăng 1.
- [ ] User thường quét thêm game vào quán → hiện ngay với nhãn cộng đồng; response public/owner/maintainer không có `addedBy`; chỉ admin thấy người đóng góp; chủ quán gỡ được; vượt rate limit → 429; mọi thêm/gỡ có dòng audit.
- [ ] Admin dùng được mọi tính năng người chơi; không có nút quản trị trên trang công khai (test render).

## Non-goals
Chat/nhắn tin, Donate/Feedback kiểu app club, tích hợp app club ngoài (P1d), thông báo push, bảng xếp hạng toàn quốc, cho mượn game (P4), import tủ game BGG (chờ token), import CSV/JSON kho quán (P2), thanh toán/đặt bàn, mobile app, chặn/report user nâng cao (chỉ có gỡ + chặn đóng góp).

## Open questions
- Visibility mặc định khi tạo Kèo: đề xuất `public` (form đổi được) — cần chủ nhân xác nhận.
- P1d: chờ tên/API/export của app club ngoài (danh sách câu hỏi trong report).
