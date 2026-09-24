# Nguồn tham khảo

Onboard VN học **pattern và ý tưởng kiến trúc/UX** từ các dự án dưới đây, không sao chép mã nguồn, mô tả, hay hình ảnh của họ. Xem chi tiết khảo sát trong `plans/reports/`.

## Board Game Wikia

Nền tảng cộng đồng board game Việt Nam đang hoạt động: danh bạ quán kèm kho game, sự kiện/kèo theo quán, trang thông tin game, tủ game cá nhân, gợi ý kiểu "mở hộp". Site đóng mã nguồn.

- https://boardgamewikia.com/vi/
- https://boardgamewikia.com/vi/shops/
- https://boardgamewikia.com/vi/events/

Chi tiết: `plans/reports/researcher-260924-1650-boardgamewikia-xia.md`.

Onboard VN học ý tưởng tính năng (kho game theo quán, sự kiện, tủ game cá nhân) và chủ động khác biệt: mã nguồn mở, dữ liệu mở CC BY-SA, hỗ trợ kèo riêng tư, quét mã vạch nạp kho.

## ShelfScan

Ứng dụng scan barcode board game (không có license mở — "not licensed for modification"). Học kiến trúc quét mã vạch, luồng xác nhận barcode ↔ game, và cách tích hợp GameUPC/BGG — **không copy code**.

- https://github.com/j5bot/shelfscan (clone shallow, chỉ đọc, không có LICENSE)

Chi tiết: `plans/reports/researcher-260924-1650-shelfscan-xia.md`.

Điểm học được: kiến trúc frontend không gọi trực tiếp API bên thứ ba có key (luôn qua backend proxy), luồng UX 5 trạng thái xác nhận barcode↔game khi độ tin cậy thấp, cơ chế tăng dần độ tin cậy (confidence) thay vì đúng/sai nhị phân, dedupe scan theo session + cache offline-first.

## GameUPC

Dịch vụ tra cứu barcode ↔ board game (`api.gameupc.com`). Cần API key riêng (liên hệ `gameupc@grettir.org`), không có docs/swagger công khai. API key **chỉ** giữ ở `apps/api`, không lộ ra frontend.

- https://gameupc.com

Chi tiết dùng trong Phase 5 (quét mã vạch), xác minh 2026-09-24:

- Server dev/test: `https://api.gameupc.com/test` (dữ liệu bị xoá định kỳ, dùng key test công khai `test_test_test_test_test`). Server prod: `https://api.gameupc.com/v1` (xin key riêng qua email, chưa có trong MVP).
- Provider tùy chọn: chỉ bật khi cả `GAMEUPC_BASE_URL` và `GAMEUPC_API_KEY` được set ở `apps/api`; MVP không set → tính năng quét mã chỉ dùng danh mục nội bộ + gắn tay, không gọi GameUPC.
- Chỉ lưu `bggId` + tên gợi ý từ GameUPC để hiển thị, không lưu/hiển thị ảnh hay mô tả từ `bgg_info` (tránh vấn đề bản quyền ảnh/mô tả BGG).
- Cơ chế "submit ngược" (crowdsourced vote): khi người quét xác nhận một gợi ý đúng, Onboard VN gọi `POST /upc/{code}/bgg_id/{bggId}` với `user_id` giả danh `onboard-<userId>` để đóng góp vào độ tin cậy chung của cộng đồng GameUPC (theo tài liệu GameUPC, cần ~2 vote không mâu thuẫn để một mapping UPC↔BGG được coi là "verified").

## Đơn vị hành chính (tỉnh/phường)

Dữ liệu tỉnh/thành và phường/xã sau cải cách 2 cấp (07/2025) lấy từ **ThangLeQuoc/vietnamese-provinces-database** (MIT license), snapshot rút gọn (chỉ `code`/`name`/`slug`) lưu tại `apps/api/data/admin-units.json`, chụp ngày 2026-09-24 (34 tỉnh/thành, 3321 phường/xã).

- https://github.com/ThangLeQuoc/vietnamese-provinces-database

## BoardGameGeek (BGG)

Nếu tích hợp BGG, Onboard VN chỉ lưu **`bgg_id` và link** tới trang BGG tương ứng — **không copy mô tả game hay hình ảnh** của BGG vào dữ liệu của mình. XML API v2 hiện yêu cầu Bearer token phía server (không còn free-for-all hoàn toàn public).

- https://boardgamegeek.com/xmlapi2
