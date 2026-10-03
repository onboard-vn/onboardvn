# Vị trí người chơi, bản đồ quán

Mục tiêu: mọi màn hình theo địa lý (bản đồ `/map`, "Hôm nay chơi gì?" `/suggest`) luôn đứng ở **đúng một tỉnh/thành cụ thể** của người chơi, tự đoán theo vị trí, nhớ lựa chọn của họ; bản đồ miễn phí, bấm quán là chỉ đường được bằng Google Maps.

Trạng thái công việc: [tasks.md](tasks.md). Lựa chọn và lý do: [decisions.md](decisions.md).

## Phạm vi

- `/suggest`: nguồn mặc định "Cùng thành phố" (`city`); bỏ chip "Toàn quốc" (API `all` vẫn còn).
- `/map`: gộp danh sách quán vào bản đồ; `/cafes` chuyển hướng sang `/map` (tham số cũ `tinh` → `province`), `/cafes/:slug` giữ nguyên.
- Admin: cảnh báo quán chưa ghim vị trí (không hiện trên bản đồ).

Không thuộc phạm vi: bản đồ trên app native (native chỉ có danh sách), tra tỉnh theo ranh giới hành chính (polygon).

## Tiêu chí chấp nhận

- Ô tỉnh/thành ở `/map` và `/suggest` (nguồn `city`) không bao giờ ở trạng thái "Tất cả"/trống sau khi trang tải xong.
- Thứ tự chọn tỉnh mặc định:
  - `/map`: URL `?province=` → localStorage `onboard.map.province` → `users.province_code` → geolocation trình duyệt → Hà Nội (`01`).
  - `/suggest`: localStorage `onboard.suggest.choice` → `users.province_code` → geolocation → Hà Nội.
- Người dùng tự chọn tỉnh/nguồn khác thì lần sau mở lại vẫn giữ lựa chọn đó.
- Danh sách quán trên `/map` gồm cả quán chưa ghim (lấy từ `GET /api/cafes`); khi lọc theo game thì dùng danh sách ghim (API danh sách quán chưa có bộ lọc game).
- Tỉnh chưa có quán ghim → bản đồ căn giữa vào thủ phủ tỉnh.
- Popup ghim và trang quán có nút "Chỉ đường" mở Google Maps bằng link thường.

## Đọc theo thứ tự

1. [decisions.md](decisions.md): vì sao không dùng Google Maps API, vì sao tra tỉnh theo thủ phủ gần nhất.
2. [tasks.md](tasks.md): việc còn mở.
3. Code:
   - `apps/mobile/src/features/location/nearest-province.ts` (bảng thủ phủ, `nearestProvinceCode`, `locateProvinceCode`, `provinceCenter`, `DEFAULT_PROVINCE_CODE`);
   - `apps/mobile/src/features/map/map-screen.tsx`;
   - `apps/mobile/src/app/suggest.tsx`;
   - `apps/mobile/src/app/cafes/index.tsx` (redirect);
   - `apps/mobile/src/app/admin/cafes/index.tsx` + `src/features/admin/cafe-form.tsx` (cảnh báo chưa ghim).
4. Bối cảnh chung: [architecture.md](../architecture.md) mục "Hôm nay chơi gì?", [deployment.md](../deployment.md) đoạn "Bản đồ".
