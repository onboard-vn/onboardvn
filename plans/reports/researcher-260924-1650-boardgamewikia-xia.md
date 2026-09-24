---
type: research
date: 2026-09-24
subject: boardgamewikia.com/vi — khảo sát tính năng (duyệt trực tiếp bằng browser)
---

# Khảo sát Board Game Wikia

## Tóm tắt
Board Game Wikia (BGW) đã phủ phần lớn scope dự kiến của Onboard VN: danh bạ quán kèm kho game, sự kiện/"kèo" theo quán, trang game (tổng hợp dữ liệu, có video hướng dẫn tiếng Việt), tủ game cá nhân, gợi ý "Mở hộp". Site đóng mã nguồn, có affiliate Amazon. Onboard VN cần khác biệt rõ ràng hoặc cân nhắc hợp tác.

## Tính năng quan sát được

| Khu vực | URL | Tính năng |
|---|---|---|
| Trang chủ | `/vi/` | Sự kiện sắp diễn ra; list: Top xu hướng, **Thuần Việt / Việt hóa**, Cho người mới, Mới ra mắt, Top hay nhất |
| Gợi ý | `/vi/suggest/` | "Mở hộp" kiểu gacha (lấy cảm hứng CS:GO case + truanayangi.com): nguồn = toàn quốc / tỉnh / quán gần / tủ game quán / tủ game của tôi / wishlist; lọc số người, thời gian, độ khó; gắn độ hiếm; có EXP/level |
| Xem game | `/vi/browse/` | Lọc theo thể loại — tên thể loại trùng taxonomy BGG (tiếng Anh) |
| Trang game | `/vi/ark-nova/` | Tab Giới thiệu / Hướng dẫn / Video / Chơi ngay / Thảo luận; mô tả tiếng Anh (có vẻ lấy từ BGG); **quán nào có game này + chỉ đường**; "Mở kèo chơi game này"; link BGA; affiliate Amazon; thể loại, cơ chế, game tương tự |
| Shop | `/vi/shops/` | Danh sách quán theo tỉnh (HCM ~38, HN, ...); sắp theo số game / khoảng cách |
| Trang quán | `/vi/shops/boardgame-era/` | Lịch Game Night theo tuần, theo dõi, đăng ký; danh sách game của quán; bài giới thiệu |
| Sự kiện | `/vi/events/` | Tạo sự kiện, nhận thông báo; lọc cuối tuần / gần tôi / tỉnh / thể loại; nhóm theo ngày |
| Điều khoản | `/vi/term/` | Có vai trò **Shop Admin CMS** (quán tự quản lý kho, sự kiện); bộ sưu tập cá nhân công khai/riêng tư |
| Footer | — | Link tới BoardGameGeek (có vẻ ghi nguồn BGG) |

## Khi đăng nhập (tài khoản cá nhân, Chrome của user, chỉ xem)

| Khu vực | URL | Tính năng |
|---|---|---|
| Tổng quan | `/user/{username}` | Giới thiệu, "Gu chơi game", thống kê tủ game, đang theo dõi (quán + người chơi), **Top 10 game yêu thích (ghim)**, nhật ký chơi gần đây, "Sự kiện của tôi" + nhắc trước 1 ngày, nút "Xem như khách", "Liên hệ" |
| Tủ game | `/user/{username}/collection` | 2 bộ sưu tập: **Đang sở hữu**, **Muốn chơi** |
| Nhật ký | `/user/{username}/logs` | Nhật ký buổi chơi (play log), ẩn/hiện công khai |
| Sự kiện | `/user/{username}/events` | Cá nhân cũng **tạo sự kiện** được (`?new=1`); lịch theo tuần. Form tạo không render trong lúc khảo sát |
| Khác | `/photos`, `/stats`, `/notifications` | Hình ảnh, thống kê, thông báo |
| Cài đặt | `/settings/profile` | Redirect về login riêng của Shop Admin |
| Trang sự kiện | `/vi/shops/{shop}/?event={code}` | Modal: ảnh, ngày/giờ, mô tả, **"Đăng ký sự kiện này"**, copy link |

**Mô hình tài khoản:** trang login có 2 tab **Cá Nhân** / **Quán/CLB** dùng chung một hệ thống (`/login`, đăng ký qua `/s-admin/auth/register`), Google login. Cá nhân lẫn quán đều tạo được sự kiện → vai trò gần như ngang hàng, đúng như user nhận xét. Tagline tài khoản cá nhân nhắc tới **"giao dịch chợ P2P"** (mua bán giữa người chơi) — chưa thấy UI công khai.

## Không thấy (khoảng trống)
- Quét mã vạch để nạp game (chưa thấy trong giao diện công khai; có thể nằm trong Shop Admin — chưa đăng nhập để kiểm tra).
- Kèo **private** (link mời, giới hạn người, chơi tại nhà) — cá nhân tạo sự kiện được nhưng chưa thấy chế độ riêng tư; feed công khai vẫn là sự kiện của quán.
- Mở mã nguồn / mở dữ liệu, API công khai.
- Nội dung wiki do cộng đồng viết bằng tiếng Việt (mô tả game Ark Nova vẫn là tiếng Anh).

## Hệ quả với Onboard VN
- Tránh sao chép nội dung/dữ liệu của BGW (site đóng, điều khoản bảo vệ nội dung người dùng + shop).
- Hướng khác biệt khả thi: (1) open source + open data (CC BY-SA), (2) kèo cá nhân/private + chia sẻ qua Zalo, (3) quét mã vạch nạp kho, (4) wiki tiếng Việt do cộng đồng viết có lịch sử sửa.
- Cân nhắc liên hệ BGW để hợp tác (ví dụ trao đổi dữ liệu quán) thay vì cạnh tranh trực diện.

## Nguồn tham khảo
- https://boardgamewikia.com/vi/
- https://boardgamewikia.com/vi/suggest/
- https://boardgamewikia.com/vi/browse/
- https://boardgamewikia.com/vi/ark-nova/
- https://boardgamewikia.com/vi/shops/
- https://boardgamewikia.com/vi/shops/boardgame-era/
- https://boardgamewikia.com/vi/events/
- https://boardgamewikia.com/vi/term/

## Câu hỏi chưa giải quyết
- Shop Admin có quét mã vạch không? (cần tài khoản quán để kiểm tra)
- Dữ liệu game lấy từ BGG theo thỏa thuận nào?
- Onboard VN cạnh tranh hay hợp tác với BGW?
