---
title: "P1c – Người chơi & cộng đồng"
description: "Bạn bè qua QR, tủ game riêng, ghi ván + thống kê kiểu Steam, club, Kèo (session → nhiều bàn), chủ quán, cộng đồng quét kho quán"
status: pending
priority: P1
effort: "24.5-26d"
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
- **Kèo = session → nhiều bàn**: session (ngày, quán hoặc địa chỉ tự do, visibility `public|friends|club|private` — **mặc định `public`**, chốt 2026-09-25, capacity tùy chọn) chứa 1..n bàn (host, game tùy chọn, ghế, người ngồi, người mang game từ tủ). RSVP ở session + chọn bàn tùy chọn. Bảng DB `meetups*` (tránh trùng `sessions` của Better Auth). Chi tiết: [phase 6](./phase-06-events.md).
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
| 5 | [Club (members stats, kho club, calendar)](./phase-05-clubs.md) | 3.5d | 1,2,3,4,6 |
| 6 | [Kèo: session → nhiều bàn](./phase-06-events.md) | 4d | 1,2 |
| 7 | [Chủ quán: link mời owner + consent + /my-cafes + import kho CSV](./phase-07-cafe-owners-claims.md) | 4.5d | P1b-1 |
| 8 | [Cộng đồng quét kho quán](./phase-08-community-cafe-scan.md) | 2d | 1,7 |
| 9 | [/map: bản đồ quán + ghim tay](./phase-09-map.md) | 2d | 7 |

Số phase ≠ thứ tự chạy — xem **Thứ tự thực thi** bên dưới. Phase 1, 2 đã xong. Tổng 24.5d (còn lại phase 3-9: 21d); range 24.5-26d cho buffer.

## Thứ tự thực thi (chốt với chủ nhân 2026-09-25)
1. Route tiếng Anh (`/account`, `/friends`, `/invite/[code]`, `/shelf`, `/map`, `/my-cafes`, `/events`) — **DONE**.
2. Import quán + game Hà Nội — **DONE trên DB dev** (commit 0c323f3: 170 game, 20 thể loại, 25 quán Hà Nội `public_info_only`; `cafe_games` trống).
3. **Phase 7**: link mời chủ quán do admin cấp + consent + `/my-cafes` + import kho CSV tối thiểu + predicate `declined` dùng chung (**thay self-claim**; self-claim + admin duyệt làm sau).
4. **Phase 9**: `/map` MapLibre + OpenFreeMap, ghim tay.
5. **Cổng phát hành** (bắt buộc trước khi gửi link mời chủ quán hoặc chia sẻ link public): deploy ổn định trên môi trường thật (healthcheck xanh, không lỗi 5xx 24h), dữ liệu đã verify **trong DB đó** (đếm game/quán/thể loại khớp dataset, quán mời đã xác minh + có pin, không quán `declined` nào lộ public), trang `/data-sources` live, rà luật 91/2025 xong.
6. **Phase 6**: Kèo session → bàn.
7. Rồi phase 8 → 3 → 4 → 5.

Hệ quả phụ thuộc: phase 6 chạy trước 3/5 nên **không** tạo `clubId`, visibility `club`, `plays.meetupId`; phase 3 thêm `plays.meetupId/meetupTableId` + "Ghi ván từ Kèo", phase 5 thêm `meetups.clubId` + visibility `club`.
Migration luôn tuần tự; chỉ chạy song song nếu một người giữ quyền duy nhất trên `db/schema/index.ts`, `app.ts`, `packages/shared/src/index.ts`, thư mục migration.

## Quyết định bổ sung (chủ nhân chốt 2026-09-25, sau review Codex)
- Import kho CSV tối thiểu cho chủ quán **bắt buộc trước pilot** → phase 7 (+1.5d). P2 vẫn giữ import CSV/JSON đầy đủ cho admin.
- Trạng thái quán `declined`: 1 predicate công khai dùng chung cho mọi surface; import không bao giờ tái xuất bản.
- Kèo/club: host tính vào ghế + capacity; waitlist FIFO tự đẩy; token mời Kèo/club lưu hash; club membership không mở privacy `friends/private` của user (chi tiết phase 5/6).
- Review: [reviewer-260925-1441](../reports/reviewer-260925-1441-p1c-priority-plan-review.md) (đã áp dụng mục Must).

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
- [ ] Owner import CSV kho 5 dòng → dry-run hiện matched/suggested/unmatched → chọn/bỏ qua → apply → trang quán public hiện đúng game; dry-run không ghi DB.
- [ ] Quán `declined` vắng khỏi list, detail, game finder, sitemap, `/map`, llms, dataset export; `dataset:import` không làm nó hiện lại.
- [ ] `/map` hiện pin quán công khai, lọc tỉnh + "có game X", popup có "Chỉ đường"; admin/owner kéo marker ghim quán; geocode chỉ recenter.
- [ ] Cổng phát hành đạt (deploy ổn định + dữ liệu verify trong DB) trước khi gửi link mời chủ quán đầu tiên.
- [ ] Admin tạo link mời chủ quán → user đăng ký qua link → owner; link dùng lại/quá 30 ngày → 410; "Đồng ý" → `granted`, sửa được quán mình, 403 với quán khác; "Từ chối" → quán biến khỏi mọi trang public ngay, bật lại được; không phản hồi → vẫn `public_info_only`.
- [ ] Ghi ván từ bàn Kèo → prefill game + người ngồi bàn; exp của từng người tăng 1.
- [ ] User thường quét thêm game vào quán → hiện ngay với nhãn cộng đồng; response public/owner/maintainer không có `addedBy`; chỉ admin thấy người đóng góp; chủ quán gỡ được; vượt rate limit → 429; mọi thêm/gỡ có dòng audit.
- [ ] Admin dùng được mọi tính năng người chơi; không có nút quản trị trên trang công khai (test render).

