---
title: "Onboard VN P1 foundation: 7 phase xong, review round 2 bắt được các lỗi test không thấy"
date: 2026-09-24
summary: "P1 foundation ship xong 7 phase; lint/tsc/test xanh nhưng review round 1+2 phát hiện 7 lỗi High chỉ hiện trong prod-stack/restore drill, không phải unit test"
---

# Onboard VN P1 foundation: 7 phase xong, review round 2 bắt được các lỗi test không thấy

**Ngày**: 2026-09-24
**Component**: apps/api, apps/web, packages/shared, deploy/, dataset
**Trạng thái**: Resolved (P1 xong, chờ push GitHub + kiểm tay môi trường thật)

## Việc đã ship

7/7 phase của plan `260924-1012-p1-foundation`: quản lý game (mô tả 3 tầng + provenance, ảnh, revision), quán cà phê (địa bàn tỉnh/xã, consent), quét mã vạch tra GameUPC, export dataset CC0/MIT, docker-compose prod + Caddy + backup, CI. ~4.4k LOC api + web + shared. Sau 2 vòng code review + 1 vòng verification: tsc 0 lỗi, eslint 0, prettier clean, 14 file test/65 test pass 2 lần liên tiếp không flaky, docker build cả 2 image, restore từ backup thành công.

## Quyết định chính

- **TypeScript pin ~6.0**: typescript-eslint chưa hỗ trợ TS 7, tránh vỡ lint toolchain.
- **Web↔API same-origin qua Next rewrites `/api/*`**: dev giống hệt prod (Caddy cũng route theo path), tránh CORS và tránh lệch hành vi dev/prod.
- **Migrations để ngoài `src`**: tách khỏi build/bundle của app, chạy độc lập bằng drizzle CLI.
- **DI qua `createApp`**: cho phép test mount app với fake DB/auth mà không đụng process thật.
- **GameUPC là optional provider**: dev dùng `/test` + key test, prod `/v1` cần xin key qua email — MVP tắt hẳn provider này, tra cứu chỉ có candidates/local/unknown.
- **Mô tả game 3 tầng + provenance**: nguồn gốc text (tự viết/dịch/trích) phải khai báo, gate theo giấy phép CC BY-SA của dataset.
- **Licensing tách 2 tầng**: `facts/` (game/quán do cộng đồng nhập) là CC0; `admin-units` (tỉnh/xã lấy từ ThangLeQuoc/vietnamese-provinces-database) giữ MIT riêng, không gộp vào CC0.
- **Quán cà phê `pending` (chưa xin đồng ý) ẩn khỏi API/site công khai**: chỉ staff thấy qua `/cafes/manage`.

## Cái gãy — bị review bắt, test không thấy

Review round 1 (`code-reviewer-260924-1845-p1-review.md`) tìm ra 7 lỗi High dù CI-style check sạch:

- **H1 — upload ảnh luôn 404**: `app.ts` regex chỉ strip `^/uploads` nhưng `c.req.path` là full path `/api/uploads/...`, nên file bị tìm sai chỗ (`${UPLOADS_DIR}/api/uploads/...`) trong khi ghi ở `${UPLOADS_DIR}/...`. Không route test nào gọi GET sau khi upload nên không ai thấy.
- **H2 — restore từ backup làm mất trigram search index**: `unaccent_immutable` gọi `unaccent('unaccent', $1)` không schema-qualify; `pg_dump -s` set `search_path=''`, restore ra lỗi `function unaccent(unknown, text) does not exist` → index `games_name_*_trgm_idx` không tạo được. Test suite chạy trên DB sống, chưa từng dump/restore nên không bắt được.
- **H3 — rate limit dồn hết user vào 1 bucket**: SSR gọi API không kèm XFF (key = `'local'`); Caddy chưa set `trusted_proxies` nên tự ghi đè XFF bằng IP peer (docker gateway) — mọi user thật lẫn OTP-limiter của Better Auth (3 lần/60s/IP) đều cộng dồn vào 1 IP giả. Một người abuse là cả site bị khóa OTP.
- **CI không có Postgres service** (H5): job test kết nối `localhost:54329` không tồn tại trên CI — tiêu chí "CI xanh" của plan thực ra chưa từng chạy thật trên GitHub.
- **Scanner tự restart camera mỗi lần render** (H7): effect phụ thuộc `onDetect` được tạo lại mỗi render → mỗi lần quét (≥2 render: loading, result) camera dừng track và xin lại `getUserMedia`, phá luôn use case "quét 10 hộp liên tiếp".
- **OTP email plaintext/console-only** (M10): transport chỉ log ra console và bị redact ở prod → user chọn login bằng email OTP sẽ không bao giờ nhận được mã, Google OAuth là đường sống duy nhất.
- **Rate-limit 500 req/min không phân biệt theo IP thật** khi chưa cấu hình proxy/socket đúng — cùng gốc với H3, phát hiện thêm ở round 2 là limiter còn đếm cả request ảnh tĩnh (`/api/uploads/*`) làm 429 sớm hơn dự kiến (NEW-M1).

Round 2 fix gần hết (H1-H7 fixed, verify bằng restore rehearsal thật + `pg_dump | pg_restore --exit-on-error` 0 lỗi), nhưng lại lòi ra **NEW-H1**: CI e2e job không build `@onboard/shared` trước khi chạy Playwright — pass ở máy dev chỉ vì `dist/` cũ còn nằm đó, y hệt kiểu lỗi H5 (tests xanh vì môi trường local che mất lỗ hổng thật).

## Bài học

Toàn bộ 7 lỗi High round 1 đều **pass unit test + tsc + lint** nhưng gãy khi chạy prod stack thật hoặc khi làm đúng thao tác vận hành (restore, deploy CI sạch). Lesson rút ra và đã áp dụng ngay trong round 2: verification giờ bắt buộc có **prod-stack smoke test** (build 2 docker image, chạy compose, gọi endpoint thật) và **restore drill** (`pg_dump | pg_restore --exit-on-error` + kiểm tra index) như một bước chuẩn, không còn coi "test pass + lint sạch" là đủ điều kiện release.

## Còn treo (deferred, không block P1)

- M5 (race condition trả 500 thay vì 409), M8 (README/CONTRIBUTING vẫn ghi toàn bộ dataset CC BY-SA dù `facts/` đã tách CC0), M9 (dataset validator nông, chỉ check `games.csv`), M13 (admin list cap 50, chưa phân trang), M14 (bulk-add lỗi im lặng).
- Kiểm tay còn nợ: Google OAuth thật, quét trên Android/iOS thật, Tailscale Funnel + backup trên VPS thật.

## Tiếp theo

- **P1b** (`260924-1854-p1b-accounts-seo-llm`, 5-6 ngày): SMTP mailer (giải quyết luôn M10), đăng ký username/mật khẩu bắt buộc email, liên kết username BGG, SEO/robots/sitemap/JSON-LD/llms.txt/OpenAPI. Không làm login BGG (BGG không có OAuth), không làm chủ quán/import (đẩy sang P2).
- Sau P1b mới tới **P2** (chủ quán tự quản lý, import CSV/JSON).
- Trước khi deploy thật: gate Google OAuth bắt buộc trong docs deploy hoặc ẩn form email OTP ở prod (M10 chưa có SMTP thì OTP vô dụng).

> Historical work record — not durable authority. Prefer docs/specs/ADRs for current decisions.
