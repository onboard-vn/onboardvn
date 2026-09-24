---
title: "P1 – Nền tảng Onboard VN"
description: "Monorepo TS + license + auth + catalog game + danh bạ quán/kho + quét mã vạch web"
status: in-review
priority: P1
effort: "3-4w"
tags: [greenfield, monorepo, open-source]
created: 2026-09-24
---

# P1 – Nền tảng Onboard VN

## Overview
Dựng nền cho nền tảng board game cộng đồng VN, **lấy người chơi làm trung tâm**. P1 giao: repo + governance, API/DB/auth, catalog game, danh bạ quán theo địa bàn + kho game từng quán, quét mã vạch nạp game. Kèo (P2), wiki (P3), tủ game cá nhân (P4), mobile (P5–P6) nằm ngoài plan này.

Nguồn quyết định: [brainstorm](../reports/brainstorm-260924-1650-onboard-vn-vision.md) · [xia Board Game Wikia](../reports/researcher-260924-1650-boardgamewikia-xia.md) · [xia ShelfScan](../reports/researcher-260924-1650-shelfscan-xia.md)

## Kiến trúc chốt (mặc định, xác nhận ở validate)

```
onboard-vn/onboard (pnpm + Turborepo)
├── apps/web      Next.js App Router, Tailwind + shadcn/ui   → gọi API qua hono/client (typed)
├── apps/api      Hono (Node 22) + Drizzle + PostgreSQL 16  → Better Auth, GameUPC proxy
├── apps/mobile   (chừa chỗ, Expo – P5)
└── packages/shared  zod schemas, types, enums địa bàn
onboard-vn/dataset  JSON/CSV CC BY-SA 4.0 (export từ DB, không PII)
onboard-vn/.github  CONTRIBUTING, CODE_OF_CONDUCT, issue/PR templates
```

- **Hono thay NestJS:** ít boilerplate cho contributor, typed RPC client dùng chung cho web + Expo; trade-off: tự tổ chức module/DI.
- **Địa bàn theo đơn vị hành chính 2 cấp (từ 07/2025):** tỉnh/thành (34) → phường/xã; giữ `legacy_district` (vd "Quận 3 cũ") để hiển thị/tìm kiếm quen thuộc.
- **Khóa bí mật chỉ ở API:** GameUPC key, BGG token (khi có) — học pattern proxy từ ShelfScan, không copy code.
- **Provenance dữ liệu:** mọi quán/nội dung nhập hộ có `source_url`, `consent_status`, `consent_note`.

## Phases

| # | Phase | Priority | Effort | Depends |
|---|-------|----------|--------|---------|
| 1 | [Repo & governance bootstrap](./phase-01-repo-bootstrap.md) | P1 | 2d | – |
| 2 | [API, DB, auth foundation](./phase-02-api-db-auth.md) | P1 | 4d | 1 |
| 3 | [Catalog game](./phase-03-game-catalog.md) | P1 | 4d | 2 |
| 4 | [Địa bàn, quán, kho game](./phase-04-cafes-inventory.md) | P1 | 4d | 3 |
| 5 | [Quét mã vạch](./phase-05-barcode-scan.md) | P1 | 3d | 3, 4 |
| 6 | [Open dataset & ghi nguồn](./phase-06-dataset-attribution.md) | P2 | 2d | 3, 4 |
| 7 | [Self-host deploy (0đ)](./phase-07-self-host-deploy.md) | P2 | 1.5d | 2 |

## Success Criteria
- [ ] `pnpm i && pnpm dev` chạy web + api + Postgres (docker compose) trên máy mới theo README.
- [ ] CI xanh: lint, typecheck, test, build. (local xanh; chờ push GitHub)
- [ ] Maintainer tạo/sửa game, quán, kho quán; người dùng đăng nhập Google xem được.
- [x] Lọc quán theo tỉnh → phường; trang game hiện "quán có game này".
- [ ] Quét EAN/UPC trên điện thoại (Chrome Android, Safari iOS) → gợi ý game → thêm vào kho quán; mã lạ → gắn thủ công + submit GameUPC.
- [x] LICENSE AGPL-3.0 (code), CC BY-SA 4.0 (dataset), trang "Nguồn tham khảo".
- [ ] Web public qua Tailscale Funnel trên máy nhà, 0đ hạ tầng, có backup DB hằng đêm.

