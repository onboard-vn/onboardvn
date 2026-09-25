---
type: planner
date: 2026-09-25
plan: plans/260925-0009-p1c-players-community/plan.md
---
# Planner – P1c Người chơi & cộng đồng

- 8 phase, ~16.5-17.5d, chạy sau P1b. Track người chơi (1-6) + track chủ quán (7-8); thực thi tuần tự vì dùng chung file đăng ký + migration.
- Thiết kế chính: 1 mô hình ván (`plays` + `play_players` user|guest); thống kê/feed tính on-the-fly; bạn bè qua token QR (thành bạn ngay) + lời mời chờ duyệt (block, rate limit, badge, email tùy chọn); visibility 3 mức, mặc định ván/thống kê = public; sự kiện = Kèo (roadmap bỏ giai đoạn Kèo riêng).
- Chủ quán tái dùng thiết kế P2 → **P2 cần cắt còn import CSV/JSON + preset + template** (P2 phases 1-3 chuyển vào P1c phase 7; không sửa file P2); đề xuất đổi tiêu đề P2 thành "P2 – Import quán/kho".
- Community scan: cột `cafe_games.source`, bảng audit, rate limit theo user, `addedBy` chỉ trả cho role admin (không maintainer, không chủ quán); user thường không link barcode mới.
- Phát hiện: barcode lookup hiện chỉ maintainer (apps/api/src/modules/barcodes/routes.ts:11) → phase 8 mở cho user; manage DTO trả `addedBy` cho maintainer (apps/api/src/modules/cafes/service.ts:56) → phase 8 lọc.

## Câu hỏi chưa giải quyết
Không còn — chủ nhân chốt toàn bộ 2026-09-25 (xem plan.md mục Quyết định bổ sung).
