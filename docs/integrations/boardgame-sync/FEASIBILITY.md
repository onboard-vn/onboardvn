# Ma trận khả thi

Ngày 2026-10-16. Đây là contract feasibility, chưa phải các tính năng OnBoardVN đã triển khai. [Nguồn và giới hạn](RESEARCH.md).

## Quy ước

S = Supported theo tài liệu, có điều kiện quyền; P = Partial; X = Unsupported theo contract đang xét; U = Unknown. X không khẳng định không thể có licensed partner API. Cột dữ liệu: collection; plays; scores; ratings/tags; players; metadata bổ sung. Điểm tổng khác score sheet. Official BGG ở đây là official-indexed (trang trực tiếp 403); chưa endpoint PoC.

| Hướng | Collection | Plays | Scores | Ratings/Tags | Players | Metadata | Cơ chế, tự động hóa, bằng chứng |
|---|---|---|---|---|---|---|---|
| BGG → OnBoardVN | S public | S public | P | P ratings/U tags | P | P | XML API2, import/polling có approval; official-indexed, schema PoC pending |
| OnBoardVN → BGG | X | X | X | X | X | X | Public XML chưa có write contract; cooperation/license required |
| OnBoardVN → BG Stats link | X | P | P final | X | P | P | createPlay user-confirmed; official + experimental one-fixture create/replay/update verified, no receipt/global guarantee |
| OnBoardVN → BG Stats file | U | P | P | U | P | P | JSON/.bgsplay user import; official + current format PoC pending |
| BG Stats → OnBoardVN file | P | P | P | U | P | P | User export/upload snapshots; official export + proposed parser, images separate |
| BG Stats → BGG → OnBoardVN | P | P | P | P ratings/U XML tags | P | P lossy | BG Stats Auto-post + approved polling; official, no continuous full-play sync |
| OnBoardVN → BG Catalog | U | U | U | U | U | U | External import/deep-link schema chưa rõ; experimental manifest không đủ |
| BG Catalog → OnBoardVN | U | U | U | U | U | U | Backup/share UI verified; parser/identity/schema/permissions chưa rõ |
| BG Catalog → BGG → OnBoardVN | U | U | U | U | U | U | App quảng bá sync; granular outbound contract chưa kiểm chứng; BGG leg conditional |
| OnBoardVN → BGG → BG Catalog | X | X | X | X | X | X | Bị chặn ở public BGG write leg, inbound Catalog vẫn U |
| BG Stats → BGG → BG Catalog | P | P | U | U | U | U | BG Stats outbound documented + Catalog daily game/play download menu observed; chained round-trip untested, no update/delete guarantee |
| BG Catalog → BGG → BG Stats | U | U | U | U | U | U | Catalog outbound chưa rõ; BG Stats collections/tags sync và manual play import documented |
| BG Stats → OnBoardVN → BG Catalog | U | U | U | U | U | U | File-in khả thi có điều kiện, Catalog out chưa contract |
| BG Catalog → OnBoardVN → BG Stats | U | U | U | U | U | U | Catalog in chưa contract; BG Stats play handoff documented |
| App CLB → OnBoardVN | P inventory | U results | U | U | P roster | P meetings/tables | Source adapter listGames/listMembers/listDays; private plugin runtime chưa kiểm chứng |
| OnBoardVN → app CLB | U | U | U | U | U | U | Không có upstream write contract hoặc development access |

## Chi tiết dữ liệu CLB

| Nhóm | CLB → OnBoardVN | OnBoardVN → CLB | Bằng chứng/giới hạn |
|---|---|---|---|
| Thành viên | P | U | listMembers source interface; runtime private plugin chưa kiểm chứng; không lộ login ID |
| Kho game/chủ sở hữu | P | U | listGames inventory/owner refs; không đồng nghĩa personal copies/wishlist đầy đủ |
| Lịch/buổi chơi | P | U | listDays với tables/timing/venue; không có write contract |
| Đăng ký/attendance | U | U | Seated roster không chứng minh RSVP hoặc tham dự thực tế; cần upstream semantics |
| Ván đã chơi | U | U | Table/status không chứng minh completed canonical play |
| Điểm/kết quả | U | U | Current DTO không có completed scores/results |

