---
phase: 4
title: "SEO + robot + LLM"
status: pending
effort: "2d"
---
# Phase 4: SEO + robot + LLM
- Next 16 metadata routes: `app/robots.ts` (allow all, disallow `/admin`, `/api/auth`, `/tai-khoan`; `Sitemap:`), `app/sitemap.ts` (game, quán không `pending`, trang tỉnh; chia sitemap khi > 50k).
- `generateMetadata` cho trang game/quán: title, description, canonical, OpenGraph (ảnh bìa nếu có).
- JSON-LD: game → `schema.org/Game` (+`numberOfPlayers`, `typicalAgeRange`, `sameAs` BGG); quán → `LocalBusiness`/`EntertainmentBusiness` (address, geo, openingHours, `sameAs` fanpage; `public_info_only` chỉ field cơ bản).
- `/llms.txt` + `/llms-full.txt` (route handler): mô tả site, license, link dataset GitHub, OpenAPI, trang chính; `llms-full` liệt kê game/quán dạng markdown ngắn (cache, giới hạn kích thước).
- OpenAPI: `@hono/zod-openapi` hoặc sinh từ zod schema shared cho route **public read** → `/api/openapi.json`; trang `/developers` (tiếng Việt) hướng dẫn dùng API/dataset, rate limit, license.
- Public API: header `Cache-Control` hợp lý; rate limit riêng cho bot (theo IP).
- Test: robots/sitemap/llms nội dung đúng, không có quán pending; JSON-LD parse được; OpenAPI validate (`@readme/openapi-parser` hoặc tương đương).
