# Nghiên cứu interoperability OnBoardVN

Ngày: 2026-10-16, Asia/Saigon. Trạng thái: nghiên cứu/source audit và approved local synthetic PoC; chưa triển khai application hoặc remote sync.

## Mục tiêu và bằng chứng

Theo [phạm vi đã chốt](SCOPE.md): dùng song song các app, trao đổi hai chiều khi có kênh hợp lệ; ưu tiên web và thành viên CLB. Đọc [ma trận](FEASIBILITY.md), [kiến trúc](ARCHITECTURE.md), [roadmap](PLAN.md), [kiểm thử](TEST_PLAN.md).

Bốn nhãn: **official** (tài liệu nhà cung cấp), **experimental** (quan sát thiết bị), **hypothesis** (thiết kế/chưa thử), **cooperation** (cần nhà phát triển cấp quyền/contract). Tài liệu BGG bị 403 khi mở trực tiếp; nghiên cứu dùng bản lập chỉ mục của nguồn chính thức, chưa thử endpoint có token. Không coi quan sát manifest là kiểm chứng import thành công.

## Audit codebase

[Source audit chi tiết](../../../plans/261016-1043-boardgame-interoperability/reports/source-audit.md).

- pnpm/Turborepo; Hono/Node, PostgreSQL/Drizzle, Better Auth, Zod; có Next.js web và Expo/React Native Web. Chưa chọn lại framework từ quyết định “web trước”.
- `apps/api/src/db/schema/{games,shelf,plays,identities,external,scoring}.ts` có game UUID/BGG ID, shelf đơn giản, identities, versioned scoring và lịch sử ván. Thiếu collection nhiều bản sở hữu, trạng thái/wishlist/rating/tags, identity provider/account scope, tombstone/provenance và durable sync jobs.
- `apps/api/src/integrations/external-club/types.ts` chỉ có listGames/listMembers/listDays; chưa có completed scores/results hay ghi ngược. Service sync hiện tại có ghi DB, không chạy trong nghiên cứu.
- Tái dùng scorer thuần trong `packages/shared/src/scoring/`, private club gates và DTO conventions. Không dùng auth accounts hiện tại làm chứng cứ cấp quyền BGG.
- Shared-table flow dùng API thật; các route tính điểm độc lập còn dùng mockPlaysApi. Next.js chưa có score/play route. Dirty source không chứng minh production đã có tính năng.
- Acquire: custom input; Agricola: templates nhưng chưa dedicated UI; Critter Kitchen: shared scoring, còn giới hạn rumor/Sauces; Grand Austria Hotel: deluxe template cần xác định edition; The Gang: cooperative outcome, không tự biến thành điểm số.

## BGG

[Report và ma trận chi tiết](../../../plans/261016-1043-boardgame-interoperability/reports/bgg-research.md).

