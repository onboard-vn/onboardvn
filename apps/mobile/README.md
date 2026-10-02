# apps/mobile

Ứng dụng Expo (Expo Router, SDK 57) chạy iOS, Android và web từ một codebase. Dùng `@onboard/shared` (score engine, schema).

Hiện có prototype bảng điểm: route `/score/[slug]` cho `acquire-1963` và `grand-austria-hotel-deluxe` (giao diện riêng, đăng ký theo slug trong `src/score/registry.ts`) và `the-gang-2024` (giao diện chung). Template lấy trực tiếp từ `data/staging/score-templates/`.

## Game

`/games` tìm game trong thư viện CLB (551 game, gõ không dấu) từ `src/games/game-index.json` — sinh lại bằng `pnpm --filter @onboard/mobile games:index` khi template đổi. Công cụ riêng của từng game khai báo trong `src/games/modules.ts`; hiện có The Gang → Rút nhiệm vụ (`src/games/the-gang/`, engine thuần + test, dữ liệu thẻ VI/EN dùng chung với `tools/the-gang-print`).

Web chạy dưới `baseUrl` `/app` (dev: `http://localhost:8081/app/`, prod: `https://onboard.j2teamnnl.com/app/`). Deploy: xem `docs/deployment.md`.

## Chạy

```sh
pnpm --filter @onboard/mobile start        # nhấn w để mở web; quét QR bằng Expo Go trên điện thoại
pnpm --filter @onboard/mobile export:web   # build web tĩnh vào dist/
pnpm --filter @onboard/mobile test
```

Điện thoại và máy tính cần cùng mạng Wi-Fi. `@onboard/shared` phải được build trước (`pnpm --filter @onboard/shared build`; `pnpm dev` ở root tự làm qua turbo).
