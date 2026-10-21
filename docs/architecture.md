# Kiến trúc

## Sơ đồ monorepo

```
┌──────────────────────┐   HTTP (fetch, cookie)  ┌─────────────┐      SQL      ┌────────────┐
│  apps/mobile (Expo)  │ ──────────────────────▶ │  apps/api   │ ────────────▶ │  Postgres  │
│  web build tĩnh = cả │                         │    Hono     │               │ (Drizzle)  │
│  website, iOS, Andr. │ ◀────────────────────── │   (:8787)   │ ◀──────────── │            │
└──────────────────────┘                         └─────────────┘               └────────────┘
            │                                           │
            └──────── packages/shared (zod schema, types, scoring) ─┘
                                    │
                         packages/config (tsconfig, eslint)
```

Từ 2026-10-02 website là bản web của `apps/mobile` (Caddy phục vụ file tĩnh ở `/`). `apps/web` (Next.js) không còn được deploy, code giữ lại tới khi owner xoá.

## Hôm nay chơi gì? (`/suggest`)

- `GET /api/suggest` trả "chồng bài" tối đa 150 game đã xáo, mỗi game kèm độ hiếm (5 bậc theo số quán có game, game nặng tăng 1 bậc) và `cafeCount`.
- Nguồn: `shelf`, `wishlist` (cần đăng nhập), `cafe` (`cafeId`), `province`/`city` (`provinceCode`), `club` (`clubId`, phải là thành viên), `friends`, `all` (API còn giữ, UI không hiện).
- Quyền riêng tư: `club` chỉ tính tủ của thành viên bật `users.club_shelf_suggest` (mặc định bật); `friends` chỉ tính bạn có hồ sơ `public`/`friends`; `city` tính quán trong tỉnh + người dùng đặt `users.province_code` và hồ sơ `public`. Người chặn nhau (hai chiều) bị loại. Ba nguồn này trả `owners` (≤5, không gồm người gọi) + `ownerCount`.
- UI mặc định nguồn `city` và luôn có một tỉnh cụ thể (thứ tự chọn và lý do: [location-and-map](location-and-map/README.md)).
- Client tự rút 5 lá từ chồng, tráo/chia kiểu poker và lật bằng `Animated`; âm thanh qua Web Audio (chỉ web).

## Club, danh tính, ván chơi, đồng bộ club ngoài

- **Club** private (owner/admin/member), mã mời lưu hash; Kèo visibility `club` chỉ member hiện tại xem/ghi.
- **`identities`** (member | guest | external) là đơn vị ngồi bàn và chơi ván. Khách: tên gọi + năm sinh tuỳ chọn, gắn người mời; nhận hồ sơ qua link hoặc yêu cầu được người mời/admin duyệt → gộp vào user trong một transaction.
- **Ván chơi** (`plays`, `play_players`, `play_events`): pin version score template, server luôn tính lại bằng engine `packages/shared/src/scoring`; sửa theo từng ô (op id idempotent, last-write-wins từng ô), đẩy thay đổi qua SSE `/api/plays/:id/stream`. Presence và SSE giữ trong RAM; chỉ chạy một API node, không scale ngang.
- **Bảng điểm chung của bàn**: chủ bàn quản lý thiết lập/chốt ván và nhập thay người chơi; thành viên nhập cho danh tính gắn với tài khoản của mình. Quyền và ván đang mở thuộc [plays/service.ts](../apps/api/src/modules/plays/service.ts); client thật thuộc [SharedTableScreen](../apps/mobile/src/score/shared-table-screen.tsx). Các bảng điểm cục bộ vẫn phục vụ thử nghiệm độc lập.
- **Critter Kitchen**: ghi sao đã kiếm được và bữa ăn cuối thực tế, không dựng lại các lượt mua hàng/món thử thách. Danh mục và bộ tính thuộc [scoring/critter-kitchen](../packages/shared/src/scoring/critter-kitchen/index.ts); lá chưa xác minh không được dùng để chốt tự động. Ván cũ giữ mẫu đã ghim để tránh đổi kết quả lịch sử.
- **Liên kết tài khoản club ngoài**: API chỉ đối chiếu digest HMAC-SHA-256 có khóa; `CLUB_LOGIN_HMAC_KEY` cần tối thiểu 32 ký tự và bắt buộc ở production. Khóa trước bước đối chiếu sau 5 lần sai trong 15 phút theo từng link, IP hoặc tài khoản trong 60 phút; phản hồi thất bại là generic. Cột raw chỉ còn trong giai đoạn backfill/contract; xem thứ tự triển khai và dọn dump ở [deployment.md](deployment.md).
- **Dữ liệu club live**: `GET /api/clubs/:id/days/:date`, `/members-live`, `/games-live`, `/history-live` chỉ dành cho member; API kiểm tra quyền trước upstream, trả 404 cho non-member và `Cache-Control: private, no-store`. Private club adapter tuần tự hoá request để tôn trọng rate limit của ứng dụng club; mỗi API process giữ một instance adapter và gộp các request trùng đang chạy. Khi quá hạn/lỗi, trả dữ liệu DB gần nhất cùng nhãn stale.
- **Đồng bộ bàn**: API live và CLI dùng PostgreSQL advisory lock theo club + ngày. Draft play đóng băng toàn bộ bàn/ghế/host; bàn có bất kỳ play nào không bị xóa. Host ID từ app club ánh xạ tới tài khoản đã liên kết; nếu chưa liên kết, dùng người tạo club (`clubs.created_by`), hoặc thành viên có `joined_at` sớm nhất nếu trường này null. Người này giữ quyền host trên bàn cho đến khi host thật liên kết tài khoản.
- **Lịch sử**: thành viên club không ngồi bàn có thể xem ván hiện tại/live ở chế độ chỉ đọc; quyền sửa vẫn theo vai trò host/người chơi. `GET /api/me/plays?status=finished` là lịch sử cá nhân, `GET /api/clubs/:id/plays` là lịch sử club. Adapter, SSE và presence dựa trên một process; không scale ngang API.
- **Đồng bộ catalog club ngoài**: API giữ sync service và CLI `sync:club`; dữ liệu upstream đến từ private club adapter. Dữ liệu club/BGG thô ở `data/private/` (gitignore) và bảng `game_external_metadata` (không trả cho người chưa đăng nhập; bật bằng `SHOW_EXTERNAL_METADATA`).

