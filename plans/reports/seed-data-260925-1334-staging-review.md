# Staging seed dataset review — 2026-09-25

Output: `data/staging/` (not imported into any DB, not committed). Validated with
`pnpm --filter @onboard/api run dataset:validate ../../data/staging` (run from `apps/api/`) →
**`Dataset hợp lệ.`**

## Cafés (25, chỉ Hà Nội)

TP.HCM đã gỡ khỏi `cafes/cafes.csv`, chuyển sang `data/staging/cafes-hcm-pending.csv`
(cùng cấu trúc cột, KHÔNG thuộc dataset chính thức, chờ xử lý sau) — 15 dòng.

Nguồn: web search + trang/fanpage riêng của từng quán (Facebook, Instagram, TikTok,
website) + bài báo/listing công khai khi không có fanpage — không lấy từ Google Maps,
không copy review/ảnh. Tất cả `consentStatus = public_info_only`, `lat`/`lng` để trống.
16/25 dòng nằm trong danh sách 26 tên chủ nhân cung cấp (đã xác minh được địa chỉ hợp
lệ); 9/25 dòng là quán tìm được ở vòng trước, không có trong danh sách chủ nhân, giữ lại
và đánh dấu "ngoài danh sách chủ nhân".

| Café | Địa chỉ | Ward (map) | Độ tin cậy | Fanpage | Nguồn | Trong DS chủ nhân | Ghi chú |
|---|---|---|---|---|---|---|---|
| Fun Board Game & Drink | Ngõ 158, ngách 1, số 31 Nguyễn Khánh Toàn | Phường Cầu Giấy | trung bình | [Facebook/trang](https://facebook.com/FunBoardGameAndDrink) | [nguồn](https://mia.vn/cam-nang-du-lich/cafe-board-game-ha-noi-15458) | Có | Trong danh sách chủ nhân. |
| Minipolo Board Game Cafe | Số 4 dãy F5, ngõ 171 Thái Hà | Phường Đống Đa | cao | [Facebook/trang](https://facebook.com/Minipolo.boardgame) | [nguồn](https://mia.vn/cam-nang-du-lich/cafe-board-game-ha-noi-15458) | Có | Trong danh sách chủ nhân. Địa chỉ cập nhật (khác 101 B9 ngõ 20 Láng Hạ nêu ở bản trước) — có thể đã chuyển địa điểm, cần xác minh. |
| The Root Boardgame Cafe Ngọc Hà | 62 phố Ngọc Hà | Phường Ngọc Hà | cao | [Facebook/trang](https://facebook.com/therootboardgamecafe) | [nguồn](https://www.tripadvisor.com/Restaurant_Review-g293924-d28010678) | Có | Trong danh sách chủ nhân. CỜ: fanpage có bài đăng dạng "xin phép đóng cửa nghỉ ngơi" — nghi đã ngừng hoạt động, cần xác minh trước khi publish. |
| The Root Boardgame Cafe | 72 phố Trần Xuân Soạn | Phường Hai Bà Trưng | cao | [Facebook/trang](https://facebook.com/therootboardgamecafe) | [nguồn](https://www.facebook.com/therootboardgamecafe/) | Có | Trong danh sách chủ nhân. |
| Pi Coffee BoardGame (Linh Quang) | Số 94, ngách 51 Linh Quang | Phường Đống Đa | trung bình | [Facebook/trang](https://facebook.com/p/PI-Coffee-BoardGame-100090455926976) | [nguồn](https://p-i-coffee-boardgame-1.wheree.com/) | Có | Trong danh sách chủ nhân. |
| The Cozy Village - Nona Boardgame (Chùa Bộc) | Đối diện số 112, ngõ 95 Chùa Bộc | Phường Đống Đa | cao | [Facebook/trang](https://www.tiktok.com/@nonacafeboardgame) | [nguồn](https://www.tiktok.com/@nonacafeboardgame/video/7476708955046153480) | Có | Trong danh sách chủ nhân (gộp với "Nona Cafe & Boardgame" bản trước, cùng thương hiệu). |
| The Cozy Village - Nona Boardgame (Hoàng Ngân) | Số 42, ngõ 114 Hoàng Ngân | Phường Cầu Giấy | cao | [Facebook/trang](https://www.tiktok.com/@nonacafeboardgame) | [nguồn](https://www.tiktok.com/@nonacafeboardgame/video/7476708955046153480) | Có | Trong danh sách chủ nhân — chi nhánh 2. |
| The Cozy Village - Nona Boardgame (Hà Đông) | 214 La Casta, Văn Phú | Phường Hà Đông | cao | [Facebook/trang](https://www.tiktok.com/@nonacafeboardgame) | [nguồn](https://www.tiktok.com/@nonacafeboardgame/video/7476708955046153480) | Có | Trong danh sách chủ nhân — chi nhánh 3 (nghiên cứu phát hiện thêm ngoài 2 chi nhánh chủ nhân nêu). |
| Neverland Boardgame Market Đống Đa | 29, ngách 31, ngõ 167 Tây Sơn (Complex 01) | Phường Đống Đa | cao | [Facebook/trang](https://facebook.com/Neverlandboardgamemarket) | [nguồn](https://mia.vn/cam-nang-du-lich/kham-pha-to-hop-giai-tri-complex-01-gay-sot-gioi-tre-ha-thanh-2832) | Có | Trong danh sách chủ nhân. |
| The Keep Cafe Working Space & BoardGame | 1C, ngõ 76 Kim Mã Thượng | Phường Ngọc Hà | cao | [Facebook/trang](https://facebook.com/thekeepboardgame) | [nguồn](https://www.facebook.com/thekeepboardgame/) | Có | Trong danh sách chủ nhân — cơ sở 1 (ward sửa lại thành Phường Ngọc Hà, khác bản trước gán nhầm Ba Đình). |
| The Keep Cafe & Board Game (Yên Hòa) | 26 Nguyễn Bá Khoản | Phường Yên Hòa | cao | [Facebook/trang](https://facebook.com/thekeepboardgame) | [nguồn](https://www.facebook.com/thekeepboardgame/) | Có | Trong danh sách chủ nhân — cơ sở 2. |
| CO-PLAY STATION | Số 1H8, ngõ 130 Xuân Thủy | Phường Cầu Giấy | cao | [Facebook/trang](https://facebook.com/p/Co-Play-Station-61584718590428) | [nguồn](https://www.instagram.com/p/DTVVONKETxi/) | Có | Trong danh sách chủ nhân. |
| DNA Cafe Box, Boardgame and Workshop | Số 11, ngõ 178 Thái Hà | Phường Đống Đa | trung bình | [Facebook/trang](https://facebook.com/DNACoffeeBBW) | [nguồn](https://us.trip.com/moments/detail/hanoi-181-123334122/) | Có | Trong danh sách chủ nhân. |
| Bảo tàng Boardgame Mazzy (Mazzy Board Game Museum) | 75, ngõ 6 Đặng Văn Ngữ, Trung Tự | Phường Đống Đa | trung bình | — | [nguồn](https://www.youtube.com/watch?v=vkd249yT-2I) | Có | Trong danh sách chủ nhân. Không tìm thấy fanpage công khai. |
| The Dice Cafe & Board Game | Số 14, ngõ 612 Đê La Thành | Phường Ba Đình | cao | — | [nguồn](https://mia.vn/cam-nang-du-lich/cafe-board-game-ha-noi-15458) | Có | Trong danh sách chủ nhân. |
| Pi Coffee BoardGame (Thái Hà, cơ sở 2) | Tầng 8+9, số 15 ngõ 41 Thái Hà | Phường Đống Đa | trung bình | [Facebook/trang](https://www.instagram.com/pi.coffee.boardgame/) | [nguồn](https://www.instagram.com/pi.coffee.boardgame/) | Có | Trong danh sách chủ nhân — chi nhánh 2 của Pi Coffee BoardGame. |
| The Nest - Board Game Cafe | Số 4A phố Tràng Thi | Phường Hoàn Kiếm | trung bình | — | [nguồn](https://baolaocai.vn/top-7-quan-cafe-board-game-ha-noi-noi-tieng-nhat-thu-do-post448711.html) | Không | Ngoài danh sách chủ nhân. Mâu thuẫn nguồn địa chỉ (xem báo cáo trước: mia.vn/mytour.vn ghi Thái Hà, Đống Đa). |
| GG Club Boardgame | Số 15 phố Bùi Ngọc Dương | Phường Hai Bà Trưng | cao | — | [nguồn](https://baolaocai.vn/top-7-quan-cafe-board-game-ha-noi-noi-tieng-nhat-thu-do-post448711.html) | Không | Ngoài danh sách chủ nhân. |
| Gotham Board Game & Coffee | Ngõ 106 phố Chùa Láng | Phường Đống Đa | cao | — | [nguồn](https://baolaocai.vn/top-7-quan-cafe-board-game-ha-noi-noi-tieng-nhat-thu-do-post448711.html) | Không | Ngoài danh sách chủ nhân. |
| The Cube Cafe | Số 168A phố Trấn Vũ | Phường Tây Hồ | trung bình | — | [nguồn](https://baolaocai.vn/top-7-quan-cafe-board-game-ha-noi-noi-tieng-nhat-thu-do-post448711.html) | Không | Ngoài danh sách chủ nhân. |
| Look Boardgame Station | Ngõ 157B phố Chùa Láng | Phường Đống Đa | cao | — | [nguồn](https://baolaocai.vn/top-7-quan-cafe-board-game-ha-noi-noi-tieng-nhat-thu-do-post448711.html) | Không | Ngoài danh sách chủ nhân. |
| Mezzico Tea & Coffee | Tầng 2, biệt thự cổ số 25 phố Hàm Long | Phường Hoàn Kiếm | trung bình | — | [nguồn](https://mia.vn/cam-nang-du-lich/cafe-board-game-ha-noi-15458) | Không | Ngoài danh sách chủ nhân. |
| Mobius Space - Cafe & Boardgame | 137 phố Nguyễn Chí Thanh | Phường Đống Đa | cao | — | [nguồn](https://vinwonders.com/vi/wonderpedia/news/cafe-board-game-ha-noi/) | Không | Ngoài danh sách chủ nhân. |
| Lofi-Sweep Boardgames & Cafe | 489 phố Hoàng Quốc Việt, Cổ Nhuế | Phường Cầu Giấy | **thấp** | — | [nguồn](https://mia.vn/cam-nang-du-lich/cafe-board-game-ha-noi-15458) | Không | Ngoài danh sách chủ nhân. wardCode ước lượng, Cổ Nhuế trước đây KHÔNG thuộc Cầu Giấy — cần xác minh lại. |
| Boardgame Center | Số 4, ngõ 45 phố Kim Mã Thượng | Phường Ngọc Hà | cao | [Facebook/trang](https://facebook.com/Boardgamcenter) | [nguồn](https://www.facebook.com/Boardgamcenter/) | Không | Ngoài danh sách chủ nhân. Ward sửa lại thành Phường Ngọc Hà (cùng khu The Keep CS1). |

### Tên trong danh sách chủ nhân chưa xác minh được địa chỉ (không đưa vào cafes.csv)

| Tên (theo chủ nhân cung cấp) | Lý do / ghi chú |
|---|---|
| Xô Board Game Cafe | Không tìm thấy địa chỉ/fanpage công khai đáng tin. |
| Mystic Cafe Boardgames & Murder mystery | Không tìm thấy địa chỉ/fanpage công khai đáng tin. |
| Neverland's Boardgame Market Tây Hồ | Chỉ xác nhận được chi nhánh Đống Đa (đã đưa vào cafes.csv); chưa xác minh được địa chỉ cụ thể chi nhánh Tây Hồ, có thể tên gọi cũ/nhầm với chi nhánh Đống Đa. |
| Đảo Rồng Board Games | Không tìm thấy địa chỉ/fanpage công khai đáng tin. |
| Chạm Mây Boardgame & Cafe | Không tìm thấy địa chỉ/fanpage công khai đáng tin. |
| Room Coffee có Boardgame | Không tìm thấy địa chỉ/fanpage công khai đáng tin. |
| ỒN ROOM | Không tìm thấy địa chỉ/fanpage công khai đáng tin. |
| Roll Mi | Vietnamese Banh Mi & Boardgame Cafe | Không tìm thấy địa chỉ/fanpage công khai đáng tin. |
| Nomomate (Coffee & Merchandise) | Không tìm thấy địa chỉ/fanpage công khai đáng tin. |
| Playdi - Tổ hợp Cà phê Board Game & Workshop | Không xác định được địa chỉ cụ thể. |
| Ăn Chơi Xuyên Việt | Chỉ biết nằm ở khu vực Long Biên, chưa có địa chỉ cụ thể/nguồn xác nhận. |

**Cảnh báo hoạt động**: The Root Boardgame Cafe Ngọc Hà có dấu hiệu đã đóng cửa (fanpage
có bài đăng dạng "xin phép đóng cửa nghỉ ngơi") — cần xác minh trước khi publish công khai.
Minipolo có địa chỉ cập nhật khác với báo cáo trước (Thái Hà thay vì Láng Hạ) — có thể đã
chuyển địa điểm hoặc là chi nhánh khác, cần xác minh. Toàn bộ 25 dòng chưa xác nhận trực
tiếp "còn hoạt động 2025-2026" ngoài việc thấy fanpage tồn tại.

`cafes/cafe_games.csv` để trống (chỉ có header) — không có nguồn công khai đáng tin cậy nào liệt
kê chính xác danh mục game từng quán đang sở hữu.

## Games (170 games)

Nguồn: Wikidata SPARQL (`query.wikidata.org/sparql`, 2 query, User-Agent riêng, không scrape BGG).
Khớp ~223 tên game phổ biến (party/family/gateway/strategy, ưu tiên game phổ biến ở board game
café Việt Nam) với dữ liệu Wikidata có `P2339` (BGG ID). 170/223 khớp được; phần còn lại (~53,
gồm nhiều game bài truyền thống như Poker/Bridge/Rummy/Mancala hay game không có trang Wikidata
độc lập rõ ràng) bị bỏ qua thay vì đoán/fabricate.

Sample 20 (theo slug): 7-wonders, abalone, agricola, alhambra, avalon (The Resistance: Avalon),
azul, backgammon, bang-the-bullet, betrayal-at-house-on-the-hill, brass-birmingham, carcassonne,
catan, chess, codenames, coup, dixit-odyssey→dixit, dominant-species, dobble, el-grande,
everdell.

**Field coverage**: `bggId`, `minPlayers`, `maxPlayers`, `minAge` có ở phần lớn game khớp được;
`playMinutes` (Wikidata `P2047`) có ở khoảng 2/3 số dòng — game không có sẽ để trống, không suy
đoán. `weight` để trống toàn bộ (Wikidata không có complexity rating dạng BGG weight). `nameVi`
chỉ điền cho ~13 game có nhãn tiếng Việt thật trong Wikidata hoặc tên cộng đồng đã biết rõ (Ma
Sói, Cờ Vua, Cờ Tướng, Cờ Vây, Cờ Đam, Mạt Chược, Mèo Nổ...). `isVietnamese = false` cho toàn bộ
170 game — không tìm thấy game nào trong danh sách có xuất xứ Wikidata ghi là Việt Nam.
`categories` chỉ gán cho ~120 game có thể loại tự tin ánh xạ (Party Game, Strategy Game, Social
Deduction, Cooperative Game, v.v. — 20 category tự định nghĩa, không có trong Wikidata, đặt
`kind=category`). `videoUrls` để trống toàn bộ.

**Gaps đáng chú ý**: Uno, Azul: các bản mở rộng (Summer Pavilion, Stained Glass of Sintra),
Spirit Island, Arkham Horror (bản gốc — chỉ khớp được bản 3rd Edition), nhiều game bài dân gian
(Poker, Bridge, Rummy, Solitaire, Mancala, Shogi, Pai Gow...) không khớp được do không có mục
Wikidata rõ ràng dưới tên chính xác hoặc bị phân loại khác — bỏ qua thay vì đoán bừa.

`facts/barcodes.csv` để trống (chỉ header) — không có nguồn mã vạch công khai đáng tin trong phạm
vi task này.

## Giấy phép

- `facts/` (games.csv, categories.csv, barcodes.csv): **CC0 1.0** — toàn bộ dữ kiện lấy từ
  Wikidata (CC0), không copy mô tả/nội dung sáng tạo từ BGG hay nguồn nào khác.
- `admin-units/`: **MIT** — copy trực tiếp từ `apps/api/data/admin-units.json` (nguồn gốc
  ThangLeQuoc/vietnamese-provinces-database), kèm `LICENSE-MIT.txt` đúng nội dung dùng trong
  `export.ts`.
- `cafes/`: **CC BY-SA 4.0** — thông tin công khai (địa chỉ, tên quán) thu thập từ bài viết/
  fanpage công khai, `consentStatus = public_info_only` cho toàn bộ, không copy review/ảnh.
- `descriptions/games.csv`: để trống (chỉ header) — mô tả sáng tạo cần viết mới, ngoài phạm vi
  task này.
- `LICENSE` gốc: file tóm tắt license theo từng thư mục, viết mới dựa theo cách trang
  `/developers` của web app mô tả (facts=CC0, admin-units=MIT, mô tả/café=CC BY-SA 4.0).

## Cần chủ nhân xác minh trước khi dùng

1. **11 tên trong danh sách chủ nhân chưa xác định được địa chỉ** — xem bảng "Tên trong danh sách
   chủ nhân chưa xác minh được địa chỉ" ở trên (Xô, Mystic, Neverland Tây Hồ, Đảo Rồng, Chạm Mây,
   Room Coffee có Boardgame, ỒN ROOM, Roll Mi, Nomomate, Playdi, Ăn Chơi Xuyên Việt).
2. **The Root Boardgame Cafe Ngọc Hà** — nghi đã đóng cửa theo fanpage, cần xác minh trước khi dùng.
3. **Minipolo** — địa chỉ mới (Thái Hà) khác báo cáo trước (Láng Hạ), cần xác minh còn hoạt động ở
   địa chỉ nào.
4. **The Nest** (giữ lại, ngoài danh sách chủ nhân) — 2 địa chỉ mâu thuẫn giữa các nguồn (Tràng Thi
   vs Thái Hà, Đống Đa).
5. **Lofi-Sweep Boardgames & Cafe** (ngoài danh sách chủ nhân) — wardCode ước lượng thấp, Cổ Nhuế
   trước đây không thuộc Cầu Giấy.
6. **TP.HCM** — đã tách toàn bộ 15 dòng ra `data/staging/cafes-hcm-pending.csv` (không thuộc
   dataset), chờ chủ nhân cung cấp danh sách tên cụ thể như đã làm với Hà Nội trước khi đưa lại vào
   `cafes.csv`.
7. **Trạng thái hoạt động 2025-2026** của toàn bộ 25 quán Hà Nội chưa được xác minh trực tiếp
   (không scrape Google Maps theo yêu cầu); nên gọi điện/xem fanpage trước khi công khai.
8. **Games**: xem xét có cần bổ sung `Uno`, `Spirit Island`, các expansion Azul, hoặc chấp nhận
   thiếu vì không có trong Wikidata dưới dạng khớp được.
