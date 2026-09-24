# Deploy (0đ, self-host)

Chạy production trên máy Linux nhà (alias SSH `vps`, Ubuntu 24.04, Docker 29, Tailscale có sẵn). Images build trên GitHub Actions → GHCR; máy nhà chỉ `pull`, không build trên server.

## Kiến trúc

```
Internet ─► Tailscale Funnel (:443, *.ts.net)   ──┐   (giai đoạn 1)
Internet ─► Cloudflare Tunnel (cloudflared)      ──┤   (giai đoạn 2, có tên miền)
                                                  ▼
                              caddy :8080 (chỉ 127.0.0.1)
                              ├── /api/*, /health  → api:8787
                              └── /*                → web:3000
                              postgres:16 (network nội bộ, không publish port)
                              uploads volume (ảnh bìa)
```

Compose project riêng `onboard`, network riêng — không đụng container khác trên máy (vd `onboard-dev-postgres-1` của dev, port 3000 dùng bởi project khác).

## Lần đầu deploy

1. Cài Docker 29 + Tailscale trên máy (đã có sẵn theo giả định).
2. Clone repo về máy, vd `/home/onboard/onboard`.
3. Tạo `.env.prod` ở root repo (không commit) theo mẫu dưới đây, điền giá trị thật:

   ```dotenv
   TAG=latest

   POSTGRES_USER=onboard
   POSTGRES_PASSWORD=<mật khẩu mạnh>
   POSTGRES_DB=onboard

   NODE_ENV=production
   PORT=8787
   DATABASE_URL=postgres://onboard:<mật khẩu mạnh>@postgres:5432/onboard
   BETTER_AUTH_SECRET=<chuỗi ngẫu nhiên >=32 ký tự>
   BETTER_AUTH_URL=https://<host>.ts.net
   WEB_ORIGIN=https://<host>.ts.net
   # Bắt buộc cho MVP: chưa có SMTP thì Google là cách đăng nhập duy nhất (kể cả admin).
   # Redirect URI: https://<host>/api/auth/callback/google
   GOOGLE_CLIENT_ID=
   GOOGLE_CLIENT_SECRET=
   LOG_LEVEL=info
   UPLOADS_DIR=/data/uploads
   GAMEUPC_BASE_URL=
   GAMEUPC_API_KEY=
   ADMIN_EMAIL=<email admin đầu tiên>

   API_INTERNAL_URL=http://api:8787
   ```

   `UPLOADS_DIR` phải khớp path volume mount trong `compose.prod.yml` (mặc định `/data/uploads`, đã tạo sẵn owned bởi non-root user trong image). `GAMEUPC_BASE_URL`/`GAMEUPC_API_KEY` để trống nếu chưa tích hợp GameUPC (tính năng tra cứu barcode qua provider ngoài sẽ bị bỏ qua, chỉ dùng dữ liệu local). `TRUST_PROXY=true` đã set sẵn cho service `api` trong `compose.prod.yml` vì Caddy là ingress duy nhất phía trước; khi chạy dev (không qua Caddy) giữ giá trị mặc định `false`.

4. Pull image và dựng stack:

   ```bash
   docker compose -p onboard --env-file .env.prod -f compose.prod.yml pull
   docker compose -p onboard --env-file .env.prod -f compose.prod.yml up -d
   ```

   Service `migrate` chạy `node dist/db/migrate.js` và phải xong (`service_completed_successfully`) trước khi `api` nhận request.

5. Seed dữ liệu tỉnh/thành, phường/xã (bắt buộc, cafe cần province/ward FK) rồi tạo tài khoản admin đầu tiên:

   ```bash
   docker compose -p onboard --env-file .env.prod -f compose.prod.yml run --rm migrate node dist/db/seed-locations.js
   docker compose -p onboard --env-file .env.prod -f compose.prod.yml run --rm -e ADMIN_EMAIL=<email admin đầu tiên> migrate node dist/db/seed.js
   ```

6. Kiểm tra: `curl 127.0.0.1:8080/health` → `{"status":"ok"}`, `curl 127.0.0.1:8080/` → 200.

## Public qua Tailscale Funnel (giai đoạn 1, chưa có tên miền)

