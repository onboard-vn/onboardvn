---
type: brainstorm
date: 2026-09-24
status: accepted
---

# Onboard VN — Bản chốt tầm nhìn

## Tóm tắt
Nền tảng open source cho cộng đồng board game Việt Nam, **lấy người chơi làm trung tâm** (không phải kênh để quán đăng sự kiện). Triển khai độc lập với Board Game Wikia (đã liên hệ hợp tác nhưng không thành), vẫn ghi nguồn tham khảo.

## Outcome
- Người chơi tạo/join kèo public hoặc private, lọc theo tỉnh → quận → quán/địa điểm.
- Wiki game tiếng Việt do cộng đồng đóng góp.
- Danh bạ quán + kho game từng quán; nạp game nhanh bằng quét mã vạch; maintainer hỗ trợ nhập thủ công cho quán.
- Tủ game cá nhân (phase sau).

## Constraints
- Phi lợi nhuận. Code **AGPL-3.0**, dữ liệu **CC BY-SA 4.0**.
- Stack: TypeScript monorepo — Next.js (web), NestJS/Hono (API), Expo (Android → iOS).
- GitHub Organization `onboard-vn`: `onboard` (monorepo), `dataset` (open data), `.github` (CONTRIBUTING, CoC, templates).
- Dữ liệu game: cộng đồng đóng góp + GameUPC (UPC→BGG ID). BGG XML API chỉ dùng sau khi đăng ký token/được chấp thuận; trong lúc chờ chỉ lưu `bgg_id` + link.
- Không copy code ShelfScan (không có license mở) hay nội dung Board Game Wikia; chỉ học ý tưởng, ghi nguồn.
- Bài từ fanpage quán: chỉ đăng lại khi quán đồng ý (lưu bằng chứng đồng ý), ghi nguồn link gốc.

## Non-goals (giai đoạn đầu)
- Quán tự đăng sự kiện / Shop Admin CMS.
- Thanh toán, đặt bàn, affiliate.
- Tủ game cá nhân (P4), mobile app (P5–P6).

## Phases
1. **P1 – Nền tảng:** org + monorepo + license, auth, catalog game (`barcode`, `bgg_id`), danh bạ quán + kho, quét mã vạch (GameUPC qua API proxy).
2. **P2 – Kèo:** public/private, địa bàn, RSVP, link mời chia sẻ Zalo.
3. **P3 – Wiki tiếng Việt:** bài viết cộng đồng, lịch sử sửa, kiểm duyệt.
4. **P4 – Tủ game cá nhân**, cho mượn.
5. **P5 – Android (Expo)**, **P6 – iOS**.

## Acceptance criteria (MVP = P1+P2)
- Tạo/join kèo, lọc được theo tỉnh.
- Quét mã vạch → game vào kho quán; mã chưa biết → submit GameUPC.
- Có LICENSE (AGPL + CC BY-SA cho dataset), CONTRIBUTING, trang ghi nguồn tham khảo.

## Khác biệt so với đối thủ
| Đối thủ | Khoảng trống Onboard VN lấp |
|---|---|
| Board Game Wikia | Kèo cá nhân/private, quét mã vạch, wiki tiếng Việt cộng đồng, open source/data |
| Played Together, GameTree, MeepleUp | Tiếng Việt, dữ liệu quán VN |

## Tham chiếu
- [researcher-260924-1650-boardgamewikia-xia.md](researcher-260924-1650-boardgamewikia-xia.md)
- [researcher-260924-1650-shelfscan-xia.md](researcher-260924-1650-shelfscan-xia.md)

## Nguồn tham khảo
- https://boardgamewikia.com/vi/
- https://github.com/j5bot/shelfscan
- https://boardgamegeek.com/thread/2579359/new-rest-service-for-upc-bgg-lookups
- https://boardgamegeek.com/wiki/page/BGG_XML_API_Commercial_Use
- https://www.playedtogether.com/ · https://gametree.me/tabletop/ · https://github.com/LookingForGame/lookingforgame

## Câu hỏi chưa giải quyết
- Kết quả đăng ký token BGG XML API.
- Điều khoản sử dụng/rate limit của GameUPC khi public.
- Tên miền, hosting.
