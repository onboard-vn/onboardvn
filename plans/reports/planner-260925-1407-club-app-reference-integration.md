# Club app tham chiếu → OnBoardVN: mapping, gap, tích hợp 2 chiều

Nguồn: 4 screenshot app club (tên/URL chưa biết). Đối chiếu P1c ([plan](../260925-0009-p1c-players-community/plan.md)) + schema `apps/api/src/db/schema/*.ts`.

## 1. Feature mapping
| App club | OnBoardVN | Trạng thái |
|---|---|---|
| Account | `/account` (P1b-3), privacy 3 nhóm (`auth.ts:28-34`) | done |
| Members (danh bạ) | Club members (phase 5) | planned |
| Games (kho của member, owner names) | Tủ game `user_games` (`shelf.ts:5`), `/shelf`; kho club = union tủ member (phase 5) | done / planned |
| "Which day are you playing?" (đăng ký theo buổi) | Kèo = session + RSVP (phase 6) | planned (đổi model) |
| Session nhiều bàn (host, game, ghế, người ngồi) | `meetup_tables` (phase 6) | **thiếu → đã thêm** |
| "→ 2026-09-26" (mang game tới buổi) | `meetup_tables.broughtByUserId` + game từ tủ (phase 6), hiện trên kho club (phase 5) | **thiếu → đã thêm** |
| Want-to-learn / "N exp" | `user_game_interests` + exp = số ván đã ghi (phase 4) | **thiếu → đã thêm** |
| Calendar tháng (N players · N tables) | `GET /events/calendar` (phase 6), view club (phase 5) | **thiếu → đã thêm** |
| Member stats owned/hosted/brought + tổng club | profile (phase 4) + member list club (phase 5) | **thiếu → đã thêm** |
| History | Lịch sử ván (phase 3) + Kèo đã tham gia | planned |
| Activity (badge) | Feed (phase 4) + badge lời mời (phase 1) | done / planned |
| Donate, Feedback | — | ngoài scope (non-goal) |

## 2. Conflict
- **Code: không có** conflict (chưa có bảng events/clubs/plays; `user_games` PK(userId,gameId) dùng lại được).
- **Định vị**: app club = công cụ nội bộ 1 club (Thursday nights). OnBoardVN = nền tảng mở nhiều club + quán + bản đồ. Không cạnh tranh trực tiếp → tích hợp để member dùng app nào cũng được; OnBoardVN thêm giá trị ở quán/bản đồ/Kèo public.
- Overlap: danh bạ member, kho game, đăng ký buổi → phải có luật source-of-truth (mục 3.3) để không double-count.

## 3. Tích hợp 2 chiều (P1d – Tích hợp club ngoài)
### 3.1 Phương án (xếp hạng)
| # | Phương án | Điều kiện | Ghi chú |
|---|---|---|---|
| a | **API/webhook → connector** (khuyến nghị) | App có REST/GraphQL + (tốt nhất) webhook | Sync 2 chiều thật, gần realtime |
| b | Export/import CSV/JSON | App export được | 1 chiều mỗi lần, admin chạy tay/định kỳ; chiều ngược = file cho admin import |
| c | Thủ công | Không API, không export | Member tự nhập; OnBoardVN cung cấp link Kèo/ICS để chia sẻ |
| — | **Scraping: KHÔNG** | | Vi phạm ToS, dữ liệu cá nhân, dễ vỡ |

### 3.2 Connector (a)
- **Kết nối club-level**: admin club OnBoardVN (role `owner|admin` phase 5) nhập API token hoặc OAuth với app nguồn → `external_sources`.
- **Liên kết member**: chỉ member **tự đồng ý** (opt-in trong `/account`) → match theo email đã verify **hoặc** username nguồn + xác nhận (link/mã). Không tự ghép âm thầm theo tên.
- **Idempotent**: mọi entity sync qua `external_links`; upsert theo `(source, entity_type, external_id)`; webhook có event id → dedupe; cursor `updated_since` cho poll.
- **Chiều sync**:

| Entity | Nguồn → OnBoardVN | OnBoardVN → nguồn |
|---|---|---|
| Game catalog | map theo BGG id/tên → `games` (không tạo game mới tự động, vào queue duyệt) | không |
| Kho club (tủ member) | → `user_games` (chỉ member đã link) | tủ của member đã link |
| Members | chỉ member consent → `club_members` | không (tránh đẩy PII) |
| Sessions/tables/RSVP | → `meetups`/`meetup_tables`/`meetup_participants` | Kèo `visibility=club` của club đã kết nối + RSVP của member đã link |
| Plays/exp | tùy API có không | không (P1d quyết) |

- **Conflict rule**: mỗi entity có 1 owner = hệ tạo ra nó (`external_links.origin`). Sửa ở hệ không-owner → đẩy về owner, không ghi đè cục bộ; cùng lúc 2 phía → last-write-wins theo `updatedAt` owner, log vào `sync_runs`. Xóa: chỉ owner xóa; bên kia soft-unlink.

### 3.3 Data model bổ sung (P1d)
- `external_sources(id, clubId, kind, baseUrl, authType 'token'|'oauth', credentialsEnc bytea, webhookSecretEnc, status, lastSyncedAt, createdBy)`.
- `external_links(entityType, entityId, sourceId, externalId, origin 'local'|'remote', syncedAt, hash)` UNIQUE(sourceId, entityType, externalId), UNIQUE(sourceId, entityType, entityId).
- `external_account_links(userId, sourceId, externalUserId, consentedAt, revokedAt)`.
- `sync_runs(id, sourceId, direction, startedAt, finishedAt, status, counts jsonb, error text)`.

### 3.4 Privacy / consent
- Dữ liệu member = dữ liệu cá nhân (NĐ 13/2023): cần cơ sở hợp pháp = consent từng member; admin club **không** consent thay member.
- Member chưa link: không import tên/avatar; bàn/RSVP của họ hiện "Thành viên club" ẩn danh hoặc chỉ đếm số.
- Revoke → xóa `external_account_links` + dữ liệu nhập về của member đó trong 30 ngày; ngừng đẩy.
- Privacy OnBoardVN (`canView`, `apps/api/src/lib/visibility.ts:16`) vẫn áp dụng cho dữ liệu nhập về. Không bao giờ sync email ra ngoài.

### 3.5 Security
- Token/secret mã hóa server-side (AES-256-GCM, key từ env/KMS), không trả về client, không log.
- Webhook verify HMAC + timestamp; rate limit; scope token tối thiểu (read + RSVP).
- Quyền kết nối: chỉ `owner|admin` club; audit mọi connect/disconnect.

## 4. Đã cập nhật P1c
plan.md, phase-04/05/06 theo model session → tables (xem file). Phase 3 (ghi ván từ bàn Kèo) và phase 7 (link mời chủ quán + consent) cũng đã cập nhật.

## Câu hỏi cho admin club
1. Tên app, URL, ai build/host? Stack (framework, DB)?
2. Có API (REST/GraphQL)? Webhook? Auth kiểu gì (token/OAuth)? Có tài liệu?
3. Có export CSV/JSON (members, games, sessions, RSVP)?
4. Ai sở hữu dữ liệu member? Member đã đồng ý chia sẻ cho bên thứ 3 chưa?
5. Game map theo BGG id không? "exp" và "Làm sao? Như nào?" nghĩa chính xác là gì?
6. Session có giờ bắt đầu/địa điểm cố định (quán nào)? Bàn có giới hạn ghế không?
7. Muốn sync chiều nào trước; app họ có chấp nhận ghi ngược (RSVP từ OnBoardVN)?
