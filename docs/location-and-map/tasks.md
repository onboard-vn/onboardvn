# Việc còn mở

| Ưu tiên | Việc                                                                                       | Trạng thái     | Ghi chú                                          |
| ------- | ------------------------------------------------------------------------------------------ | -------------- | ------------------------------------------------ |
| 1       | Owner duyệt lại flow vị trí / bản đồ / "Hôm nay chơi gì?"                                  | needs decision | Owner hẹn duyệt sau (2026-10-03)                 |
| 2       | Deploy bản "tỉnh luôn cụ thể" của `/map` và fallback Hà Nội ở `/suggest`                   | planned        | Đã commit, chưa build/rsync lên VPS              |
| 3       | `/map` thiếu bộ lọc của trang `/cafes` cũ: tên quán (`q`), phường/xã, phòng riêng, bàn lớn | planned        | Chưa có yêu cầu cụ thể                           |
| 4       | Lọc theo game trong danh sách quán (API `GET /api/cafes` chưa có `gameSlug`)               | planned        | Hiện dùng danh sách pin nên thiếu quán chưa ghim |
| 5       | Âm thanh và geolocation trên app native                                                    | planned        | Native chưa có `expo-location` / `expo-audio`    |

## Cần kiểm tra bằng tay (sign-off)

- Geolocation thật trên trình duyệt người dùng: khung trình duyệt của agent không cấp quyền vị trí nên mới kiểm tra được nhánh "hồ sơ" và nhánh "Hà Nội". Người kiểm: owner.
