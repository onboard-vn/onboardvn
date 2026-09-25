# Review P1c (Codex, 2026-09-25): ưu tiên quán, schema, rủi ro

Nguồn: review chỉ đọc bởi Codex; Jarvis lưu lại nguyên ý. Lúc review dữ liệu staging chưa import — đã import vào DB dev ngay sau đó (commit 0c323f3).

## Must
1. **Thứ tự + cổng phát hành** (`plan.md`): bảng phase dễ hiểu nhầm thứ tự; `/map` chưa có phase/route/tiêu chí nghiệm thu. Thêm phase riêng MapLibre/OpenFreeMap + ghim tay. Thêm cổng "deploy ổn định + dữ liệu đã vào DB" trước khi chia sẻ link. `cafe_games.csv` đang trống.
2. **Pitch chủ quán** (`phase-07`, P2): `/my-cafes` có sửa/quét kho nhưng import CSV hoãn sang P2 → cân nhắc kéo CSV tối thiểu vào trước pilot hoặc chốt nhập tay. Xác minh quán còn hoạt động + địa chỉ mâu thuẫn trước khi pitch. Nêu rõ nguồn, mục đích, cách yêu cầu sửa/gỡ. Rà lại căn cứ pháp lý theo **Luật Bảo vệ dữ liệu cá nhân 91/2025/QH15** (hiệu lực 01-01-2026); dữ liệu công khai ≠ đã có consent.
3. **Trạng thái `declined` trên mọi luồng** (`phase-07`, `phase-08`): enum chưa có trong `packages/shared/src/cafes.ts`/schema. Public filter hiện chỉ loại `pending`; dataset export xuất mọi status trừ `pending`; import chỉ bảo vệ `granted` → import lại có thể làm quán đã từ chối hiện lại. Cần predicate dùng chung cho list/detail/game finder/sitemap/map/llms/export; chặn đóng góp khi declined; import không tái xuất bản.
4. **Quyền riêng tư + FK trước migration** (`phase-05/06/03`): `canView` chưa hiểu membership club. Calendar (`meetupIds`, aggregate) phải lọc cùng quyền list/detail cho friends/private/club. Chốt host có tính vào số ghế không, waitlist FIFO, FK `createdBy`/`hostUserId` + hành vi khi xóa user, backfill `plays.clubId` từ meetup. Hash token mời Kèo/club như cafe invite.

## Should
5. Test lạm dụng + consent: declined trên từng surface, quyền owner/staff theo route, spam invite/lookup, giới hạn bulk, audit/retention. User rate limiter dùng store bộ nhớ — chốt store dùng chung khi nhiều instance hoặc ghi rõ giới hạn.
6. Ước lượng lại: ~16 ngày còn lại có vẻ thấp cho Kèo đa bàn + calendar, dashboard/import, club, profile/feed, moderation cộng đồng. Chia lát dọc theo ưu tiên quán.

## Could
7. P1d giữ ở mức khảo sát/pilot (CSV), chưa thiết kế sync hai chiều/webhook khi chưa biết app nguồn và căn cứ consent.

## Câu hỏi mở
- CSV kho quán có bắt buộc trước pilot chủ quán?
- `/map` + kiểm chứng deploy/DB thuộc phase nào?
- Visibility mặc định của Kèo là `public`?
- P1d: app nguồn là gì, căn cứ consent từng thành viên?
