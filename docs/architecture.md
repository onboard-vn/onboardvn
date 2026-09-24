# Kiến trúc

## Sơ đồ monorepo

```
┌─────────────┐      HTTP/RPC      ┌─────────────┐      SQL      ┌────────────┐
│  apps/web   │ ─────────────────▶ │  apps/api   │ ────────────▶ │  Postgres  │
│  Next.js 16 │                    │    Hono     │               │ (Drizzle)  │
│  (:3000)    │ ◀───────────────── │   (:8787)   │ ◀──────────── │            │
└─────────────┘   hono/client RPC  └─────────────┘               └────────────┘
      │                                   │
      │           packages/shared (zod schema, types)
      └──────────────────┬────────────────┘
                          │
                 packages/config (tsconfig, eslint)

apps/mobile (Expo, phase P5) sẽ dùng chung apps/api qua hono/client RPC.
```

## Vì sao Hono thay vì NestJS

Chọn **Hono** làm backend framework thay vì NestJS:

- Ít boilerplate hơn NestJS (không cần decorator/module/DI container cho một API quy mô vừa).
- `hono/client` cho typed RPC end-to-end: `apps/web` và (sau này) `apps/mobile` (Expo) gọi API với type an toàn, không cần codegen riêng.
- Đánh đổi: mất DI container và cấu trúc module chuẩn hoá của NestJS — nhóm tự quản lý ranh giới module bằng convention (xem bên dưới) thay vì framework ép buộc.

## Layout module API (apps/api)

```
src/
  routes/    Hono route handlers — parse input, gọi service, format response
  service/   Business logic, không phụ thuộc HTTP
  repo/      Truy cập dữ liệu (Drizzle), không chứa business logic
```

Luồng gọi: `routes → service → repo`. Route không gọi thẳng repo; service không import Hono context.

## Secrets chỉ nằm ở API

Frontend (`apps/web`, `apps/mobile`) không bao giờ giữ API key của bên thứ ba. Mọi request tới dịch vụ ngoài đi qua `apps/api` làm proxy giữ secret:

- **GameUPC key** — dùng cho lookup/submit barcode ↔ game (xem `plans/reports/researcher-260924-1650-shelfscan-xia.md`).
- **BGG token proxy** — nếu tích hợp BoardGameGeek XML API v2 (cần Bearer token phía server, không public free-for-all nữa).

## Data provenance

Mọi bản ghi dữ liệu import từ nguồn ngoài (game, quán café...) cần các field:

| Field            | Ý nghĩa                                                                                                |
| ---------------- | ------------------------------------------------------------------------------------------------------ |
| `source_url`     | URL nguồn gốc của dữ liệu (BGG, GameUPC, do người dùng nhập...)                                        |
| `consent_status` | Trạng thái xin phép sử dụng (`granted`, `pending`, `public_info_only`; `pending` không hiện công khai) |
| `consent_note`   | Ghi chú ngữ cảnh xin phép (ai, khi nào, phạm vi)                                                       |

Mục tiêu: minh bạch nguồn gốc, tránh vi phạm bản quyền/điều khoản của nguồn dữ liệu bên thứ ba (xem `docs/references.md`).

## Admin units (tỉnh/xã)

Việt Nam chuyển sang mô hình **2 cấp** (tỉnh → xã/phường) từ 07/2025, bỏ cấp huyện. Schema admin units theo mô hình 2 cấp mới, nhưng giữ field `legacy_district` để:

- Truy vết dữ liệu cũ (địa chỉ quán café nhập trước 07/2025 có thể còn ghi theo quận/huyện cũ).
- Hỗ trợ tra cứu/hiển thị lịch sử khi cần đối chiếu địa chỉ cũ ↔ mới.

`legacy_district` là trường tham chiếu lịch sử, không dùng cho logic định tuyến/lọc hiện hành.
