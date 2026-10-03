# Deploy (0đ, self-host)

Chạy production trên máy Linux nhà (alias SSH `vps`, Ubuntu 24.04, Docker 29, Tailscale có sẵn). Images build trên GitHub Actions → GHCR; máy nhà chỉ `pull`, không build trên server.

Site công khai (subdomain tạm thời): https://onboard.j2teamnnl.com — DNS `j2teamnnl.com` đã chuyển sang Cloudflare (2026-10-02, NS `isabel`/`jimmy.ns.cloudflare.com`; tên miền vẫn đăng ký và gia hạn ở Tino). Ingress qua Cloudflare Tunnel `onboard` chạy dạng container (xem "Cloudflare Tunnel" bên dưới). Tên miền riêng dự kiến: `onboardvn.com` (chưa mua).

## Kiến trúc

```
Internet ─► Tailscale Funnel (:443, *.ts.net)   ──┐   (giai đoạn 1)
Internet ─► Cloudflare Tunnel (cloudflared)      ──┤   (giai đoạn 2, có tên miền)
                                                  ▼
                              caddy :8080 (chỉ 127.0.0.1)
                              ├── /api/*, /health  → api:8787
                              └── /*                → Expo web build tĩnh (deploy/mobile-web, compose.vps.yml)
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
   # Bắt buộc: thiếu thì api/migrate không khởi động (email xác minh, OTP, reset mật khẩu).
   SMTP_URL=smtps://<user>:<app-password>@smtp.gmail.com:465
   MAIL_FROM=OnBoardVN <<user>@gmail.com>
   # Tùy chọn: đăng nhập Google. Redirect URI: https://<host>/api/auth/callback/google
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

   **SMTP** (`SMTP_URL` dạng URL nodemailer, ký tự đặc biệt trong mật khẩu phải URL-encode):
   - Gmail app password (0đ, ~500 mail/ngày): bật 2FA cho tài khoản Google → _Security → App passwords_ → tạo mật khẩu 16 ký tự → `smtps://<user>%40gmail.com:<app-password>@smtp.gmail.com:465`. `MAIL_FROM` phải là chính địa chỉ Gmail đó (Gmail ghi đè sender khác).
   - Brevo (free ~300 mail/ngày) / Resend (free ~100 mail/ngày, cần verify domain): lấy SMTP credentials trong dashboard → `smtp://<login>:<smtp-key>@smtp-relay.brevo.com:587` hoặc `smtps://resend:<api-key>@smtp.resend.com:465`; `MAIL_FROM` dùng domain đã verify.
   - `SITE_URL` của `web` lấy từ `WEB_ORIGIN` (canonical, sitemap, robots).

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

## Cloudflare Tunnel (đang dùng trên máy nhà)

Tunnel `onboard` quản lý trên dashboard Cloudflare (Networking → Tunnels), connector là service `cloudflared` trong `compose.vps.yml` (profile `tunnel`, không cần sudo hay `cloudflared login`).

1. Token tunnel nằm trong `.env.prod` dưới key `CLOUDFLARE_TUNNEL_TOKEN` (chủ sở hữu tự nhập, không commit).
2. Chạy: `dc --profile tunnel up -d cloudflared` (định nghĩa `dc` ở mục VPS bên dưới).
3. Dashboard → tunnel `onboard` → Public hostname: `onboard.j2teamnnl.com` → `HTTP` → `caddy:8080`.
4. `.env.prod`: `BETTER_AUTH_URL` và `WEB_ORIGIN` → `https://onboard.j2teamnnl.com`, rồi `dc up -d api web`. Auth chỉ nhận một origin, nên sau bước này đăng nhập qua URL `*.ts.net` sẽ không còn chạy.
5. Google OAuth (nếu bật): redirect URI → `https://onboard.j2teamnnl.com/api/auth/callback/google`.

### Website = app Expo (web build tĩnh)

Từ 2026-10-02 toàn bộ site ở `/` là bản web của `apps/mobile` (Expo Router, `web.output = single`). Next.js `apps/web` không còn được Caddy route tới (container `web` có thể dừng). Đường dẫn cũ `/app/*` và các path tiếng Việt cũ (`/dang-ky`, `/tai-khoan`, `/ket-ban/:code`…) được Caddy redirect 308.

Build không chạy trong Docker:

