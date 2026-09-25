---
phase: 4
title: "Hồ sơ kiểu Steam: thống kê + feed + học/dạy"
status: pending
effort: "2d"
dependencies: [1, 2, 3, 6]
---
# Phase 4: Hồ sơ kiểu Steam

## Context
- `/u/[username]` từ P1b-3. Phase 1, 2, 6, 3 (theo thứ tự thực thi) đã có bạn bè, tủ game (`user_games`, apps/api/src/db/schema/shelf.ts:5), Kèo + bàn (`meetups`, `meetup_tables`, `meetup_participants`), ván (`plays`, `play_players`).
- Không tạo bảng thống kê/activity: **tính on-the-fly bằng SQL aggregate/UNION**. Chỉ materialize khi đo được chậm.

## Requirements
- Tab **Tổng quan**: tổng giờ, số ván, số thắng, top game, **owned / hosted / brought**.
- Tab **Thư viện**: tủ game + game đã chơi; mỗi game: giờ, số ván, thắng, lần chơi cuối, **exp**, cờ **muốn học / dạy được**.
- Tab **Bạn bè**, **Hoạt động**. `/friends/activity`: feed bạn bè (chỉ hoạt động viewer có quyền xem).
- So sánh: `/u/[username]/compare` — game chơi chung, số ván chung, thắng/thua đối đầu.
- **Muốn học / dạy được**: user tự bật 2 cờ trên bất kỳ game nào (không cần có trong tủ). Hiện trên hồ sơ; phase 5 tổng hợp theo club.
- **Định nghĩa số liệu (chốt)**:
  - `owned` = số dòng `user_games` của user.
  - `tablesHosted` = số `meetup_tables` có `hostUserId=user`, meetup `status='scheduled'` và `startsAt < now()`.
  - `gamesBrought` = số `meetup_tables` có `broughtByUserId=user`, `gameId` not null, cùng điều kiện meetup như trên (1 game mang tới 2 buổi = 2).
  - `exp(user, game)` = `COUNT(DISTINCT plays.id)` từ `play_players` (dòng `userId=user`, không tính guest) join `plays` có `gameId=game`. Không tính thời lượng, không tính Kèo không ghi ván. Rời ván → giảm exp.
- Feed = UNION: ván đã chơi, game thêm vào tủ, tham gia Kèo (`going`, theo visibility meetup); phase 5 thêm "vào club".
- Visibility: Tổng quan/Thư viện/Hoạt động theo `playsVisibility` (mặc định `public`), tủ game theo `profileVisibility`, Bạn bè theo `friendsVisibility` (mặc định `friends`) (apps/api/src/db/schema/auth.ts:28-34). Không tab nào trả email.

## Data
- `user_game_interests(userId cascade, gameId cascade, wantsToLearn bool default false, canTeach bool default false, updatedAt)` PK(userId,gameId); index (gameId). Cả 2 cờ false → xóa dòng.

## Files
- Create: `apps/api/src/db/schema/interests.ts`, `apps/api/src/modules/profiles/{routes,service,repo,profiles.test}.ts`, `packages/shared/src/profiles.ts`.
- Create web: tabs trong `apps/web/app/u/[username]/` (`?tab=` hoặc route con, chọn theo code thật), `apps/web/app/u/[username]/compare/page.tsx`, `apps/web/app/friends/activity/page.tsx`, `apps/web/components/{activity-feed,game-interest-toggle}.tsx`.
- Modify: `apps/web/app/u/[username]/page.tsx`, đăng ký schema/route/shared.

## API
- `GET /users/:username/stats` → `{totalMinutes, plays, wins, owned, tablesHosted, gamesBrought, perGame:[{gameId, slug, name, minutes, plays, wins, exp, lastPlayedOn, wantsToLearn, canTeach}]}`; giờ = tổng `durationMin` (ván không thời lượng: 0 phút).
- `PUT /me/game-interests/:gameId {wantsToLearn, canTeach}`, `GET /users/:username/game-interests`.
- `GET /users/:username/activity?cursor=`, `GET /feed/friends?cursor=`, `GET /users/:username/compare` (requireUser, cả hai phía cho phép viewer).

## Steps
1. Schema interests + migration. 2. Repo aggregate (plays GROUP BY gameId; hosted/brought COUNT trên `meetup_tables`); export hàm `memberStats(userIds[], scope?)` để phase 5 dùng lại (DRY). 3. Activity UNION ALL + cursor `(occurredAt,id)`, hàm nhận danh sách source. 4. UI tabs + toggle học/dạy + compare. 5. Component hồ sơ không đọc `role`.

## Validation
- Test: seed 5 ván 2 game → stats + exp đúng; B rời 1 ván → exp giảm; ván không thời lượng; 2 bàn host (1 tương lai, 1 cancelled, 1 quá khứ) → `tablesHosted=1`; brought 2 buổi → 2; anon mặc định → 200, `friends` → `hidden`; toggle cả 2 false → xóa dòng; feed bạn bè không lộ Kèo `private`; compare đúng; snapshot không có `email`.
- EXPLAIN stats 10k ván seed < 50ms.
- Test render: admin xem hồ sơ công khai → không có link `/admin`.

## Risks
- Query chậm (L×M) → index + limit; materialize sau.
- Rò feed/Kèo (M×H) → feed dùng cùng hàm visibility phase 3/6.
- Rollback: drop `user_game_interests`; phần còn lại là code + endpoint.
