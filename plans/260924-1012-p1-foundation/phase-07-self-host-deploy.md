---
phase: 7
title: "Self-host deploy (0đ)"
status: completed
priority: P2
effort: "1.5d"
dependencies: [2]
---

# Phase 7: Self-host deploy (0đ)

## Overview
Chạy production trên máy Linux nhà (ThinkPad, SSH alias `vps`, Ubuntu 24.04, Docker 29, Tailscale có sẵn). Public qua Tailscale Funnel khi chưa có tên miền; chuyển Cloudflare Tunnel khi có tên miền. Không mở port router.

## Requirements
- Functional: `docker compose -f compose.prod.yml up -d` dựng web + api + postgres + caddy; migrate tự chạy trước khi api nhận request.
- Non-functional: DB không publish port ra host; backup hằng đêm giữ 14 bản; restart `unless-stopped`; giới hạn RAM mỗi service.

## Architecture
```
Internet ─► Tailscale Funnel (:443, *.ts.net)   ──┐   (giai đoạn 1)
Internet ─► Cloudflare Tunnel (cloudflared)      ──┤   (giai đoạn 2, có tên miền)
                                                  ▼
                              caddy :8080 (chỉ 127.0.0.1)
                              ├── /api/*  → api:8787
                              └── /*      → web:3000
                              postgres:16 (network nội bộ, volume pgdata)
                              uploads volume (ảnh bìa, qua StorageDriver 'local')
```
- Images build trên GitHub Actions → GHCR; máy nhà chỉ `pull` (tránh build trên server, dễ rollback theo tag).
- Compose project name riêng `onboard`, network riêng — không đụng container khác đang chạy trên máy.

## Related Code Files
- Create: `compose.prod.yml`, `deploy/Caddyfile`, `deploy/backup.sh`, `deploy/cloudflared/config.example.yml`, `.github/workflows/release.yml`, `docs/deployment.md`.
- Modify: `apps/api`, `apps/web` thêm `Dockerfile` multi-stage (Node 22 alpine, non-root).

## Implementation Steps
1. Dockerfile multi-stage cho web (Next standalone output) và api.
2. `release.yml`: build + push `ghcr.io/onboard-vn/{web,api}:<sha>` và `:latest` khi merge main.
3. `compose.prod.yml` + Caddyfile, env qua `.env.prod` (không commit).
4. Funnel: `tailscale serve --bg 8080` + `tailscale funnel --bg 8080`; ghi hướng dẫn tắt/bật.
5. Khi có tên miền: chuyển DNS về Cloudflare, `cloudflared tunnel create onboard`, route hostname → `http://127.0.0.1:8080`, chạy cloudflared thành service; tắt Funnel.
6. `backup.sh`: `pg_dump -Fc` hằng đêm (systemd timer/cron), xoay vòng 14 bản, copy sang ổ/thư mục thứ 2; tùy chọn rclone lên Google Drive.
7. `docs/deployment.md`: deploy, rollback theo tag, restore backup (có diễn tập restore 1 lần).

## Success Criteria
- [ ] URL `*.ts.net` truy cập được từ 4G, HTTPS hợp lệ.
- [ ] `ss -ltn` trên máy không có port Postgres của Onboard.
- [ ] Restore từ backup ra DB mới thành công.
- [ ] Rollback về tag trước trong < 5 phút.

## Risk Assessment
- Mất điện/mạng nhà → downtime; chấp nhận cho MVP, có trang status đơn giản sau. Tín hiệu: người dùng báo không vào được → cân nhắc VPS Tino 30GB (~239k/tháng, đã khảo sát).
- Better Auth cần `BASE_URL` đúng domain; đổi từ ts.net sang tên miền → cập nhật env + Google OAuth redirect URI.
- Máy dùng chung với project khác → giới hạn `mem_limit`, network riêng, không dùng port trùng.