```bash
tailscale serve --bg 8080     # phục vụ nội bộ tailnet
tailscale funnel --bg 8080    # public ra internet qua *.ts.net, HTTPS tự động
```

- Tắt funnel: `tailscale funnel --https=443 off` (hoặc `tailscale funnel reset`).
- Tắt serve: `tailscale serve reset`.
- Xem trạng thái: `tailscale funnel status`.

`BETTER_AUTH_URL` và `WEB_ORIGIN` trong `.env.prod` phải khớp domain `*.ts.net` đang funnel.

## Chuyển sang Cloudflare Tunnel (giai đoạn 2, khi có tên miền)

1. Chuyển DNS domain về Cloudflare.
2. Cài `cloudflared`, đăng nhập: `cloudflared tunnel login`.
3. Tạo tunnel: `cloudflared tunnel create onboard`.
4. Route hostname: `cloudflared tunnel route dns onboard your-domain.com`.
5. Copy `deploy/cloudflared/config.example.yml` → `deploy/cloudflared/config.yml` (không commit), điền `tunnel` ID và `hostname`; `service` giữ nguyên `http://127.0.0.1:8080`.
6. Chạy service: `cloudflared service install` (dùng `--config` trỏ tới `config.yml`), `systemctl enable --now cloudflared`.
7. Tắt Tailscale Funnel: `tailscale funnel --https=443 off`.
8. Cập nhật `.env.prod`: `BETTER_AUTH_URL` và `WEB_ORIGIN` → `https://your-domain.com`, rồi `docker compose -p onboard --env-file .env.prod -f compose.prod.yml up -d` để áp dụng.
9. Cập nhật Google OAuth redirect URI (Google Cloud Console) → `https://your-domain.com/api/auth/callback/google`.

## Rollback theo tag

Mỗi lần merge `main`, `release.yml` build + push `ghcr.io/onboard-vn/{web,api}:<sha>` và `:latest`. Để rollback:

```bash
TAG=<sha-cũ> docker compose -p onboard --env-file .env.prod -f compose.prod.yml pull
TAG=<sha-cũ> docker compose -p onboard --env-file .env.prod -f compose.prod.yml up -d
```

Đặt `TAG=<sha-cũ>` trong `.env.prod` để giữ nguyên sau restart. Mục tiêu: rollback xong trong < 5 phút (chủ yếu là thời gian pull image).

## Backup hằng đêm

`deploy/backup.sh`: `pg_dump -Fc` qua `docker compose exec`, xoay vòng giữ 14 bản mới nhất trong `backups/` (tùy chọn copy sang `SECONDARY_DIR` và/hoặc `rclone` lên remote qua `RCLONE_REMOTE`).

Cài đặt systemd timer (chạy 03:00 hằng đêm):

```bash
sudo cp deploy/onboard-backup.service deploy/onboard-backup.timer /etc/systemd/system/
sudo sed -i "s#/home/onboard/onboard#$(pwd)#" /etc/systemd/system/onboard-backup.service
sudo systemctl daemon-reload
sudo systemctl enable --now onboard-backup.timer
```

Hoặc cron: `0 3 * * * REPO_DIR=/home/onboard/onboard /home/onboard/onboard/deploy/backup.sh >> /var/log/onboard-backup.log 2>&1`.

## Diễn tập restore

```bash
# Restore ra DB tạm để kiểm tra, không đụng DB đang chạy:
docker run --rm -d --name onboard-restore-check \
  -e POSTGRES_USER=onboard -e POSTGRES_PASSWORD=onboard -e POSTGRES_DB=onboard \
  postgres:16-alpine
sleep 3
docker cp backups/onboard-<timestamp>.dump onboard-restore-check:/tmp/restore.dump
docker exec onboard-restore-check pg_restore -U onboard -d onboard --clean --if-exists /tmp/restore.dump
docker exec onboard-restore-check psql -U onboard -d onboard -c '\dt'
docker rm -f onboard-restore-check
```

Restore thật vào DB prod (downtime ngắn): dừng `api`, `pg_restore --clean --if-exists` vào service `postgres` đang chạy, khởi động lại `api`.

## Kiểm chứng bảo mật

```bash
ss -ltn
```

Không được thấy port Postgres (mặc định 5432) publish ra host — `compose.prod.yml` không map port cho service `postgres`, chỉ network nội bộ.
