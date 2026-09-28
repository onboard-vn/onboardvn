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

## Cập nhật 28/09/2026 — Top game muốn chơi và kho game quán

### Top game muốn chơi
- Bài [HÓNG HỚT BOARD GAME](https://www.facebook.com/groups/hoihonghotboardgame/permalink/1842142493900193/) giới thiệu bảng “Top Game Được Muốn Chơi Nhiều Nhất”. Trang [most-wanted-board-games](https://boardgamewikia.com/vi/most-wanted-board-games) có tìm game và lọc theo khu vực, số người chơi, thời lượng, độ khó.
- Lượt bấm “Muốn chơi” tạo số tổng hợp theo game. Bấm số lượng mở danh sách hồ sơ; một số hồ sơ có tỉnh/thành. Từ trang game có thể xem Kèo đang mở hoặc mở Kèo mới với game đã điền sẵn. Bài đăng mô tả người cùng tỉnh và rảnh đúng buổi sẽ nhận thông báo; người chơi tự khai báo tỉnh, thời gian rảnh và bật thông báo.
- Snapshot lúc khảo sát: trang ghi cập nhật 16:00 ngày 28/09; Dune: Imperium – Uprising có 9 người muốn chơi và liên kết tới 2 Kèo đang mở. Đây là số liệu biến động, chỉ dùng làm ví dụ.
- Chưa xác minh việc gửi thông báo thực tế, kênh gửi và cài đặt ẩn danh/ẩn tỉnh. Không lưu tên người chơi trong report.

### Kho game theo từng quán
- Trang [danh sách shop](https://boardgamewikia.com/vi/shops/) nhóm quán theo tỉnh/thành; mặc định xếp theo số game và có lựa chọn xếp theo khoảng cách.
- Trang [Boardgame Era](https://boardgamewikia.com/vi/shops/boardgame-era/) hiển thị “Số Lượng Game: 350” và liên kết danh sách đầy đủ tại `/vi/shops/boardgame-era/games/`. Danh sách có tìm kiếm, nhóm theo thể loại và sắp xếp theo hạng, độ khó hoặc tên.
- Đây là bằng chứng BGW gắn danh sách game công khai với từng quán. Trang công khai đã xem không thể hiện số bản từng game, tình trạng còn sẵn hay thời điểm kiểm kê; không nên gọi số 350 là số bản vật lý hoặc tồn kho thời gian thực.

### Đối chiếu với OnBoardVN
- OnBoardVN cũng đã có mô hình kho game theo quán trong code hiện tại: `cafe_games` lưu cặp quán–game, số bản (`copies`) và nguồn/cách thêm (`source`, `addedVia`) ([schema](../../apps/api/src/db/schema/cafes.ts#L68-L89)). API chi tiết công khai trả `copies` và cờ đóng góp cộng đồng ([DTO](../../apps/api/src/modules/cafes/service.ts#L85-L159)); trang quán có mục “Kho game” và hiện số bản nếu nhiều hơn một (`apps/web/app/cafes/[slug]/page.tsx:145-154`, `apps/web/components/cafe/inventory-filter.tsx:99-100`).
- Luồng OnBoardVN có import CSV do owner/staff quản lý, hỗ trợ `copies`, và có nguồn đóng góp cộng đồng riêng ([phase chủ quán](../260925-0009-p1c-players-community/phase-07-cafe-owners-claims.md#L32-L42)). Đây là đối chiếu source/plan trong repo; chưa xác minh triển khai production.
- Vì vậy, BGW đã phủ cả danh bạ quán, kho game từng quán và luồng tìm người chơi theo game. Khác biệt OnBoardVN nên dựa vào độ tin cậy của kho (owner xác nhận, nguồn và số bản rõ), quy trình consent/kiểm duyệt, bản đồ và Kèo mở — không chỉ dựa vào việc có trang liệt kê game.
- “Muốn chơi” vẫn là nhu cầu riêng với sở hữu game và cờ “muốn học / dạy được” trong [phase hồ sơ](../260925-0009-p1c-players-community/phase-04-profile-stats-feed.md#L28-L39). Ghép tỉnh + thời gian và thông báo cho người phù hợp là phần bổ sung; P1c hiện ghi thông báo push là non-goal ([plan P1c](../260925-0009-p1c-players-community/plan.md#L98-L103)).

## Câu hỏi mở sau cập nhật
- BGW quản lý và xác minh kho game từng quán thế nào; số lượng trên trang là số tựa game hay số bản?
- BGW có hiển thị tình trạng sẵn có hoặc ngày cập nhật kho không?
- Ghép người chơi thông báo qua kênh nào, và người dùng kiểm soát việc hiện tên/tỉnh trong danh sách ra sao?
- OnBoardVN cần giữ riêng opt-in cho “muốn chơi”, tỉnh/thành, khung giờ và thông báo; không suy ra đồng ý từ cờ sở hữu hay cờ học/dạy.
