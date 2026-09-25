# OnBoardVN

> Vietnam's Open Board Game Community · Cộng đồng board game mở của Việt Nam

<a id="readme-in-english"></a>

## README in English

**OnBoardVN** — Vietnam's Open Board Game Community. A player-centric platform for Vietnam's board game scene: a directory of board-game cafés, a personal game shelf (barcode scan via GameUPC), and events/meetups — built for players first, not just cafés.

- **Stack**: pnpm monorepo + Turborepo · `apps/web` (Next.js 16 App Router + Tailwind) · `apps/api` (Hono on Node 22) · `apps/mobile` (Expo, planned) · `packages/shared` (zod schemas) · `packages/config` (shared tsconfig/eslint).
- **Quickstart**: see the [Quickstart](#quickstart) section below (Vietnamese steps, same commands: `pnpm i`, `pnpm db:up`, `pnpm db:migrate`, `pnpm dev`).
- **License**: source is [GNU AGPL-3.0-only](LICENSE); catalog data (never player data) is CC0 (`facts/`), CC BY-SA 4.0 (descriptions/cafés), MIT (`admin-units/`).
- **Contributing**: see [CONTRIBUTING.md](CONTRIBUTING.md) (DCO, no CLA) and [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).

The rest of this README is in Vietnamese.

---

## Tiếng Việt

Nền tảng cộng đồng board game Việt Nam: danh bạ quán café board game, kho game (barcode scan qua GameUPC), sự kiện/kèo chơi, hướng tới người chơi (player-centric) thay vì chỉ phục vụ quán. Mã nguồn mở AGPL-3.0-only, dữ liệu catalog mở (không gồm dữ liệu người chơi): dữ kiện `facts/` CC0, mô tả và quán CC BY-SA 4.0, địa bàn `admin-units/` MIT. Tự host được qua Tailscale Funnel.

## Monorepo layout

```
apps/
  web/       Next.js 16 App Router + Tailwind — frontend (:3000)
  api/       Hono trên Node 22 — backend API (:8787, GET /health)
  mobile/    Expo (kế hoạch phase P5, xem apps/mobile/README.md)
packages/
  shared/    Types/schema dùng chung, zod
  config/    tsconfig, eslint config dùng chung
docs/        Tài liệu kiến trúc, nguồn tham khảo
plans/       Kế hoạch triển khai theo phase
```

Quản lý bằng pnpm workspaces + Turborepo.

## Yêu cầu môi trường

- Node 22 (xem [`.nvmrc`](.nvmrc); dùng `nvm use`)
- pnpm 11 (xem field `packageManager` trong [`package.json`](package.json); dùng `corepack enable`)
- Docker (chạy Postgres cho local dev)

## Quickstart

```bash
pnpm i
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
pnpm db:up
pnpm db:migrate
pnpm db:seed-locations
ADMIN_EMAIL=you@example.com pnpm db:seed
pnpm dev
```

## Ports

| Service  | Port  | Ghi chú                                    |
| -------- | ----- | ------------------------------------------ |
| web      | 3000  | Next.js dev server                         |
| api      | 8787  | Hono, `GET /health`                        |
| postgres | 54329 | Bind `127.0.0.1`, tránh đụng port laradock |

## Scripts (chạy từ root, qua Turborepo)

| Script                              | Mô tả                                                     |
| ----------------------------------- | --------------------------------------------------------- |
| `pnpm dev`                          | Chạy dev server tất cả app                                |
| `pnpm build`                        | Build tất cả app/package                                  |
| `pnpm lint`                         | Lint toàn bộ workspace                                    |
| `pnpm typecheck`                    | Kiểm tra kiểu TypeScript                                  |
| `pnpm test`                         | Chạy test suite                                           |
| `pnpm format` / `pnpm format:check` | Prettier format / kiểm tra format                         |
| `pnpm db:up`                        | Khởi động Postgres qua `docker-compose.yml`               |
| `pnpm db:migrate`                   | Chạy migration schema (`@onboard/api`)                    |
| `pnpm db:seed-locations`            | Seed tỉnh/thành, phường/xã (`@onboard/api`)               |
| `pnpm db:seed`                      | Tạo/nâng cấp tài khoản admin đầu tiên (cần `ADMIN_EMAIL`) |

CI chạy toàn bộ các bước trên (xem `.github/workflows/ci.yml`).

## Deploy

Self-host 0đ trên máy Linux nhà qua Tailscale Funnel (sau chuyển Cloudflare Tunnel khi có tên miền). Xem [docs/deployment.md](docs/deployment.md).

## Giấy phép

- Mã nguồn: [GNU AGPL-3.0-only](LICENSE).
- Dữ liệu: `facts/` [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/); `descriptions/`, `cafes/` [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/); `admin-units/` MIT (ThangLeQuoc/vietnamese-provinces-database).

Xem [CONTRIBUTING.md](CONTRIBUTING.md) để biết quy trình đóng góp (DCO, không CLA), [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) cho quy tắc ứng xử, và [SECURITY.md](SECURITY.md) để báo cáo lỗ hổng bảo mật.

## Tạo GitHub org

Việc tạo GitHub organization `onboard-vn` và các repo con **không** được thực hiện tự động bởi agent — maintainer cần tự làm thủ công:

1. Tạo organization `onboard-vn` trên GitHub.
2. Tạo repo `onboardvn` (repo chính, monorepo này) trong org.
3. (Tùy chọn, chưa cần ngay) Tách repo `dataset` riêng nếu sau này muốn export dữ liệu ra khỏi monorepo (facts CC0; mô tả, quán CC BY-SA 4.0; admin-units MIT) — hiện tại dataset export nằm trong `onboardvn` (xem `apps/api/src/dataset/`).
4. Tạo repo `.github` (community health files dùng chung cho toàn org, nếu muốn override cấp từng repo).
5. Cấu hình quyền truy cập, private vulnerability reporting, và branch protection cho `main` theo nhu cầu.