## Shadow Hunters trên mobile

Companion chọn mode và tra cứu thẻ được duy trì trong một repo riêng tư.

Route `/score/shadow-hunters` ghi kết quả cuối ván cho bộ gốc 10 nhân vật, 4–8 người.
Template [shadow-hunters.json](../data/staging/score-templates/shadow-hunters.json) lưu mã nhân vật
theo `roles.key` và ô `won` của từng người; cả hai dùng luồng sửa ô/lưu nháp hiện có.
Người dùng xác nhận kết quả theo thẻ nhân vật; nhiều người có thể cùng thắng, không có điểm hay xếp hạng.
Giao diện chặn kết thúc nếu thiếu nhân vật/kết quả, trùng nhân vật hoặc chưa có người thắng.
Đây là giao diện ghi kết quả, chưa mô phỏng lượt, kỹ năng hay nhân vật mở rộng.
Kết quả lưu trên thiết bị giữ cả nhân vật/phe để xem lại sau khi xoá bản nháp.
Luồng Shadow Hunters cục bộ dùng `plays-mock` (xem `apps/mobile/src/api/plays.ts`); bảng điểm bàn có UUID thật dùng client API riêng.

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

- Frontend công khai Expo: API trả HTML ban đầu với metadata Open Graph/X Cards, canonical, JSON-LD và nội dung công khai; Caddy giữ asset tĩnh. `MOBILE_WEB_DIR` mount export; robots/sitemap được tạo lúc request, sitemap phân trang 1000 URL. Chuyển trang SPA đồng bộ metadata qua endpoint ẩn danh, không dùng session/invite code. Xem [deployment](deployment.md#seo-cho-frontend-expo-công-khai).
- Phần Next.js cũ vẫn có robots/sitemap/llms riêng nhưng không phải nguồn HTML của site Expo production.
- JSON-LD `Game` / `EntertainmentBusiness` trên trang chi tiết; `/developers` hướng dẫn API + dataset.
- `GET /api/openapi.json`: OpenAPI 3.0 cho route đọc công khai. Response ẩn danh có `Cache-Control: public` + `Vary: Cookie`.

## Secrets chỉ nằm ở API

Frontend (`apps/web`, `apps/mobile`) không bao giờ giữ API key của bên thứ ba. Mọi request tới dịch vụ ngoài đi qua `apps/api` làm proxy giữ secret:

- **GameUPC key** — dùng cho lookup/submit barcode ↔ game (xem [nguồn tham khảo](references.md#gameupc)).
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

## Tìm quanh vị trí và danh tính game

Tâm tìm kiếm là điểm người dùng chọn, không bắt buộc là vị trí thực của họ. Bán kính tính theo đường chim bay; kéo tâm và đổi bán kính là chỉnh bản nháp, chỉ áp dụng khi bấm tìm để tránh danh sách thay đổi trong lúc thao tác. Bộ lọc game và địa điểm vẫn giao nhau với vùng tìm kiếm. Chủ sở hữu giao diện là [MapView](../apps/web/app/map/map-view.tsx); hợp đồng truy vấn nằm ở [cafeMapFilterSchema](../packages/shared/src/cafes.ts).

Tên khác hoặc bản custom giữ nguyên luật thuộc cùng một game; bản đổi luật là game riêng có liên kết về game gốc. Không suy ra hai game là một chỉ vì trùng tên. Hợp đồng tên gọi và phiên bản nằm ở [games.ts](../packages/shared/src/games.ts).

Gộp mục trùng là quyết định quản trị có xem trước, không phải xóa game. Mục cũ được giữ làm đầu mối cho UUID/URL cũ và nguồn gốc nội dung. Xung đột kho sở hữu hoặc phiên bản bảng điểm phải được xử lý trước; hệ thống không tự cộng số lượng, bỏ ghi chú hay ghi đè bảng điểm. Quy tắc và kiểm tra toàn bộ tham chiếu thuộc [merge.ts](../apps/api/src/modules/games/merge.ts); việc giữ danh tính cũ thuộc [migration game identity](../apps/api/drizzle/0023_game_identity.sql).
