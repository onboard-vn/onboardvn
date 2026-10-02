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

apps/mobile (Expo Router, SDK 57) là client chính cho iOS + Android + web; apps/web (Next.js) chỉ sửa lỗi, bỏ khi Expo web đủ tính năng.
```

## Club, danh tính, ván chơi, đồng bộ club ngoài

- **Club** private (owner/admin/member), mã mời lưu hash; Kèo visibility `club` chỉ member hiện tại xem/ghi.
- **`identities`** (member | guest | external) là đơn vị ngồi bàn và chơi ván. Khách: tên gọi + năm sinh tuỳ chọn, gắn người mời; nhận hồ sơ qua link hoặc yêu cầu được người mời/admin duyệt → gộp vào user trong một transaction.
- **Ván chơi** (`plays`, `play_players`, `play_events`): pin version score template, server luôn tính lại bằng engine `packages/shared/src/scoring`; sửa theo từng ô (op id idempotent, last-write-wins từng ô), đẩy thay đổi qua SSE `/api/plays/:id/stream`. Presence giữ trong RAM (một node).
- **Đồng bộ club ngoài**: repo public chỉ có interface `ExternalClubSource` + sync service + CLI `sync:club`; adapter cụ thể là plugin private nạp qua `EXTERNAL_CLUB_PLUGIN`/`EXTERNAL_CLUB_BASE_URL`. Dữ liệu club/BGG thô ở `data/private/` (gitignore) và bảng `game_external_metadata` (không trả cho người chưa đăng nhập; bật bằng `SHOW_EXTERNAL_METADATA`).

## Vì sao Hono thay vì NestJS

Chọn **Hono** làm backend framework thay vì NestJS:

- Ít boilerplate hơn NestJS (không cần decorator/module/DI container cho một API quy mô vừa).
- `hono/client` cho typed RPC end-to-end: `apps/web` và `apps/mobile` (Expo) gọi API với type an toàn, không cần codegen riêng.
- Đánh đổi: mất DI container và cấu trúc module chuẩn hoá của NestJS — nhóm tự quản lý ranh giới module bằng convention (xem bên dưới) thay vì framework ép buộc.

## Layout module API (apps/api)

```
src/
  routes/    Hono route handlers — parse input, gọi service, format response
  service/   Business logic, không phụ thuộc HTTP
  repo/      Truy cập dữ liệu (Drizzle), không chứa business logic
```

Luồng gọi: `routes → service → repo`. Route không gọi thẳng repo; service không import Hono context.

## Tài khoản & email

- Better Auth (`apps/api/src/auth/better-auth.ts`): username/email + mật khẩu (bắt buộc xác minh email), mã OTP qua email, Google (tùy chọn).
- Mail qua `apps/api/src/lib/mailer/` (SMTP ở production, console ở dev/test); gửi nền để thời gian phản hồi sign-up/reset không lộ email đã đăng ký.
- Quy tắc hồ sơ ngoài plugin (display handle khớp username, BGG username unique không phân biệt hoa/thường, không tự đặt ảnh) ở `auth/profile-guard.ts`.
- Hồ sơ công khai `GET /api/users/:username` chỉ trả cột an toàn (không email).

## SEO & API công khai

- Web: `robots.txt`, `sitemap.xml`, `llms.txt`, `llms-full.txt` render lúc request (image build không có `SITE_URL`), dữ liệu sitemap/llms cache trong process 1 giờ.
- JSON-LD `Game` / `EntertainmentBusiness` trên trang chi tiết; `/developers` hướng dẫn API + dataset.
- `GET /api/openapi.json`: OpenAPI 3.0 cho route đọc công khai. Response ẩn danh có `Cache-Control: public` + `Vary: Cookie`.

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