Official-indexed: [hướng dẫn API](https://boardgamegeek.com/using_the_xml_api), [XML API2](https://boardgamegeek.com/wiki/page/BGG_XML_API2), [điều khoản](https://boardgamegeek.com/wiki/page/XML%20API%20Terms%20of%20Use), [đăng ký application](https://boardgamegeek.com/applications).

Application approval/Bearer token không phải OAuth hoặc chứng minh sở hữu username. Có read metadata/collection/plays công khai có điều kiện cấp phép; public write/create/update/delete chưa có contract được xác minh. Không dùng mật khẩu, cookies hoặc private website API. Private collection fields không nằm trong thiết kế credential-free.

Collection có 202 queued; plays phân trang 100; collection modifiedsince không bao gồm xóa. Date filter của plays không phải modification cursor. Cần retry hữu hạn, throttling dùng chung, cache metadata và reconciliation đầy đủ định kỳ. Khoảng 5 giây giữa request chỉ là hướng dẫn được lập chỉ mục, không phải SLA/quota bảo đảm.

Điều khoản liên quan attribution/Powered by BGG, thương mại, biến đổi dữ liệu và data proxy cho app khác cần xác nhận theo use case. Giữ raw data không tự giải quyết quyền normalization/redistribution. Không đưa dữ liệu BGG vào public dataset/export trước khi rõ quyền. Kết luận này là release gate cần xác minh, không phải phê duyệt pháp lý.

## BG Stats

[Report chi tiết hai app](../../../plans/261016-1043-boardgame-interoperability/reports/app-contracts.md).

Official: [createPlay/addPlay](https://www.bgstatsapp.com/support/push-plays-to-bg-stats-from-other-apps-or-websites/), [custom import](https://www.bgstatsapp.com/explanations/importing-own-files-into-board-game-stats/), [backup](https://www.bgstatsapp.com/explanations/backup/), [matching](https://www.bgstatsapp.com/explanations/import-plays-matching-screen/), [BGG import](https://www.bgstatsapp.com/explanations/importing-from-bgg/), [QR](https://www.bgstatsapp.com/explanations/sharing-plays-using-a-qr-code/).

`https://app.bgstatsapp.com/createPlay.html?data=<encoded-json>` hỗ trợ user-confirmed matching/import. SourceName/sourcePlayId/sourceGameId/sourcePlayerId là namespace nguồn; không được mặc định sourcePlayId đảm bảo replay idempotency. Link mở không chứng minh lưu thành công, và Auto-post đã bật trong app có thể đăng ván được chấp nhận lên BGG. Ban đầu chưa thử payload; approved synthetic follow-up bên dưới đã kiểm chứng local create/replay/update trên BG Stats6.17.1.

`addPlay.html?gameId=<bgg-id>` mở màn hình ván mới. JSON/.bgsplay hỗ trợ trao đổi; UUID ổn định và modificationDate quan trọng cho update. File-local id khác UUID. [JSON ví dụ](https://www.bgstatsapp.com/help/BGStatsExport.json) cũ, không phải schema đầy đủ có version hiện hành. Chưa xác minh tombstone/delete/receipt hoặc score-sheet schema mới.

BG Stats collection/game tags sync với BGG không đồng nghĩa play sync tự động hai chiều. Plays có Auto-post outbound và manual inbound import. BGG không bảo toàn structured teams, ranks, roles, expansions đã chơi, score sheets/calculations, ảnh và nhiều metadata. Expansion/board/variant có thể được BG Stats ghi vào comments, không phải cấu trúc round-trip. QR chia sẻ của BG Stats là snapshot có thời hạn, không phải OnBoardVN fetch API.

## BG Catalog

Official: [website](https://bgcatalog.app/), [Play listing](https://play.google.com/store/apps/details?id=com.gadestudios.boardgame), [cards/counters repo](https://github.com/javipacheco/cards-counters-bgg-catalog), [translation repo](https://github.com/javipacheco/multi-language-bg-card-system).

Có quảng bá BGG collection/play sync và QR chia sẻ game/play. Chưa xác minh schema/pagination/update/delete hoặc public external API. Hai repo nội dung không phải source app đầy đủ hoặc contract ghi ván.

## Android thật

[Device report](../../../plans/261016-1043-boardgame-interoperability/reports/device-findings.md). Xiaomi 23127PN0CG, Android 16; BG Stats 6.17.1, BG Catalog 2.61. Pair/connect thành công, cả hai app đã mở và quan sát màn hình.

- BG Stats đang onboarding; không thay đổi setup/account. Manifest có bgstats scheme, app.bgstatsapp.com/cloud hosts, VIEW .bgsplay/.json/.realm.
- BG Catalog home có Connect to BGG; Settings có BGG/Backups/Database/BGA. Backups có tạo, xem/share và restore *.json/*.zip/*.tar. Chỉ mở menu; không tạo/restore file.
- BG Catalog manifest có VIEW .bgcatalog, SEND .bgcatalog, SEND/MULTIPLE images và BGG /boardgame/ links. Image handler không chứng minh nhận structured plays.
- Trong khảo sát ban đầu chưa thử createPlay/import/QR/round-trip; kết quả approved synthetic follow-up bên dưới thay thế trạng thái createPlay. Read-only pm get-app-links xác nhận app.bgstatsapp.com/cloud.bgstatsapp.com verified; Catalog BGG domains trả state 1024, chưa verified. ACTION_VIEW query liệt kê BG Stats và Chrome; chưa thử default routing/payload.

## Việc cần xác minh

BGG application/license/quyền biến đổi và onward export; current synthetic BG Stats export/schema và duplicate/update semantics; BG Catalog synthetic backup/QR contract; quyền đọc/ghi thực tế của app CLB; lựa chọn web framework. Không thu thập token/mật khẩu hoặc liên hệ bên thứ ba trong task này.

## Follow-up sau đăng nhập, khoảng 11:02–11:15

[BG Stats device](../../../plans/261016-1043-boardgame-interoperability/reports/bgstats-device-followup.md): menus BGG/file/backup đã khảo sát read-only. BGG Import chỉ thêm plays chưa biết, không update plays đã tồn tại; generic file import là contract khác (add/update, nothing deleted, preview/cancel). Overview hiện không có ván để inspect per-play sharing. Quantity BGG >1 có thể bị app tách ván, chỉ ván đầu giữ BGG link; BGG posting đặt quantity 1. Expansion và optional board/variant có thể đi dưới dạng comments, không bảo toàn structured fields. Chưa thực hiện import/export/sync.

[CLB browser](../../../plans/261016-1043-boardgame-interoperability/reports/club-browser-followup.md) và [source interpretation](../../../plans/261016-1043-boardgame-interoperability/reports/club-browser-source-followup.md): đã mở bằng Chrome profile hiện tại, có logged-in session. Quan sát day/table/roster/bring/wish, game catalog/member aggregates và History PAST · READ ONLY; chưa thấy completed scores/results trong các màn khảo sát. Read UI phát sinh cả GET và POST RSC text/x-component; không replay server actions hoặc coi là stable public API. Field name secretId được quan sát nhưng ý nghĩa chưa xác minh, không lưu giá trị. Public source chỉ chứng minh normalized loginId → externalLoginId private matching; không chứng minh secretId là credential. Không xuất roster/identifiers vào tài liệu.

[BG Catalog logged-in follow-up](../../../plans/261016-1043-boardgame-interoperability/reports/bgcatalog-device-followup.md): BGG settings hiện connected/correct-login/synchronized labels, tùy chọn download games và plays tự động hằng ngày, update weight/rating và upgrade game version. Chỉ quan sát, không kích hoạt. Đây là evidence UI cho inbound BGG→Catalog, không phải successful job, public API hoặc outbound quyền cho OnBoardVN. Backup menu vẫn có create/view-share/restore, chưa có sample schema.

BG Catalog More/Groups còn có import/export nhóm người chơi và Import group/Download community groups. Chưa thử hoặc có schema; không đồng nhất player group với CLB/permissions. Local games/plays đang trống nên không có record để kiểm tra per-item QR mà không tạo dữ liệu. Cả hai device surveys đã kết thúc, trả điện thoại về BG Catalog Home.

## Approved synthetic PoC — BG Stats 6.17.1

[Exact fixture và kết quả](../../../plans/261016-1043-boardgame-interoperability/reports/bgstats-synthetic-poc.md). Preflight actual Auto-post/delete-sync/cloud switches off; collection chưa setup, tags disabled, không đổi settings. Tạo ONBOARDVN SYNC TEST không BGG ID, hai synthetic players. Identical replay và changed-score replay cùng sourcePlayId đều nhận ra existing play. Local JSON export xác nhận 1 game, 1 location, 1 play, 2 synthetic players + default anonymous; điểm cuối 11.5 và -2, revision2 comments. Đây là bounded experimental evidence cho installed version/source namespace, không phải global idempotency guarantee hoặc callback.

Current export có UUID/local refs, copies và top-level challenges/deletedObjects/games/groups/locations/players/plays/tags/userInfo. deletedObjects tồn tại nhưng không chứng minh deletion semantics. Export importPlayId=0 không bằng sourcePlayId; mapping storage chưa biết. Chưa so UUID trước/sau. Date raw giữ 2026-10-15 17:30:00 và preview Oct15; timezone display chưa kết luận. Chưa file reimport/newer-older/.bgsplay/team/noPoints/QR. QR BG Stats hosted nên không chạy trong local-only approval. Raw account-bearing export giữ cục bộ ngoài repository, không đưa userInfo vào docs. Fixture giữ lại cho owner.

## BG Catalog synthetic gate

[PoC report](../../../plans/261016-1043-boardgame-interoperability/reports/bgcatalog-synthetic-poc.md): daily BGG download checkbox off; Add manually opens name-only dialog, no explicit local/no-sync option observed. Stopped before save because local-only behavior not established; this does not prove manual games auto-post. Device IME also transformed typed fixture name, separate input limitation. No Catalog test record/export/QR generated and no settings changed. Future experiment needs a verified no-outbound contract or isolated approved test environment.