Các P là source-only capability, chưa runtime test hoặc chứng minh quyền truy cập upstream. Giữ phạm vi private club.

## BG Catalog sau đăng nhập

[Device follow-up](../../../plans/261016-1043-boardgame-interoperability/reports/bgcatalog-device-followup.md): BGG settings xác nhận account-connected state và có tùy chọn download BGG games/plays hằng ngày. BGG → Catalog collection/game/play path: Partial, user-configured daily-download UI observed; successful run, fields, edits/deletes và conflict semantics chưa thử. Không thay U của Catalog outbound hoặc direct OnBoardVN ingestion. Menu update weight/rating không chứng minh personal-rating sync. Không bật tùy chọn hay chạy sync.

## Mức tự động hóa

- Full automatic bidirectional: chưa xác minh cho bất kỳ cặp nào có OnBoardVN.
- One-way automatic: có thể thiết kế BGG polling sau cấp phép và durable jobs; chưa triển khai.
- Manual/user-confirmed push: BG Stats createPlay; app tự matching và xác nhận, OnBoardVN chỉ biết handoff attempted.
- Snapshot import/export: BG Stats documented; BG Catalog UI có backup nhưng schema unknown.
- Native Android share/link: BG Stats createPlay payload/replay/update experimentally verified với một fixture; Catalog structured payload và các luồng khác chưa thử. Web dùng user gesture/link hoặc QR handoff, không giả định browser gọi native intent tùy ý.
- Ratings/tags support trong BG Stats↔BGG không chứng minh XML API2 đọc được game tags cho OnBoardVN.

## Follow-up BG Stats sau đăng nhập

Experimental UI evidence: BGG → BG Stats manual import chỉ thêm ván chưa biết, không cập nhật ván đã có. Không dùng file-import matching/update semantics để quảng bá chiều BGG inbound. Generic file import có add/update và không xóa; cần fixtures trước adapter implementation. Quantity >1 có thể tách thành nhiều plays, chỉ ván đầu linked BGG; source/destination cardinality không luôn 1:1. Xem [report](../../../plans/261016-1043-boardgame-interoperability/reports/bgstats-device-followup.md).

## Loss budget và dữ liệu giữ lại

BGG bridge không bảo toàn full score sheets, teams, ranks, roles, structured expansions/variants, ảnh hoặc custom metadata. BG Stats có thể giữ expansion/board/variant dưới dạng comments tùy setting; không coi text đó là round-trip schema. Giữ bản canonical và provenance trên OnBoardVN; chỉ xuất field được phép/hỗ trợ với loss preview. Không suy ra xóa từ field vắng hay snapshot thiếu. Account-specific records khác với một physical session; merge phải có explicit links hoặc user review.

## Confidence và nguồn

Official contracts: BG Stats URL/file/matching có độ tin cậy cao cho hành vi đã mô tả; current JSON export và một createPlay flow đã quan sát; full schema, file reimport/cross-device vẫn cần thử. BGG official-indexed mức trung bình do 403 và approval chưa có. BG Catalog marketing mức thấp cho granular sync; manifest/menu mức cao cho sự hiện diện UI/intents, không cho schema. Source audit mức cao cho working tree hiện tại, không cho production.

Xem [BGG report](../../../plans/261016-1043-boardgame-interoperability/reports/bgg-research.md), [app report](../../../plans/261016-1043-boardgame-interoperability/reports/app-contracts.md), [device](../../../plans/261016-1043-boardgame-interoperability/reports/device-findings.md), [source](../../../plans/261016-1043-boardgame-interoperability/reports/source-audit.md) để có URL, path và giới hạn riêng từng chiều.

## Synthetic evidence update

BG Stats createPlay tested one stable source namespace on version6.17.1: initial create, identical replay, changed score/comments replay accepted as existing-play updates; final local JSON has exactly one play and revised scores. Keep status Partial: same-app fixture evidence does not cover cross-device, changed sourceName, lost mappings or full field coverage. JSON export schema observed; parser/newer-older imports remain untested. See [PoC](../../../plans/261016-1043-boardgame-interoperability/reports/bgstats-synthetic-poc.md).
