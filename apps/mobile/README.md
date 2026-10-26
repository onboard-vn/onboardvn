# apps/mobile

Ứng dụng Expo (Expo Router, SDK 57) chạy iOS, Android và web từ một codebase. Dùng `@onboard/shared` (score engine, schema).

Hiện có prototype bảng điểm: route `/score/[slug]` cho `acquire-1963` và `grand-austria-hotel-deluxe` (giao diện riêng, đăng ký theo slug trong `src/score/registry.ts`) và `the-gang-2024` (giao diện chung). Template lấy trực tiếp từ `data/staging/score-templates/`. Bảng điểm độc lập bắt đầu với danh sách người chơi trống; nhập tên để thêm và có thể xóa từng người, không lấy thành viên từ CLB mẫu. Danh sách này chỉ thuộc phiên tính điểm đang mở.

`/score/applejack-2022` và `/score/harmonies` có bộ nhập điểm riêng cho 2–4 người và tự lưu bản nháp trên thiết bị theo phiên bản template. Applejack nhập lượng mật ong của từng màu sau khi trừ 3 riêng cho từng vùng nhưng trước nhân đôi; thưởng giống tự tính. Harmonies chọn mặt A/B chung cả bàn, đếm cảnh quan đủ điều kiện và cộng điểm thẻ động vật; bắt đầu với tám ô thẻ 0 điểm, có thể thêm hoặc xóa. Khối động vật chỉ dùng phân định hòa. Bản nháp độc lập với tài khoản và CLB; xóa dữ liệu trình duyệt sẽ xóa bản nháp.

## Game

Từ phần Tính điểm hoặc Công cụ chơi trên trang chủ và bộ lọc tương ứng trong danh mục, bấm game sẽ mở thẳng bảng điểm hoặc công cụ. Danh mục thông thường vẫn mở trang chi tiết game.

`/games` tìm game trong thư viện CLB (551 game, gõ không dấu) từ `src/games/game-index.json` — sinh lại bằng `pnpm --filter @onboard/mobile games:index` khi template đổi. Công cụ riêng của từng game khai báo trong `src/games/modules.ts`; hiện có The Gang → Rút nhiệm vụ (`src/games/the-gang/`, engine thuần + test, dữ liệu runtime VI/EN). Màn hình rút nhiệm vụ dẫn tới nguồn luật và thẻ tại `/credits`; tài liệu và công cụ in nằm ngoài repo.

Web dev mở tại `http://localhost:8081/`. Đường dẫn triển khai do [tài liệu deployment](../../docs/deployment.md) quản lý.

Nút cờ VI/EN cạnh menu đổi ngôn ngữ ngay; mặc định ngôn ngữ và giao diện theo thiết bị. Cuối menu có lựa chọn giao diện Theo thiết bị/Sáng/Tối bằng biểu tượng. Quy ước bảo trì: [ngôn ngữ và giao diện](../../docs/mobile-preferences.md).

## Chạy

```sh
pnpm --filter @onboard/mobile start        # nhấn w để mở web; quét QR bằng Expo Go trên điện thoại
pnpm --filter @onboard/mobile export:web   # build web tĩnh vào dist/
pnpm --filter @onboard/mobile test
```

Điện thoại và máy tính cần cùng mạng Wi-Fi. `@onboard/shared` phải được build trước (`pnpm --filter @onboard/shared build`; `pnpm dev` ở root tự làm qua turbo).
