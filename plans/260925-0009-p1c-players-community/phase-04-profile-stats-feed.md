---
phase: 4
title: "Hồ sơ kiểu Steam: thống kê + feed"
status: pending
effort: "1.5d"
dependencies: [1, 2, 3]
---
# Phase 4: Hồ sơ kiểu Steam

## Context
- `/u/[username]` tối giản từ P1b-3. Phase 1-3 đã thêm dữ liệu bạn bè, tủ game, ván.
- Không tạo bảng thống kê/activity: **tính on-the-fly bằng SQL aggregate/UNION** (dữ liệu nhỏ ở giai đoạn đầu). Chỉ materialize khi đo được chậm.

## Requirements
- Hồ sơ tab: **Tổng quan** (tổng giờ, số ván, số thắng, top game), **Thư viện** (tủ game + game đã chơi, mỗi game: giờ chơi, số ván, thắng, lần chơi cuối — như Steam library), **Bạn bè**, **Hoạt động**.
- Feed hoạt động = hợp nhất: ván đã chơi, game thêm vào tủ; phase 5/6 bổ sung vào club, tham gia sự kiện.
- `/ban-be/hoat-dong`: feed của bạn bè (chỉ hoạt động mà viewer có quyền xem).
- So sánh với bạn: `/u/[username]/so-sanh` — game cả hai từng chơi chung, số ván chung, thắng/thua đối đầu.
- Mỗi tab tôn trọng visibility tương ứng; mặc định Tổng quan/Thư viện/Hoạt động `public`, Bạn bè `friends`. Không tab nào trả email.

## Files
- Create: `apps/api/src/modules/profiles/{routes,service,repo,profiles.test}.ts`, `packages/shared/src/profiles.ts`.
- Create web: `apps/web/app/u/[username]/(tabs)/...` hoặc query `?tab=` trong page P1b (chọn theo code thật lúc làm), `apps/web/app/u/[username]/so-sanh/page.tsx`, `apps/web/app/ban-be/hoat-dong/page.tsx`, `apps/web/components/activity-feed.tsx`.
- Modify: `apps/web/app/u/[username]/page.tsx` (P1b), đăng ký route/shared.

## API
- `GET /users/:username/stats` → `{totalMinutes, plays, wins, perGame:[{gameId, slug, name, minutes, plays, wins, lastPlayedOn}]}`; giờ tính = tổng `durationMin` của ván user tham gia (ván không có thời lượng: đếm ván, 0 phút).
- `GET /users/:username/activity?cursor=`, `GET /feed/friends?cursor=`.
- `GET /users/:username/compare` (requireUser, cả hai phía `playsVisibility` cho phép viewer).

## Steps
1. Repo aggregate queries (GROUP BY gameId trên `play_players` join `plays`). 2. Activity UNION ALL (plays, user_games) + cursor theo `(occurredAt,id)`; thiết kế hàm nhận danh sách "source" để phase 5/6 thêm nhánh. 3. UI tabs + so sánh. 4. Chặn hiển thị nút admin: component hồ sơ không đọc `role`.

## Validation
- Test: seed 5 ván 2 game → stats đúng; ván không thời lượng; anon xem stats mặc định → 200 có dữ liệu, `friends` → `hidden`; feed bạn bè không lộ hoạt động `private`; compare đối đầu đúng; snapshot response hồ sơ không có `email`.
- EXPLAIN query stats với 10k ván seed < 50ms (index `play_players.userId`).
- Test render: admin xem hồ sơ công khai → không có link `/admin`.

## Risks
- Query chậm khi lớn (L×M) → index + limit; materialize sau.
- Rò feed (M×H) → feed dựng từ cùng hàm visibility của phase 3.
- Rollback: chỉ có code + endpoint mới, không schema.