```bash
pnpm --filter @onboard/shared build
pnpm --filter @onboard/mobile export:web
rsync -a --delete apps/mobile/dist/ vps:Code/onboardvn/deploy/mobile-web/
ssh vps 'cd ~/Code/onboardvn && docker compose -p onboard --env-file .env.prod -f compose.prod.yml -f compose.vps.yml restart caddy'
```

**Bản đồ:** `/map` dùng MapLibre + OpenFreeMap (miễn phí, không cần key). Google Maps Platform không dùng được với tài khoản thanh toán Việt Nam (Việt Nam nằm trong danh sách vùng bị cấm của Google từ 03/2022); nút "Chỉ đường" mở Google Maps bằng link thường nên không bị ảnh hưởng.

`deploy/mobile-web/` bị gitignore. Restart caddy là bắt buộc khi đổi `deploy/Caddyfile` bằng `scp` (bind mount giữ inode cũ). Rollback về Next.js: khôi phục khối `handle { reverse_proxy web:3000 }` trong `deploy/Caddyfile` từ git history và `docker compose … up -d web caddy`.

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

## Đồng bộ club từ app ngoài (tùy chọn)

Tắt mặc định. Bật bằng 2 biến môi trường của API: `EXTERNAL_CLUB_PLUGIN` (đường dẫn tuyệt đối tới module ESM plugin, mount vào container) và `EXTERNAL_CLUB_BASE_URL` (truyền cho plugin). Plugin implement `ExternalClubSource` ([types.ts](../apps/api/src/integrations/external-club/types.ts)) và nằm ngoài repo công khai.

```bash
# backup DB trước lần chạy đầu (có migration), rồi:
pnpm --filter @onboard/api sync:club --club <slug> [--from YYYY-MM-DD] [--to YYYY-MM-DD] [--dry-run]
```

`--dry-run` chạy toàn bộ trong 1 transaction rồi rollback và in số lượng tạo/sửa. Chạy lại nhiều lần là idempotent (ánh xạ qua `external_refs`). Mỗi ngày thành 1 Kèo `club`, mỗi bàn thành 1 `meetup_tables`; người chơi chưa có tài khoản nằm ở `meetup_table_external_players` (không tạo user giả).

## Import ảnh bìa + mô tả từ BGG

Nguồn: cache BGG trong `data/private/bgg/` (gitignore). File gộp `data/private/bgg/bgg-content-vi.json` (mảng `{bggId, imageUrl, descriptionVi}`); script chỉ điền game chưa có ảnh upload / chưa có mô tả, chạy được nhiều lần:

```bash
dc run --rm -e DATA_DIR=/app/data migrate node dist/db/import-bgg-content.js --dry-run
dc run --rm -e DATA_DIR=/app/data migrate node dist/db/import-bgg-content.js
```

Backup DB trước khi chạy thật (`./deploy/backup.sh`).

## Môi trường nội bộ trên VPS (chỉ tailnet, build tại chỗ)

`compose.vps.yml` chồng lên `compose.prod.yml`: build image api/web tại máy (`onboard-api:vps`, `onboard-web:vps`), mount `./data` (read-only) và plugin club riêng (`PRIVATE_PLUGINS_DIR`, mặc định `../onboardvn-private/plugins`), thêm `mailpit` làm SMTP sink (`SMTP_URL=smtp://mailpit:1025`, UI `127.0.0.1:8025`) để đọc link xác minh/OTP mà không gửi mail thật. `.env.prod` cần thêm `EXTERNAL_CLUB_BASE_URL`.

```bash
dc() { docker compose -p onboard --env-file .env.prod -f compose.prod.yml -f compose.vps.yml "$@"; }
dc up -d --build
dc run --rm migrate node dist/db/seed-locations.js
dc run --rm -e ADMIN_EMAIL=<email> migrate node dist/db/seed.js
dc run --rm -e CLUB_SOURCE=thursday_club -e CLUB_SNAPSHOT_DIR=/app/data/private/thursday migrate node dist/db/import-club-games.js
dc run --rm api node dist/integrations/external-club/sync-cli.js --club <slug> --from YYYY-MM-DD
tailscale serve --bg 8080   # KHÔNG dùng funnel
```

Admin seed không có mật khẩu: đăng nhập bằng email OTP (đọc OTP trong mailpit) rồi đặt mật khẩu qua "quên mật khẩu".