## Non-goals
Chat/nhắn tin, Donate/Feedback kiểu app club, tích hợp app club ngoài (P1d), thông báo push, bảng xếp hạng toàn quốc, cho mượn game (P4), import tủ game BGG (chờ token), import CSV/JSON kho quán đầy đủ cho admin (P2; bản tối thiểu cho owner ở phase 7), thanh toán/đặt bàn, mobile app, chặn/report user nâng cao (chỉ có gỡ + chặn đóng góp).

## Open questions
- `/map`: quán `public_info_only` có hiện pin không (DTO đang ẩn `lat/lng`)? Đề xuất có — xem [phase 9](./phase-09-map.md).
- P1d: chờ tên/API/export của app club ngoài (danh sách câu hỏi trong report).

## Quyết định bổ sung (2026-09-25, chiều)
- Phase 7 chia 2 lát: **7a** (declined + predicate chung + invite owner + consent + /my-cafes + /data-sources) → **7b** (import kho CSV + quét trong /my-cafes).
- `/map` hiện pin cả quán `public_info_only`: lat/lng do admin ghim tay theo địa chỉ công khai, không coi là chi tiết cần ẩn; quán `declined` không có pin.
- **Lát 7c – Trang quán kiểu Facebook** (~2d, sau 7b): header ảnh bìa + avatar + tên + badge "Đã xác minh" (granted) + nút Chỉ đường / Fanpage / Nhắn Zalo / Tạo kèo tại đây; tab **Giới thiệu** (địa chỉ, giờ, giá, liên hệ, link MXH, bản đồ nhỏ), **Tủ game** (lọc số người/thời gian/thể loại), **Sự kiện** (Kèo tại quán — có dữ liệu khi phase 6 xong), **Ảnh** (album owner upload, tái dùng lib/storage, giới hạn kích thước + kiểm tra MIME). Owner nhập ở `/my-cafes`. Quán chưa đồng ý: ảnh mặc định + nút "Xem fanpage" nhúng Facebook Page Plugin click-to-load (không tải iframe/cookie Facebook trước khi bấm). Không cào Facebook.
- **Later – Nhập từ Facebook Page**: Meta App + OAuth của chủ quán (`pages_show_list`, `pages_read_engagement`, tùy chọn `pages_read_user_content`) để tự điền avatar/cover/giới thiệu/SĐT/giờ/địa chỉ + tọa độ; cần domain thật + privacy policy + App Review (1-4 tuần). Không dùng Page Public Content Access.
- **Lát 7d – Loại địa điểm + tiêu chí** (~2d, sau 7b, trước 7c và `/map`): `venueType` = `boardgame_cafe | byog_cafe | event_space`; tiêu chí 3 trạng thái (có/không/chưa rõ, mặc định chưa rõ cho dữ liệu import): có đồ ăn sẵn, cho mang đồ ăn vào, cho mang đồ uống vào, phòng/khu riêng (+ sức chứa), cho mang game tới (mặc định có với `byog_cafe`), **bàn lớn/nhóm đông** (+ sức chứa nhóm tối đa), **tiện ích chung** (wifi, điều hòa, chỗ để xe máy/ô tô, không hút thuốc, chuyển khoản); **cách tính phí** `free | with_drink | hourly | per_person | game_rental | unknown` + ghi chú giá. **Giờ mở cửa dạng Google Maps**: mỗi ngày 0..n khung giờ (hỗ trợ qua nửa đêm), tính "Đang mở / Sắp đóng / Đã đóng" theo Asia/Saigon — nhập tay, không lấy dữ liệu từ Google. Dùng ở: bộ lọc `/cafes` + `/map`, tab Giới thiệu (7c), form `/my-cafes` + admin, cột dataset CSV, gợi ý địa điểm khi tạo Kèo. UI đổi chữ "Quán" → "Địa điểm chơi" (route `/cafes` giữ nguyên). Dữ liệu quán cà phê cho mang game: bổ sung dần (admin + đề xuất cộng đồng ở phase 8).
- Thứ tự thực thi cập nhật: 7a DONE → **7b** → **7d** → **7c** → **9 /map** → cổng phát hành → 6 → 8 → 3 → 4 → 5.