### Trạng thái (2026-09-24)
Code 7/7 phase xong, 2 vòng review + test sạch (reports `tester-260924-1930-*`, `code-reviewer-260924-1930-*`). CI xanh mới verify local, chờ push GitHub. Còn cần kiểm tay: `pnpm dev` máy mới, Google OAuth thật, quét trên Android/iOS, Tailscale Funnel + backup trên `vps`.

## Non-goals
Kèo/RSVP, wiki, tủ game cá nhân, Shop Admin/quán tự quản lý, mobile app, thanh toán, sync dữ liệu BGG (chờ token).

## Open questions
- BGG XML API token: chưa có → P1 chỉ lưu `bgg_id` + link.
- Điều khoản/rate limit GameUPC khi public.
- Nguồn dữ liệu đơn vị hành chính sau sáp nhập (license) — chốt ở phase 4.
- Tên miền (sẽ mua sau) → chuyển Cloudflare Tunnel.

## Validation Log

### Session 1 — 2026-09-24
Questions asked: 6
- **API:** Hono (không NestJS).
- **Login P1:** Google + email OTP qua Better Auth.
- **Contributor:** DCO (`git commit -s`), không CLA.
- **Hosting:** j2 (cPanel/CloudLinux, không Docker/Postgres, Node ≤20) bị loại. Tino VPS 30GB (~239k/tháng) khảo sát làm phương án dự phòng. Chốt **0đ cho MVP**: self-host trên máy Linux nhà (alias `vps`: i7-1370P, 30GB RAM, Docker 29, Tailscale) → Tailscale Funnel, sau chuyển Cloudflare Tunnel khi có tên miền. Thêm phase 7.
- **Ảnh bìa:** lưu volume local qua `StorageDriver` (đổi S3/R2 sau), giữ mục tiêu 0đ.

### Verification Results
- Claims checked: 8 (repo trống → mọi path là Create; kiểm tra môi trường host thật)
- Verified: 8 | Failed: 0 | Unverified: 0
- Tier: Full (7 phases) — phần codebase không áp dụng vì greenfield.

### Whole-Plan Consistency Sweep
- Đã rà NestJS/Hono, Node 22, Docker, S3/R2, hosting trên toàn bộ file: đồng nhất sau cập nhật. Không còn mâu thuẫn.

<!-- slug: p1-foundation -->

### Session 2 — 2026-09-24 (khi cook)
- **TypeScript:** pin ~6.0 (typescript-eslint chưa hỗ trợ TS 7).
- **Web ↔ API:** same-origin qua Next rewrites `/api/*` (dev giống prod Caddy).
- **Địa bàn:** dữ liệu ThangLeQuoc/vietnamese-provinces-database (MIT); `legacyDistrict` nhập tay.
- **GameUPC:** dev dùng `/test` + key test; prod `/v1` cần email xin key — gửi sau khi MVP lên; MVP tắt provider GameUPC.
- **Mô tả game:** 3 tầng + provenance + tên VN thể loại + videoUrls — xem addendum phase 3.
- **Mở rộng (sau review):** tài khoản username/mật khẩu (bắt buộc email + SMTP) + SEO/robot/LLM → [P1b](../260924-1854-p1b-accounts-seo-llm/plan.md) trước MVP; chủ quán nhiều cơ sở + import CSV/JSON → [P2](../260924-1854-p2-cafe-owners-import/plan.md) sau MVP. Quán `pending` ẩn khỏi public; dataset `facts/` CC0, `admin-units/` MIT.
