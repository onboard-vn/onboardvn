# Quyết định

## Bản đồ: MapLibre + OpenFreeMap, không dùng Google Maps Platform — đã triển khai

- **Chọn:** `/map` vẽ bằng MapLibre GL với style OpenFreeMap (miễn phí, không key). "Chỉ đường" mở `https://www.google.com/maps/dir/?api=1&destination=lat,lng` (popup ghim) hoặc link tìm kiếm Google Maps (trang quán).
- **Vì sao:** Google Maps Platform cấm tài khoản thanh toán Việt Nam (Việt Nam nằm trong [danh sách vùng bị cấm](https://cloud.google.com/maps-platform/terms/maps-prohibited-territories) từ 2022-03). Ngày 2026-10-03 đã thử bản dùng Maps JavaScript API với key giới hạn theo domain: console liên tục đòi "Set up account to enable Maps API"; bật API bằng `gcloud` thì được, nhưng bản đồ tải xong vài giây là Google trả **"Permission Denied"** (cả trên prod lẫn localhost). Đã gỡ code provider Google, các package `@googlemaps/*`, project Google Cloud và tài khoản thanh toán dành cho Maps.
- **Bác bỏ:** dùng tài khoản thanh toán đăng ký ở nước khác để lách. Lý do: khai sai nơi thanh toán, rủi ro bị khoá tài khoản và không có hoá đơn hợp lệ.
- **Mở lại khi:** Google bỏ Việt Nam khỏi danh sách cấm, hoặc owner chọn một nhà cung cấp bản đồ có phí khác (ví dụ Goong, Mapbox) sau khi so sánh giá.

## Tỉnh luôn cụ thể, không có "Tất cả" — đã triển khai

- **Chọn:** `/map` và `/suggest` luôn chọn sẵn một tỉnh (thứ tự xem [README](README.md)); mặc định cuối cùng là Hà Nội.
- **Vì sao:** owner 2026-10-03: người chơi tìm quán và tìm game theo nơi mình ở; một ô "Tất cả" mặc định là sai ngữ cảnh. Trước đó `/suggest` đã bỏ "Toàn quốc" vì cùng lý do.
- **Hệ quả:** khi chưa xác định được tỉnh, `/map` chưa gọi API pin/danh sách quán.

## Tra tỉnh theo thủ phủ gần nhất, không dùng ranh giới — đã triển khai

- **Chọn:** đổi toạ độ geolocation ra tỉnh bằng khoảng cách tới bảng thủ phủ trước sáp nhập (63 điểm), gắn về mã tỉnh sau sáp nhập 07/2025. Entry đầu tiên của mỗi mã là thủ phủ hiện tại (dùng để căn bản đồ).
- **Vì sao:** không thêm dữ liệu nặng; người dùng ở sát ranh giới có thể bị đoán sai, nhưng luôn đổi tay được và lựa chọn được nhớ.
- **Bác bỏ (owner chọn 2026-10-03):** tra point-in-polygon theo GeoJSON ranh giới 34 tỉnh ([thanglequoc/vietnamese-provinces-database](https://github.com/thanglequoc/vietnamese-provinces-database), MIT). Chưa có package npm nào trả thẳng tỉnh mới từ toạ độ.
- **Mở lại khi:** có phản hồi đoán sai tỉnh đáng kể.

## Gộp `/cafes` vào `/map` — đã triển khai

- **Chọn:** header chỉ còn "Bản đồ"; danh sách trên bản đồ lấy từ `GET /api/cafes` để có cả quán chưa ghim; admin thấy cảnh báo quán chưa ghim.
- **Vì sao:** owner thấy hai trang trùng chức năng lọc. Gộp lại thì quán chưa ghim sẽ biến mất nếu danh sách chỉ dựa vào pin, nên danh sách phải đọc từ API quán.
- **Còn thiếu so với trang cũ:** tìm theo tên quán, phường/xã, phòng riêng, bàn lớn (xem [tasks.md](tasks.md)).
