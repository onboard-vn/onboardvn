/** Bilingual score UI copy, including English labels supplied by shared scoring data. */
type ScoreTranslation = { vi: string; en: string };
type ScoreTranslationMap = Record<string, ScoreTranslation>;

const vietnameseCopy: Record<string, string> = {
  '· chưa nhập': '· not entered',
  '· cổ phiếu nắm giữ': '· shares held',
  '· món giám khảo': '· judge meal',
  '· Người thắng:': '· Winners:',
  '· Thưởng:': '· Bonus:',
  '· vượt mốc 70:': '· over 70:',
  '(khách)': '(guest)',
  '(tham chiếu)': '(reference)',
  '✓ Thành công': '✓ Success',
  '✗ Thất bại': '✗ Failure',
  '2 sao nếu có nguyên liệu giá trị từ 5 trở lên ở ít nhất bảy món.':
    '2 stars if ingredients valued 5 or higher appear in at least seven dishes.',
  '2 sao nếu không có đối thủ nào dùng từ ba gia vị trở lên.':
    '2 stars if no opponent uses three or more spices.',
  '2 sao nếu món cuối cùng có chất lượng cao nhất trong các món đã phục vụ.':
    '2 stars if the final dish has the highest quality of all dishes served.',
  '3 sao nếu có một giá trị nguyên liệu được lặp nhiều nhất (kể cả đồng hạng).':
    '3 stars if one ingredient value occurs most often, including ties.',
  '3 sao nếu giá trị bánh mì cao nhất xuất hiện nhiều nhất trong món của bạn.':
    '3 stars if your dishes contain the highest bread value more often than any other value.',
  '3 sao nếu giá trị cao nhất ở mỗi món đều là số lẻ.':
    '3 stars if the highest value in every dish is odd.',
  '3 sao nếu giá trị phô mai cao nhất đạt ít nhất số món đã phục vụ.':
    '3 stars if your highest cheese value is at least the number of dishes served.',
  '3 sao nếu tổng giá trị cao nhất ở món đầu và món cuối đạt ít nhất 10.':
    '3 stars if the sum of the highest values in your first and last dishes is at least 10.',
  '5 sao nếu giá trị cao nhất của các món không giảm từ trái sang phải.':
    '5 stars if the highest value in your dishes never decreases from left to right.',
  'À La Carte đang dùng': 'À La Carte modules in use',
  'Allspice còn thừa': 'Leftover Allspice',
  'Ba tin đồn đã lật ·': 'Three revealed rumors ·',
  'Bạn chỉ sửa được hàng điểm gắn với tài khoản của mình.':
    'You can only edit the score row linked to your account.',
  'Bàn chơi': 'Game table',
  'Bạn có thể nhập': 'You can enter scores',
  'Bán cổ phiếu:': 'Stock sale:',
  'Bàn đã ngắt kết nối.': 'The table has disconnected.',
  'Bạn đang sửa hàng gắn với tài khoản của mình.':
    'You are editing the row linked to your account.',
  'Bạn là chủ bàn và có thể nhập điểm cho mọi người.':
    'You are the table host and can enter scores for everyone.',
  'Bản mở rộng': 'Expansion',
  'Bản mở rộng:': 'Expansion:',
  'Bảng điểm': 'Score sheet',
  'Bảng điểm chung': 'Shared score sheet',
  'Bảng điểm chung · Nhập chi tiết ·': 'Shared score sheet · Detailed entry ·',
  'Bảng điểm theo vòng': 'Score by round',
  'Bánh mì': 'Bread',
  'Bắt đầu chấm điểm': 'Start scoring',
  'Bắt đầu tính điểm': 'Start scoring',
  'Bắt đầu ván mới': 'Start a new game',
  'Bấm vào một ô để xoá.': 'Tap a cell to remove it.',
  'Bisque · mỗi tô = 3': 'Bisque · 3 per bowl',
  'Bỏ các thay đổi chưa đồng bộ': 'Discard unsynced changes',
  Cá: 'Fish',
  'Cả bàn': 'Everyone at the table',
  'Cả đội thắng': 'The whole team wins',
  'Cả đội thua': 'The whole team loses',
  'Cà rốt': 'Carrot',
  'Cách nhập món cuối': 'Entering the final dish',
  'Cần ít nhất': 'At least',
  'Cập nhật thiết lập': 'Update setup',
  'Chế độ 6–7 người': '6–7 player mode',
  'Chỉ Classic. Hai người: rút cổ phần thị trường theo luật rồi nhập kết quả; tiền thưởng thị trường trả về ngân hàng. Giá theo bảng của phiên bản đang chơi.':
    'Classic only. For two players, draw market shares according to the rules and enter the result; market bonuses go back to the bank. Use the price chart for the edition being played.',
  'Chỉ nhập khi ván đã kết thúc, để giữ kín danh tính trong lúc chơi. Bộ gốc 10 nhân vật. Chọn từng người đạt điều kiện thắng trên thẻ, kể cả Hunter/Shadow đã chết. Có thể có nhiều người cùng thắng; ứng dụng không tự suy luận người thắng theo phe.':
    'Enter this only after the game ends, so identities stay secret during play. The base game has 10 characters. Select each player who met the win condition on their card, including eliminated Hunters/Shadows. Multiple players can win; the app does not infer winners from their factions.',
  'Chỉ nhập phần thừa nếu một tin đồn hoặc hiệu ứng đang dùng chúng để chấm điểm.':
    'Enter leftovers only when a rumor or effect uses them for scoring.',
  'Chi tiết': 'Detailed',
  'Chọn đúng ba tin đồn trước khi lưu thiết lập.':
    'Select exactly three rumors before saving the setup.',
  'Chọn đúng một chủ nhà hàng hoặc «Không dùng chủ nhà hàng». Sao thưởng được cộng tự động.':
    'Select exactly one restaurateur or «No restaurateur». Bonus stars are added automatically.',
  'Chọn game cho bàn': 'Choose a game for the table',
  'Chọn ít nhất một người thắng.': 'Select at least one winner.',
  'Chọn kết quả Thắng/Thua để tính điểm.': 'Choose a Win/Loss result to score the game.',
  'Chọn người chơi': 'Choose a player',
  'Chọn nhân vật / phe': 'Choose a character / faction',
  'Chốt ván': 'Finalize game',
  'Chờ chủ bàn bắt đầu ván; bảng điểm sẽ xuất hiện ở đây cho mọi người.':
    'Wait for the table host to start the game; the score sheet will appear here for everyone.',
  'Chờ chủ bàn chọn game.': 'Waiting for the table host to choose a game.',
  'Chờ chủ bàn lưu thiết lập trước khi nhập món.':
    'Wait for the table host to save the setup before entering dishes.',
  'Chờ chủ bàn nhập kết quả.': 'Waiting for the table host to enter the result.',
  'Chủ bàn chọn giám khảo, ba tin đồn đã lật và các mô-đun À La Carte đang dùng.':
    'The table host selects the judge, three revealed rumors, and the À La Carte modules in use.',
  'Chủ bàn có thể sửa mọi hàng.': 'The table host can edit every row.',
  'Chủ bàn đã chọn cả đội thắng.': 'The table host selected a team win.',
  'Chủ bàn đã chọn cả đội thua.': 'The table host selected a team loss.',
  'Chủ bàn mới có thể kết thúc ván.': 'Only the table host can finish the game.',
  'Chủ bàn rút theo luật Renegade Classic và nhập số ô rút. Thị trường tham gia xét thưởng; tiền thưởng của thị trường trả về ngân hàng.':
    'The table host draws according to the Renegade Classic rules and enters the number of spaces drawn. The market is included in bonus calculations; its bonus is returned to the bank.',
  'Chủ bàn sẽ nhập tin đồn bổ sung đã lật trong thiết lập chung.':
    'The table host will enter the revealed extra rumor in the shared setup.',
  'Chuyển sang chế độ Chi tiết để ghi số phi vụ thành công/thất bại.':
    'Switch to Detailed mode to record successful and failed heists.',
  'Chưa chọn kết quả': 'No result selected',
  'chưa có ai': 'no one yet',
  'Chưa có kết quả': 'No result yet',
  'Chưa có mẫu chấm điểm': 'No scoring template available',
  'Chưa có phi vụ nào.': 'No heists yet.',
  'Chưa đủ món để tính chất lượng.': 'Not enough dishes to calculate quality.',
  'Chưa thể chốt ván. Hoàn tất các trường bắt buộc bên dưới.':
    'The game cannot be finalized yet. Complete the required fields below.',
  'Chưa xác minh đủ nội dung lá này để tính tự động.':
    'There is not enough verified card content to calculate this automatically.',
  'Có thay đổi chưa đồng bộ.': 'There are unsynced changes.',
  'Có thể đặt tối đa bốn nguyên liệu vào một món; các món khác vẫn chỉ có một.':
    'Up to four ingredients can go in one dish; all other dishes still allow only one.',
  'Có thể ghép thêm một token rượu với mỗi món; giá trị phải bằng nguyên liệu cao nhất món đó.':
    'You may pair one wine token with each dish; its value must match that dish’s highest ingredient value.',
  'Có thể phục vụ nhiều nguyên liệu ở món phô mai; thắng món phô mai được thêm sao.':
    'You may serve multiple ingredients in the cheese dish; winning the cheese dish earns an extra star.',
  'Có thể phục vụ tối đa hai nguyên liệu cho mỗi món.':
    'You may serve up to two ingredients in each dish.',
  'Có thể thêm token in số 2 vào món; mỗi món chỉ được thêm tối đa một token khác.':
    'You may add a token printed with 2 to a dish; each dish can have at most one additional token.',
  'Cổ phần thị trường · 2 người': 'Market shares · 2 players',
  'Giá cổ phiếu từng chuỗi': 'Stock price for each chain',
  'Cổ phần thị trường (chỉ 2 người)': 'Market shares (2-player game only)',
  'Cổ phiếu đang giữ': 'Shares held',
  'Công nghệ: bộ 3 loại': 'Technology: sets of 3 types',
  'Công nghệ: từng đôi': 'Technology: pairs',
  'Nhiệm vụ: số đã hoàn thành': 'Missions: completed',
  'Nhiệm vụ + thẻ cuối ván: từng đôi': 'Missions + end-game cards: pairs',
  'Thu nhập: bộ 3 loại thẻ': 'Income: sets of 3 card types',
  'Thu nhập: loại thẻ nhiều nhất': 'Income: most common card type',
  'Dấu vết: bộ 3 màu': 'Traces: sets of 3 colors',
  'Thắng khu vực ghép tàu': 'Wins in ship-linked sectors',
  'Dùng tổ chức + khởi đầu nhanh': 'Use organizations + quick start',
  'Cột mốc 1': 'Milestone 1',
  'Cột mốc 2': 'Milestone 2',
  'Cột mốc 3': 'Milestone 3',
  'Cột mốc 4': 'Milestone 4',
  'Cột mốc 5': 'Milestone 5',
  'Cột mốc 6': 'Milestone 6',
  'Công trình thường đã cấp điện': 'Powered standard buildings',
  'Công trình Chính phủ đã cấp điện': 'Powered Government buildings',
  'Vật liệu xây dựng còn trong kho': 'Building materials remaining in supply',
  'Vị trí trên Amstel': 'Position on the Amstel',
  'Chơi tộc Giả kim': 'Play the Alchemists faction',
  'Đối thủ trung lập (chỉ ván 2 người)': 'Neutral opponent (2-player game only)',
  'Máy móc và tín dụng trong kho': 'Machinery and credits in supply',
  'Dùng The Leeghwater Project': 'Use The Leeghwater Project',
  'Cách nhập kết quả': 'Result entry method',
  'VP trên track trước tính điểm cuối': 'VP on the track before end-game scoring',
  'Bài hàng hóa trên tay': 'Merchandise cards in hand',
  'Thợ còn ở trại': 'Workers remaining in camp',
  'Lính còn ở trại quân': 'Legionnaires remaining in the military camp',
  'Bộ ba công trình cùng biểu tượng': 'Sets of three buildings with the same symbol',
  'Bộ bốn công trình cùng biểu tượng': 'Sets of four buildings with the same symbol',
  'VP từ thẻ thưởng vàng/xám': 'VP from gold/gray bonus tiles',
  'Thứ hạng cuối tại Senate (1 cao nhất)': 'Final Senate position (1 is highest)',
  'Vật tư còn lại': 'Remaining supplies',
  'Tài nguyên trước quy đổi cuối': 'Resources before final conversion',
  'Cấp cuối của sáu nhánh nghiên cứu': 'Final level across the six research tracks',
  'Đã chốt': 'Finalized',
  'Đã cộng từ trợ giúp cổ đông:': 'Added by shareholder bonus helper:',
  'Đã đạt mốc': 'Target reached',
  'Đã đạt tối đa': 'Maximum reached',
  'Đã đồng bộ với bàn chơi': 'Synced with the table',
  'Đã đồng bộ với máy chủ.': 'Synced with the server.',
  'Đã gửi yêu cầu, chờ người mời hoặc admin CLB duyệt.':
    'Request sent. Waiting for the inviter or club admin to approve it.',
  'Đã kết thúc ván': 'Game finished',
  'Đã khôi phục bản nháp.': 'Draft restored.',
  'Đã lưu nháp.': 'Draft saved.',
  'Đang chơi': 'In progress',
  'Đang dẫn:': 'Leading:',
  'Đang kết nối với bàn...': 'Connecting to the table...',
  'Đang lưu...': 'Saving...',
  'Đang mở bàn...': 'Opening table...',
  'đang nhập': 'editing',
  'Đang tạo…': 'Creating…',
  'Đang xem — chỉ chủ bàn và người chơi được sửa':
    'View only — the table host and players can edit',
  'Đạt điều kiện thắng': 'Met the win condition',
  'Đăng nhập': 'Sign in',
  'Đăng nhập để mở bảng điểm chung': 'Sign in to open the shared score sheet',
  'Đăng nhập để tính điểm cho bàn này.': 'Sign in to score this table.',
  'Đây là tôi': 'This is me',
  điểm: 'points',
  'Điểm cao nhất thắng': 'Highest score wins',
  'Điểm của mọi người được đồng bộ qua máy chủ và gắn với tài khoản thật.':
    'Everyone’s scores sync through the server and are linked to real accounts.',
  'Điểm mỗi hàng được tính lại trên máy chủ sau khi đồng bộ.':
    'Each row’s score is recalculated on the server after syncing.',
  'Điểm thấp nhất thắng': 'Lowest score wins',
  'Điểm trên track (trước tính điểm cuối)': 'Track score (before end-game scoring)',
  Đóng: 'Close',
  'Đủ 7 món': 'All 7 dishes',
  'Game này chưa có mẫu tính điểm.': 'This game does not have a scoring template yet.',
  'Ghi chú luật': 'Rules notes',
  'Ghi chú luật (EN)': 'Rules notes (EN)',
  'Ghi chú luật (VI)': 'Rules notes (VI)',
  'Ghi kết quả cuối ván': 'Enter the final result',
  'Giá cổ phiếu hiện tại': 'Current stock price',
  'Gia vị bất kỳ có thể ghép như Allspice.': 'Any spice can be paired as Allspice.',
  'Gia vị nhân ba giá trị nguyên liệu thay vì nhân đôi.':
    'Spices triple the ingredient value instead of doubling it.',
  'Giám khảo': 'Judge',
  'Hàng 1': 'Row 1',
  'Hàng 2': 'Row 2',
  'Hàng 3': 'Row 3',
  'Hàng này chỉ chủ bàn hoặc người sở hữu danh tính mới sửa được.':
    'Only the table host or the identity owner can edit this row.',
  'Hàng trên cùng': 'Top row',
  'Hòa chưa được phân định theo luật.': 'The rules do not resolve this tie.',
  'Hoàn tất các trường món cuối còn thiếu trước khi chốt.':
    'Complete the missing final-dish fields before finalizing.',
  'Kết quả': 'Result',
  'Kết quả đã chốt': 'Result finalized',
  'Kết quả đã được máy chủ chốt': 'The server has finalized the result',
  'Kết quả phi vụ': 'Heist results',
  'Kết quả từ máy chủ': 'Result from server',
  'Kết quả ván': 'Game result',
  'Kết thúc ván': 'Finish game',
  Khách: 'Guest',
  'Khách còn trong quán cà phê': 'Guests remaining in the café',
  'Khách ở bàn': 'Guests at the table',
  'Không ai': 'Nobody',
  'Không áp dụng': 'Not applicable',
  'Không có thành viên phù hợp.': 'No matching members.',
  'Không dùng chủ nhà hàng': 'No restaurateur',
  'Không đạt điều kiện thắng': 'Did not meet the win condition',
  'Không đồng bộ được điểm.': 'Could not sync scores.',
  'Không đồng bộ được kết quả.': 'Could not sync the result.',
  'Không khôi phục được thay đổi đang chờ.': 'Could not restore the pending changes.',
  'Không lưu được bản nháp.': 'Could not save the draft.',
  'Không lưu được thay đổi đang chờ.': 'Could not save the pending changes.',
  'Không lưu được thiết lập chung.': 'Could not save the shared setup.',
  'Không mở được luồng cập nhật.': 'Could not open the update stream.',
  'Không tải được bàn.': 'Could not load the table.',
  'Không tạo được ván': 'Could not create the game',
  'Không thể cập nhật bàn.': 'Could not update the table.',
  'Không thể kiểm tra trạng thái bàn.': 'Could not check the table status.',
  'Không thể lưu ván. Kiểm tra kết nối rồi thử lại.':
    'Could not save the game. Check your connection and try again.',
  'Không thêm được người chơi': 'Could not add the player',
  'Không thực hiện được': 'Could not complete the action',
  'Không tìm thấy bàn.': 'Table not found.',
  'Không tìm thấy người chơi cho thay đổi đang chờ.':
    'Could not find a player for the pending change.',
  'Không tính VP. Cả đội thắng khi đủ 3 phi vụ thành công; thua khi đủ 3 thất bại.':
    'VP are not scored. The team wins after 3 successful heists and loses after 3 failures.',
  'Không xóa được thay đổi đã bỏ khỏi thiết bị.':
    'Could not remove the discarded change from this device.',
  'Krone còn lại': 'Krone remaining',
  'Làm lại từ đầu': 'Start over',
  'Luồng cập nhật không khả dụng.': 'The update stream is unavailable.',
  'Lưu nháp': 'Save draft',
  'Lưu thiết lập chung': 'Save shared setup',
  'Lưu xong thiết lập chung trước khi chốt ván.':
    'Save the shared setup before finalizing the game.',
  'Máy chủ chưa gắn mẫu điểm có thể dùng cho': 'The server has no scoring template available for',
  'Máy chủ từ chối các chỉnh sửa đang chờ.': 'The server rejected the pending edits.',
  'Mất kết nối với bàn.': 'Connection to the table was lost.',
  'Mẫu chấm điểm cần xem lại': 'Scoring template needs review',
  'Mẫu chưa duyệt': 'Unreviewed template',
  'Món ăn/đồ uống trong bếp': 'Food/drinks in the kitchen',
  'Món thử thách đã ghi từ ngày 1 và 2': 'Challenge dish recorded from days 1 and 2',
  'Món tốt nhất': 'Best dish',
  'Mỗi giá trị nguyên liệu khác nhau cho 1 sao; người phục vụ nhiều token nhất được thêm 1 sao.':
    'Earn 1 star for each distinct ingredient value; the player who served the most tokens earns 1 extra star.',
  'Mỗi hai token nguyên liệu hoặc gia vị còn thừa được 1 sao; người nhiều token thừa nhất được thêm 1 sao.':
    'Earn 1 star for every two leftover ingredient or spice tokens; the player with the most leftover tokens earns 1 extra star.',
  'Mỗi món có đúng một nguyên liệu không gia vị được 1 sao; nhiều nhất được thêm 1 sao.':
    'Earn 1 star for each dish with exactly one non-spice ingredient; the most such dishes earn 1 extra star.',
  'Mỗi nguyên liệu có giá trị từ 6 trở lên tự cộng sao thưởng.':
    'Each ingredient valued 6 or higher automatically adds a bonus star.',
  'Mỗi nhân vật chỉ được chọn cho một người.': 'Each character can be assigned to only one player.',
  'Mỗi token rượu không dùng trong món cuối được 1 sao.':
    'Earn 1 star for each wine token not used in the final dish.',
  'Một số thay đổi chưa được máy chủ áp dụng. Các chỉnh sửa vẫn được giữ trên thiết bị.':
    'The server did not apply some changes. Your edits are still saved on this device.',
  'Mở công cụ bên ngoài để tham khảo.': 'Open the external tool for reference.',
  'Mở Vantage Rulepop ↗': 'Open Vantage Rulepop ↗',
  'Mục bổ sung': 'Additional items',
  'Năm sinh (không bắt buộc)': 'Birth year (optional)',
  'Năm sinh không hợp lệ.': 'Invalid birth year.',
  Nấm: 'Mushroom',
  'Nấm có thể dùng thay nguyên liệu ở các món; nấm được ghép với gia vị bất kỳ.':
    'Mushrooms can replace ingredients in dishes and pair with any spice.',
  'Nếu phục vụ đủ bảy món, nhận số sao bằng giá trị nguyên liệu thấp nhất.':
    'If you serve all seven dishes, earn stars equal to your lowest ingredient value.',
  'Ngân hàng · chủ bàn nhập': 'Bank · entered by table host',
  'Ngoài CLB': 'Outside the club',
  'Nguyên liệu cà rốt được tính gấp đôi.': 'Carrots count double.',
  'Nguyên liệu và gia vị còn thừa': 'Leftover ingredients and spices',
  người: 'players',
  'Người chơi': 'Player',
  'Người chơi (': 'Player (',
  'người chơi.': 'players.',
  'người đã xếp bàn': 'people have joined the table',
  'Nhanh (chỉ tổng)': 'Quick (total only)',
  'Nhân đôi chất lượng món có nguyên liệu này; sao cuối được tính tự động.':
    'Double the quality of the dish containing this ingredient; final stars are calculated automatically.',
  'Nhập chi tiết': 'Detailed entry',
  'Nhập điểm để máy chủ tính tổng và thứ hạng.':
    'Enter scores for the server to calculate totals and rankings.',
  'Nhập giá cổ phiếu và số cổ phiếu mỗi người nắm; app tự tính tiền bán cổ phiếu và thưởng cổ đông lớn/nhỏ (hòa chia đều, làm tròn lên $100) rồi cộng vào tổng.':
    'Enter each player’s stock price and share holdings. The app calculates stock-sale proceeds and majority/minority shareholder bonuses (ties split evenly, rounded up to $100) and adds them to the total.',
  'Nhập nguyên liệu theo thẻ giám khảo; hệ thống sẽ kiểm tra giới hạn món trước khi chốt.':
    'Enter ingredients according to the judge card; the system checks dish limits before finalizing.',
  'Nhập nguyên liệu thực sự đã đặt lên món; dùng loại in trên token nếu hiệu ứng cho phép đổi món.':
    'Enter the ingredients actually placed in each dish; use the type printed on the token if an effect allows it to be changed.',
  'Nhập sao đã tích lũy trước bữa ăn giám khảo. Không cộng sao thưởng của giám khảo, tin đồn hoặc chủ nhà hàng ở đây; hệ thống tự tính các sao đó.':
    'Enter stars earned before the judge’s meal. Do not include judge, rumor, or restaurateur bonus stars here; the system calculates those automatically.',
  'Nhập số sao hiện có; nếu chưa có sao, tăng lên 0 để xác nhận.':
    'Enter your current stars; if you have none, increase the value to 0 to confirm.',
  'Nhập tiền mặt, giá cổ phiếu và số cổ phiếu. Tiền bán và thưởng cổ đông tự tính cho cả bàn.':
    'Enter cash, stock prices, and share holdings. Stock-sale proceeds and shareholder bonuses are calculated for the whole table.',
  'Nhập VP đã tính theo thẻ/luật, không nhập số lượng.':
    'Enter the VP already calculated from cards/rules, not quantities.',
  'Ở mỗi món, chọn loại token và giá trị in trên token (2–7), rồi thêm đúng số token đã phục vụ. Sau đó nhập gia vị ghép với từng token; Allspice là lựa chọn riêng. Súp và bisque nhập bằng số tô.':
    'For each dish, choose a token type and its printed value (2–7), then add exactly the number of tokens served. Next, enter the spice paired with each token; Allspice is a separate option. Enter soup and bisque by bowl count.',
  'Phân tích Critter Kitchen': 'Critter Kitchen analysis',
  'Phòng có khách (chạm để đánh dấu)': 'Rooms with guests (tap to mark)',
  'Phô mai': 'Cheese',
  'Quay lại danh sách': 'Back to list',
  'Quay lại sửa': 'Back to editing',
  'Quyền sửa hàng điểm đã thay đổi. Các chỉnh sửa chưa đồng bộ vẫn được giữ trên thiết bị.':
    'Your permission to edit score rows changed. Unsynced edits are still saved on this device.',
  Rượu: 'Wine',
  'Rượu ghép · Fruit Bat': 'Paired wine · Fruit Bat',
  'Sao đã có trước món cuối': 'Stars earned before the final dish',
  'Sao hàng cuối': 'Last-row stars',
  'Sao món thử thách': 'Challenge-dish stars',
  'Sao thưởng': 'Bonus stars',
  'sao tự động.': 'stars are added automatically.',
  'Sao vượt mốc 70': 'Stars above 70',
  'Shadow Hunters cần từ 4 đến 8 người.': 'Shadow Hunters requires 4 to 8 players.',
  'Số sao bằng chênh lệch giữa giá trị nguyên liệu cao nhất và thấp nhất.':
    'Stars equal the difference between the highest and lowest ingredient values.',
  'Số sao bằng giá trị cà rốt cao nhất trừ 2 (tối thiểu 0).':
    'Stars equal the highest carrot value minus 2 (minimum 0).',
  'Số vòng thắng': 'Rounds won',
  'Súp · mỗi tô = 1': 'Soup · 1 per bowl',
  'Súp và bisque': 'Soup and bisque',
  'Tải lại': 'Reload',
  'Tài nguyên còn lại': 'Resources remaining',
  'Tạo link nhận': 'Create claim link',
  'Tên hiển thị': 'Display name',
  'Tên người chơi': 'Player name',
  Thắng: 'Win',
  'Thắng theo mục tiêu nhân vật': 'Win by character objective',
  'Thẻ nhân viên': 'Staff cards',
  'Thẻ và hiệu ứng cá nhân': 'Cards and personal effects',
  Thêm: 'Add',
  'Thêm 1 nguyên liệu': 'Add 1 ingredient',
  'Thêm 1 nguyên liệu thừa': 'Add 1 leftover ingredient',
  'Thêm giá trị': 'Add a value',
  'Thêm gia vị thừa': 'Add leftover spice',
  'Thêm khách': 'Add guest',
  'Thêm nguyên liệu đã phục vụ': 'Add ingredients served',
  'Thêm nguyên liệu thừa': 'Add leftover ingredient',
  'Thêm người chơi': 'Add player',
  'Thêm người chơi để bắt đầu tính điểm.': 'Add players to start scoring.',
  'Thêm người chơi để xem kết quả.': 'Add players to see the result.',
  'Thêm vòng': 'Add round',
  'Thiết lập chung cho Critter Kitchen': 'Shared setup for Critter Kitchen',
  'Thiết lập đang ở thiết bị này, chưa lưu lên bàn.':
    'The setup is saved on this device and has not been saved to the table.',
  'Thiếu mã bàn.': 'Table ID is missing.',
  Thịt: 'Meat',
  'Thử đồng bộ lại': 'Try syncing again',
  'Thử lại': 'Try again',
  'Tiền mặt cuối ván': 'Cash at end of game',
  'Tiền và cổ phiếu': 'Cash and shares',
  'Tìm game': 'Search games',
  'Tìm thành viên CLB': 'Search club members',
  'Tin đồn': 'Rumor',
  'Tin đồn bổ sung do Jamie Owliver mở ra': 'Extra rumor revealed by Jamie Owliver',
  'Tin đồn:': 'Rumor:',
  'Token in số 6 được tính như số 9.': 'A token printed with 6 counts as 9.',
  'Token rượu có thể dùng như Allspice để ghép với nguyên liệu khác.':
    'Wine tokens can be used as Allspice to pair with other ingredients.',
  'Token tin đồn': 'Rumor token',
  Tổng: 'Total',
  'Tổng các vòng': 'Round total',
  'Tổng điểm mỗi người': 'Total points per player',
  'Tra luật, ký hiệu và storybook trên trang chính thức. Mở website bên ngoài; không gửi dữ liệu bàn chơi.':
    'Check the rules, symbols, and storybook on the official site. This opens an external website and does not send table data.',
  'Trợ giúp tính thưởng cổ đông': 'Shareholder bonus calculator',
  'Tự tính': 'Calculated automatically',
  'Tự tính từ các mục đã nhập.': 'Calculated from the entries above.',
  'Tự tính từ kết quả phi vụ': 'Calculated from heist results',
  'Ván đã được chốt trước khi các thay đổi trên thiết bị này được đồng bộ.':
    'The game was finalized before the changes on this device could sync.',
  'Ván đã kết thúc': 'Game is over',
  'Về danh sách bàn': 'Back to tables',
  'Về kèo': 'Back to meetup',
  'Vị trí ưu tiên (1 = đi trước)': 'Priority position (1 = first)',
  'Vị trí ưu tiên phải khác nhau giữa mọi người: 1 đi trước, tiếp theo là 2, v.v.':
    'Everyone must have a different priority position: 1 goes first, then 2, and so on.',
  Vòng: 'Round',
  'Vòng tốt nhất': 'Best round',
  'VP mỗi cái =': 'VP per item =',
  'VP từ nhân viên cuối game': 'End-game VP from staff',
  'Xác nhận giá trị đang hiện': 'Confirm the displayed value',
  'Xác nhận kết thúc': 'Confirm finish',
  'Xác nhận kết thúc ván': 'Confirm game finish',
  Xóa: 'Remove',
  'Xóa vòng cuối': 'Remove last round',
};

const englishSourceCopy: ScoreTranslationMap = {
  '0': { vi: '0', en: '0' },
  '1': { vi: '1', en: '1' },
  '2': { vi: '2', en: '2' },
  '3': { vi: '3', en: '3' },
  '4': { vi: '4', en: '4' },
  '5': { vi: '5', en: '5' },
  'The Leeghwater Project': { vi: 'Dự án Leeghwater', en: 'The Leeghwater Project' },
  Entropy: { vi: 'Entropy', en: 'Entropy' },
  Mass: { vi: 'Khối lượng', en: 'Mass' },
  Energy: { vi: 'Năng lượng', en: 'Energy' },
  'Misfortune × −2': { vi: 'Ô Misfortune × −2', en: 'Misfortune × −2' },
  Terraforming: { vi: 'Cải tạo địa hình', en: 'Terraforming' },
  Navigation: { vi: 'Điều hướng', en: 'Navigation' },
  'Artificial Intelligence': { vi: 'Trí tuệ nhân tạo', en: 'Artificial Intelligence' },
  'Gaia Project': { vi: 'Gaia Project', en: 'Gaia Project' },
  Economy: { vi: 'Kinh tế', en: 'Economy' },
  Science: { vi: 'Khoa học', en: 'Science' },
  Credits: { vi: 'Tín dụng', en: 'Credits' },
  Knowledge: { vi: 'Tri thức', en: 'Knowledge' },
  Ore: { vi: 'Quặng', en: 'Ore' },
  'Western US': { vi: 'Western US', en: 'Western US' },
  'If tied for most money, victory is shared.': {
    vi: 'Nếu bằng tiền nhiều nhất, những người chơi đó cùng thắng.',
    en: 'If tied for most money, victory is shared.',
  },
  'Most leftover krones and dishes/drinks in the kitchen, combined (final scoring step 3).': {
    vi: 'Tổng số krones và đĩa/đồ uống còn lại trong bếp cao nhất (bước tính điểm cuối ván 3).',
    en: 'Most leftover krones and dishes/drinks in the kitchen, combined (final scoring step 3).',
  },
  'Rulebook text read does not define a tie at 200+; play another round if tied for most points (common ruling, unverified).':
    {
      vi: 'Phần luật đã đọc chưa quy định cách xử lý hòa ở mốc 200+; nếu hòa điểm cao nhất thì chơi thêm một vòng (cách xử lý thường gặp, chưa xác minh).',
      en: 'Rulebook text read does not define a tie at 200+; play another round if tied for most points (common ruling, unverified).',
    },
  'Share the victory on a tie (per secondary rules summary).': {
    vi: 'Khi hòa thì cùng thắng (theo phần tóm tắt luật thứ cấp).',
    en: 'Share the victory on a tie (per secondary rules summary).',
  },
  'No tiebreaker: players with equal points share the tie.': {
    vi: 'Không có cách phân định hòa: người chơi bằng điểm cùng xếp đồng hạng.',
    en: 'No tiebreaker: players with equal points share the tie.',
  },
  'No tiebreaker: tied players share the victory.': {
    vi: 'Không có cách phân định hòa: những người chơi hòa điểm cùng thắng.',
    en: 'No tiebreaker: tied players share the victory.',
  },
  'Most building resources remaining in supply; if still tied, share rank.': {
    vi: 'Còn nhiều tài nguyên xây dựng trong kho nhất; nếu vẫn hòa thì cùng hạng.',
    en: 'Most building resources remaining in supply; if still tied, share rank.',
  },
  'Tied player further ahead on the Amstel wins.': {
    vi: 'Người chơi đang dẫn xa hơn trên Amstel thắng.',
    en: 'Tied player further ahead on the Amstel wins.',
  },
  'No tiebreaker: victory is shared.': {
    vi: 'Không có cách phân định hòa: những người chơi hòa điểm cùng thắng.',
    en: 'No tiebreaker: victory is shared.',
  },
  'Most spice': { vi: 'Nhiều spice nhất', en: 'Most spice' },
  'Most Solari': { vi: 'Nhiều Solari nhất', en: 'Most Solari' },
  'Most water': { vi: 'Nhiều nước nhất', en: 'Most water' },
  'Most garrisoned troops': { vi: 'Nhiều quân đồn trú nhất', en: 'Most garrisoned troops' },
  'No tiebreaker: players tied on VP all win.': {
    vi: 'Không có cách phân định hòa: tất cả người chơi hòa VP đều thắng.',
    en: 'No tiebreaker: players tied on VP all win.',
  },
  'No tiebreaker: tied players share the win.': {
    vi: 'Không có cách phân định hòa: những người chơi hòa điểm cùng thắng.',
    en: 'No tiebreaker: tied players share the win.',
  },
  'Most Energy Units produced in the last round': {
    vi: 'Tạo ra nhiều Đơn vị Năng lượng nhất trong vòng cuối',
    en: 'Most Energy Units produced in the last round',
  },
  'Higher position in the final Senate ordering wins (1 = highest).': {
    vi: 'Người có vị trí cao hơn trong thứ tự Thượng viện cuối cùng thắng (1 là cao nhất).',
    en: 'Higher position in the final Senate ordering wins (1 = highest).',
  },
  'Most Progress Cubes on the Progress Track': {
    vi: 'Nhiều Khối Tiến triển nhất trên Đường Tiến triển',
    en: 'Most Progress Cubes on the Progress Track',
  },
  'Most Reputation': { vi: 'Nhiều Danh tiếng nhất', en: 'Most Reputation' },
  'Most VP from Cockpits': { vi: 'Nhiều VP từ Cockpit nhất', en: 'Most VP from Cockpits' },
  'Later in turn order wins after all previous tiebreakers.': {
    vi: 'Sau khi xét mọi cách phân định hòa trước đó, người đi sau hơn trong thứ tự lượt thắng.',
    en: 'Later in turn order wins after all previous tiebreakers.',
  },
  'Most leftover money wins': { vi: 'Còn nhiều tiền nhất thắng', en: 'Most leftover money wins' },
  "Tied player who controls the Kingdom's Favour": {
    vi: 'Trong số người hòa, người kiểm soát Ân huệ của Vương quốc thắng.',
    en: "Tied player who controls the Kingdom's Favour",
  },
  'Otherwise the tied player highest on the Order Track': {
    vi: 'Nếu vẫn hòa, người chơi ở vị trí cao nhất trên Đường Thứ tự thắng.',
    en: 'Otherwise the tied player highest on the Order Track',
  },
  'Player furthest ahead in the final-round turn order wins.': {
    vi: 'Người chơi ở vị trí xa nhất về sau trong thứ tự lượt của vòng cuối thắng.',
    en: 'Player furthest ahead in the final-round turn order wins.',
  },
  'Most fortress gate health': {
    vi: 'Cổng pháo đài còn nhiều máu nhất',
    en: 'Most fortress gate health',
  },
  'Most remaining Source': { vi: 'Còn nhiều Source nhất', en: 'Most remaining Source' },
  'Most spires in play': { vi: 'Có nhiều ngọn tháp đang chơi nhất', en: 'Most spires in play' },
  'Tie rule not verified; victory treated as shared.': {
    vi: 'Chưa xác minh luật hòa; xử lý như cùng thắng.',
    en: 'Tie rule not verified; victory treated as shared.',
  },
  'Current holder, then next recipient of Praefectus Magnus': {
    vi: 'Người đang giữ Praefectus Magnus, sau đó đến người tiếp theo nhận thẻ này.',
    en: 'Current holder, then next recipient of Praefectus Magnus',
  },
  'Highest income level': { vi: 'Bậc thu nhập cao nhất', en: 'Highest income level' },
  'Most money remaining': { vi: 'Còn nhiều tiền nhất', en: 'Most money remaining' },
  'If still tied, those players draw.': {
    vi: 'Nếu vẫn hòa, những người chơi đó hòa nhau.',
    en: 'If still tied, those players draw.',
  },
  'Most alive monster parts': {
    vi: 'Có nhiều bộ phận quái vật còn sống nhất',
    en: 'Most alive monster parts',
  },
  'Most francs': { vi: 'Còn nhiều franc nhất', en: 'Most francs' },
  'Turn order relative to first player': {
    vi: 'Thứ tự lượt so với người chơi đầu tiên',
    en: 'Turn order relative to first player',
  },
  'Most leftover gold pieces after converting gold to VP': {
    vi: 'Còn nhiều đồng vàng nhất sau khi đổi vàng thành VP',
    en: 'Most leftover gold pieces after converting gold to VP',
  },
  'If still tied, players remain tied.': {
    vi: 'Nếu vẫn hòa, người chơi tiếp tục đồng hạng.',
    en: 'If still tied, players remain tied.',
  },
  'Most camels': { vi: 'Có nhiều lạc đà nhất', en: 'Most camels' },
  'If still tied, the player with the largest camel wins; if indistinguishable, players share victory.':
    {
      vi: 'Nếu vẫn hòa, người có lạc đà lớn nhất thắng; nếu không phân biệt được, những người chơi đó cùng thắng.',
      en: 'If still tied, the player with the largest camel wins; if indistinguishable, players share victory.',
    },
  'Fewest empty estate spaces': {
    vi: 'Có ít ô điền trang trống nhất',
    en: 'Fewest empty estate spaces',
  },
  'Still tied: the player who went later in turn order wins': {
    vi: 'Nếu vẫn hòa: người đi sau hơn trong thứ tự lượt thắng.',
    en: 'Still tied: the player who went later in turn order wins',
  },
  'Acquire · Renegade Classic': {
    vi: 'Acquire · Renegade Classic',
    en: 'Acquire · Renegade Classic',
  },
  Allspice: { vi: 'Allspice', en: 'Allspice' },
  'Agricola Revised 2016': { vi: 'Agricola Revised 2016', en: 'Agricola Revised 2016' },
  'Agricola 15 (2022)': { vi: 'Agricola 15 (2022)', en: 'Agricola 15 (2022)' },
  'Queen Games — bản cơ bản': { vi: 'Queen Games — bản cơ bản', en: 'Queen Games — base game' },
  'Terra Mystica — cơ bản, luậtENv 3': {
    vi: 'Terra Mystica — cơ bản, luậtENv 3',
    en: 'Terra Mystica — base game, English rules v3',
  },
  'Age of Innovation 2023 — cơ bản': {
    vi: 'Age of Innovation 2023 — cơ bản',
    en: 'Age of Innovation 2023 — base game',
  },
  'Second Edition 2021 — không phải 2016': {
    vi: 'Second Edition 2021 — không phải 2016',
    en: 'Second Edition 2021 — not the 2016 edition',
  },
  'Uprising 2023 — ván 3–4 người': {
    vi: 'Uprising 2023 — ván 3–4 người',
    en: 'Uprising 2023 — 3–4 player game',
  },
  'SETI 2024 + tùy chọn tổ chứcSpace Agencies 2025': {
    vi: 'SETI 2024 + tùy chọn tổ chứcSpace Agencies 2025',
    en: 'SETI 2024 + optional Space Agencies 2025',
  },
  'Nucleum 2023 — cơ bản': { vi: 'Nucleum 2023 — cơ bản', en: 'Nucleum 2023 — base game' },
  '2-4 players': { vi: '2–4 người chơi', en: '2–4 players' },
  'Individual play (team variant in notes)': {
    vi: 'Chơi cá nhân (biến thể đội trong ghi chú)',
    en: 'Individual play (team variant in notes)',
  },
  base: { vi: 'Bản cơ bản', en: 'Base game' },
  'base (expansion The Lost Fleet not modelled)': {
    vi: 'Bản cơ bản (chưa mô hình hóa bản mở rộng The Lost Fleet)',
    en: 'Base game (The Lost Fleet expansion is not modelled)',
  },
  'Co-op': { vi: 'Hợp tác', en: 'Co-op' },
  'Critter Kitchen': { vi: 'Critter Kitchen', en: 'Critter Kitchen' },
  'Fruit Bat': { vi: 'Fruit Bat', en: 'Fruit Bat' },
  'Track:': { vi: 'Đường điểm:', en: 'Track:' },
  Gelato: { vi: 'Gelato', en: 'Gelato' },
  'The Gang · base': { vi: 'The Gang · bản cơ bản', en: 'The Gang · base game' },
  Thua: { vi: 'Thua', en: 'Lose' },
  'Nhanh (chỉ tổng)': { vi: 'Nhanh (chỉ tổng)', en: 'Quick (total only)' },
  Tower: { vi: 'Tower', en: 'Tower' },
  Luxor: { vi: 'Luxor', en: 'Luxor' },
  American: { vi: 'American', en: 'American' },
  Festival: { vi: 'Festival', en: 'Festival' },
  Worldwide: { vi: 'Worldwide', en: 'Worldwide' },
  Imperial: { vi: 'Imperial', en: 'Imperial' },
  Continental: { vi: 'Continental', en: 'Continental' },
  '(Your cubes in section 3 incl. overflow + 1 if most Reputation) x revealed Wings.': {
    vi: 'Số khối ở khu vực 3 (kể cả phần vượt) + 1 nếu có Uy tín cao nhất, nhân với số biểu tượng Wings đã mở.',
    en: '(Your cubes in section 3 incl. overflow + 1 if most Reputation) x revealed Wings.',
  },
  '+15 if you flipped 7 different Number cards.': {
    vi: '+15 nếu bạn lật 7 thẻ Number khác nhau.',
    en: '+15 if you flipped 7 different Number cards.',
  },
  '+5 if game ended by the Captain and you have the highest positive humanity; tied players each get 5.':
    {
      vi: '+5 nếu Captain kết thúc ván và bạn có Humanity dương cao nhất; người hòa nhau đều nhận 5.',
      en: '+5 if game ended by the Captain and you have the highest positive humanity; tied players each get 5.',
    },
  '+7 VP for the player who triggered game end.': {
    vi: '+7 VP cho người kích hoạt kết thúc ván.',
    en: '+7 VP for the player who triggered game end.',
  },
  '-1 VP per card. Enter 0 if you ended the round because everyone else scouted instead of beating your set':
    {
      vi: '-1 VP mỗi lá. Nhập 0 nếu bạn kết thúc vòng vì mọi người khác đi thám hiểm thay vì đánh bộ bài của bạn.',
      en: '-1 VP per card. Enter 0 if you ended the round because everyone else scouted instead of beating your set',
    },
  '-1 per unused space (spaces inside pastures and stables count as used)': {
    vi: '-1 mỗi ô chưa dùng (ô trong đồng cỏ và chuồng được tính là đã dùng).',
    en: '-1 per unused space (spaces inside pastures and stables count as used)',
  },
  '-2 Wealth per Misfortune tile.': {
    vi: '-2 Wealth mỗi ô Misfortune.',
    en: '-2 Wealth per Misfortune tile.',
  },
  '-3 VP per share on the Issued Share Track (max 15).': {
    vi: '-3 VP mỗi cổ phần trên Issued Share Track (tối đa 15).',
    en: '-3 VP per share on the Issued Share Track (max 15).',
  },
  '-3 points per begging marker': {
    vi: '-3 điểm mỗi dấu ăn xin.',
    en: '-3 points per begging marker',
  },
  '-5 VP each.': { vi: '-5 VP mỗi cái.', en: '-5 VP each.' },
  '0 = -1; 1 = 1; 2 = 2; 3 = 3; 4+ = 4': {
    vi: '0 = -1; 1 = 1; 2 = 2; 3 = 3; 4+ = 4',
    en: '0 = -1; 1 = 1; 2 = 2; 3 = 3; 4+ = 4',
  },
  '0 = -1; 1 = 1; 2 = 2; 3 = 3; 4+ = 4 Include supply and planted crops on fields/eligible cards; exclude goods not yet earned or bought.':
    {
      vi: '0 = -1; 1 = 1; 2 = 2; 3 = 3; 4+ = 4. Tính nông sản trong kho và đã gieo trên đồng/ thẻ hợp lệ; không tính hàng hóa chưa nhận được hoặc chưa mua.',
      en: '0 = -1; 1 = 1; 2 = 2; 3 = 3; 4+ = 4 Include supply and planted crops on fields/eligible cards; exclude goods not yet earned or bought.',
    },
  '0 = -1; 1 = 1; 2-3 = 2; 4-5 = 3; 6+ = 4': {
    vi: '0 = -1; 1 = 1; 2–3 = 2; 4–5 = 3; 6+ = 4',
    en: '0 = -1; 1 = 1; 2-3 = 2; 4-5 = 3; 6+ = 4',
  },
  '0 = -1; 1-2 = 1; 3-4 = 2; 5-6 = 3; 7+ = 4': {
    vi: '0 = -1; 1–2 = 1; 3–4 = 2; 5–6 = 3; 7+ = 4',
    en: '0 = -1; 1-2 = 1; 3-4 = 2; 5-6 = 3; 7+ = 4',
  },
  '0 = -1; 1-3 = 1; 4-5 = 2; 6-7 = 3; 8+ = 4': {
    vi: '0 = -1; 1–3 = 1; 4–5 = 2; 6–7 = 3; 8+ = 4',
    en: '0 = -1; 1-3 = 1; 4-5 = 2; 6-7 = 3; 8+ = 4',
  },
  '0 = -1; 1-3 = 1; 4-5 = 2; 6-7 = 3; 8+ = 4 Include supply and planted crops on fields/eligible cards; exclude goods not yet earned or bought.':
    {
      vi: '0 = -1; 1–3 = 1; 4–5 = 2; 6–7 = 3; 8+ = 4. Tính nông sản trong kho và đã gieo trên đồng/ thẻ hợp lệ; không tính hàng hóa chưa nhận được hoặc chưa mua.',
      en: '0 = -1; 1-3 = 1; 4-5 = 2; 6-7 = 3; 8+ = 4 Include supply and planted crops on fields/eligible cards; exclude goods not yet earned or bought.',
    },
  '0 = not in last 3 spaces, 1 = third-to-last (3 VP), 2 = second-to-last (6 VP), 3 = last space (10 VP).':
    {
      vi: '0 = không ở 3 ô cuối; 1 = áp chót (3 VP); 2 = trước ô cuối (6 VP); 3 = ô cuối (10 VP).',
      en: '0 = not in last 3 spaces, 1 = third-to-last (3 VP), 2 = second-to-last (6 VP), 3 = last space (10 VP).',
    },
  '0-3 VP per built project depending on its city.': {
    vi: '0–3 VP mỗi dự án đã xây, tùy thành phố.',
    en: '0-3 VP per built project depending on its city.',
  },
  '1 = first on Order Track; lower number wins the tiebreak.': {
    vi: '1 = đứng đầu Order Track; số thấp hơn thắng khi hòa.',
    en: '1 = first on Order Track; lower number wins the tiebreak.',
  },
  '1 VP each': { vi: '1 VP mỗi cái.', en: '1 VP each' },
  '1 VP each.': { vi: '1 VP mỗi cái.', en: '1 VP each.' },
  '1 VP for every 4 remaining Life cards, Entropy, Mass and Energy combined.': {
    vi: '1 VP mỗi 4 lá Life, Entropy, Mass và Energy còn lại cộng chung.',
    en: '1 VP for every 4 remaining Life cards, Entropy, Mass and Energy combined.',
  },
  '1 VP per 10 Gold in personal reserve.': {
    vi: '1 VP mỗi 10 Gold trong kho cá nhân.',
    en: '1 VP per 10 Gold in personal reserve.',
  },
  '1 VP per 10 coins.': { vi: '1 VP mỗi 10 xu.', en: '1 VP per 10 coins.' },
  '1 VP per 2 Uranium (after optional conversions).': {
    vi: '1 VP mỗi 2 Uranium (sau khi đổi tài nguyên tùy chọn).',
    en: '1 VP per 2 Uranium (after optional conversions).',
  },
  '1 VP per 2 Workers in personal supply.': {
    vi: '1 VP mỗi 2 Worker trong kho cá nhân.',
    en: '1 VP per 2 Workers in personal supply.',
  },
  '1 VP per 2 goods, only if you have a Beijing trading post. Camels are not goods.': {
    vi: '1 VP mỗi 2 hàng hóa, chỉ khi bạn có trạm giao thương ở Beijing. Lạc đà không phải hàng hóa.',
    en: '1 VP per 2 goods, only if you have a Beijing trading post. Camels are not goods.',
  },
  '1 VP per 2 workers': { vi: '1 VP mỗi 2 công nhân.', en: '1 VP per 2 workers' },
  '1 VP per 3 gold; each unused favor card counts as 2 gold. Hand ingredients are worth nothing.': {
    vi: '1 VP mỗi 3 gold; mỗi thẻ favor chưa dùng tính là 2 gold. Nguyên liệu trên tay không có giá trị.',
    en: '1 VP per 3 gold; each unused favor card counts as 2 gold. Hand ingredients are worth nothing.',
  },
  '1 VP per 3 resources in any combination.': {
    vi: '1 VP mỗi 3 tài nguyên bất kỳ kết hợp.',
    en: '1 VP per 3 resources in any combination.',
  },
  '1 VP per 5 Thaler in player area.': {
    vi: '1 VP mỗi 5 Thaler trong khu vực người chơi.',
    en: '1 VP per 5 Thaler in player area.',
  },
  '1 VP per 5 dollars.': { vi: '1 VP mỗi 5 đô la.', en: '1 VP per 5 dollars.' },
  '1 VP per Fish still on your Settlement tiles.': {
    vi: '1 VP mỗi Fish còn trên các ô Settlement của bạn.',
    en: '1 VP per Fish still on your Settlement tiles.',
  },
  '1 VP per Mana Gem in personal reserve.': {
    vi: '1 VP mỗi Mana Gem trong kho cá nhân.',
    en: '1 VP per Mana Gem in personal reserve.',
  },
  '1 VP per Scout token earned when others scouted from your set (3-5 players)': {
    vi: '1 VP mỗi Scout token nhận được khi người khác đi thám hiểm từ bộ bài của bạn (3–5 người chơi).',
    en: '1 VP per Scout token earned when others scouted from your set (3-5 players)',
  },
  '1 VP per active employee (not on Missions, not the permanent HR employee).': {
    vi: '1 VP mỗi nhân viên đang hoạt động (không làm nhiệm vụ và không phải nhân viên HR cố định).',
    en: '1 VP per active employee (not on Missions, not the permanent HR employee).',
  },
  '1 VP per card you took with a Show (the cards you beat)': {
    vi: '1 VP mỗi lá bạn lấy bằng hành động Show (các lá bạn đã đánh bại).',
    en: '1 VP per card you took with a Show (the cards you beat)',
  },
  '1 VP per drop.': { vi: '1 VP mỗi giọt.', en: '1 VP per drop.' },
  '1 VP per goods tile left in storage': {
    vi: '1 VP mỗi ô hàng hóa còn trong kho.',
    en: '1 VP per goods tile left in storage',
  },
  '1 VP per house in a non-brick city, max 15 per card. Legatus counts as Jupiter too.': {
    vi: '1 VP mỗi nhà trong thành phố không dùng gạch, tối đa 15 VP mỗi thẻ. Legatus cũng được tính là Jupiter.',
    en: '1 VP per house in a non-brick city, max 15 per card. Legatus counts as Jupiter too.',
  },
  '1 VP per krone.': { vi: '1 VP mỗi krone.', en: '1 VP per krone.' },
  '1 VP per province with at least one of your houses, per card. Legatus counts as Saturnus too.': {
    vi: '1 VP mỗi tỉnh có ít nhất một nhà của bạn, tính theo từng thẻ. Legatus cũng được tính là Saturnus.',
    en: '1 VP per province with at least one of your houses, per card. Legatus counts as Saturnus too.',
  },
  '1 VP per section of completed link (between track tiles and between cities/towns).': {
    vi: '1 VP mỗi đoạn đường hoàn thành (giữa các ô track và giữa các thành phố/thị trấn).',
    en: '1 VP per section of completed link (between track tiles and between cities/towns).',
  },
  '1 VP per sold goods tile (needs tile 25)': {
    vi: '1 VP mỗi ô hàng hóa đã bán (cần ô 25).',
    en: '1 VP per sold goods tile (needs tile 25)',
  },
  '1 Wealth each.': { vi: '1 Wealth mỗi cái.', en: '1 Wealth each.' },
  '1 Wealth per Silver bar after converting Copper at current rate.': {
    vi: '1 Wealth mỗi thỏi Silver sau khi đổi Copper theo tỷ lệ hiện tại.',
    en: '1 Wealth per Silver bar after converting Copper at current rate.',
  },
  '1 fortress power per advancement owned (pegs placed) at game end.': {
    vi: '1 sức mạnh pháo đài mỗi tiến bộ sở hữu (chốt đã đặt) khi kết thúc ván.',
    en: '1 fortress power per advancement owned (pegs placed) at game end.',
  },
  "1 if you control the Kingdom's Favour.": {
    vi: '1 nếu bạn kiểm soát Kingdom’s Favour.',
    en: "1 if you control the Kingdom's Favour.",
  },
  '1 point per room (clay house)': {
    vi: '1 điểm mỗi phòng (nhà đất sét).',
    en: '1 point per room (clay house)',
  },
  '1 point per stable inside a pasture': {
    vi: '1 điểm mỗi chuồng trong đồng cỏ.',
    en: '1 point per stable inside a pasture',
  },
  '1 prestige per 10 combined': {
    vi: '1 danh tiếng mỗi 10 cộng gộp.',
    en: '1 prestige per 10 combined',
  },
  '1 prestige per special worker': {
    vi: '1 danh tiếng mỗi công nhân đặc biệt.',
    en: '1 prestige per special worker',
  },
  '10 points per bonus objective marker you hold.': {
    vi: '10 điểm mỗi dấu mục tiêu thưởng bạn đang giữ.',
    en: '10 points per bonus objective marker you hold.',
  },
  '2 VP each.': { vi: '2 VP mỗi cái.', en: '2 VP each.' },
  '2 VP if you hold the job market token.': {
    vi: '2 VP nếu bạn giữ token Job Market.',
    en: '2 VP if you hold the job market token.',
  },
  '2 VP per Department elsewhere.': {
    vi: '2 VP mỗi Department ở vị trí khác.',
    en: '2 VP per Department elsewhere.',
  },
  '2 VP per colonist of yours on the board, max 12 per card.': {
    vi: '2 VP mỗi colonist của bạn trên bàn, tối đa 12 VP mỗi thẻ.',
    en: '2 VP per colonist of yours on the board, max 12 per card.',
  },
  '2 VP per different goods type sold (needs tile 15)': {
    vi: '2 VP mỗi loại hàng hóa khác nhau đã bán (cần ô 15).',
    en: '2 VP per different goods type sold (needs tile 15)',
  },
  '2 VP per type of goods your houses produce, max 10 per card.': {
    vi: '2 VP mỗi loại hàng hóa do nhà của bạn sản xuất, tối đa 10 VP mỗi thẻ.',
    en: '2 VP per type of goods your houses produce, max 10 per card.',
  },
  '2 Wealth per level reached (max level 6).': {
    vi: '2 Wealth mỗi cấp đạt được (tối đa cấp 6).',
    en: '2 Wealth per level reached (max level 6).',
  },
  '2 points per room (stone house)': {
    vi: '2 điểm mỗi phòng (nhà đá).',
    en: '2 points per room (stone house)',
  },
  '2-player game only: 1 VP per unused chip, max 3': {
    vi: 'Chỉ áp dụng ván 2 người: 1 VP mỗi chip chưa dùng, tối đa 3.',
    en: '2-player game only: 1 VP per unused chip, max 3',
  },
  '3 VP each.': { vi: '3 VP mỗi cái.', en: '3 VP each.' },
  '3 VP if the scoring disc space on your player board is cleared.': {
    vi: '3 VP nếu ô đĩa điểm trên bảng người chơi của bạn đã được dọn trống.',
    en: '3 VP if the scoring disc space on your player board is cleared.',
  },
  '3 VP if you still have your Action Choice tile (3-4 players only).': {
    vi: '3 VP nếu bạn vẫn giữ ô Action Choice (chỉ ván 3–4 người).',
    en: '3 VP if you still have your Action Choice tile (3-4 players only).',
  },
  '3 VP per Department in the top row.': {
    vi: '3 VP mỗi Department ở hàng trên cùng.',
    en: '3 VP per Department in the top row.',
  },
  '3 VP per bonus tile owned, large or small (needs tile 26)': {
    vi: '3 VP mỗi ô thưởng sở hữu, lớn hoặc nhỏ (cần ô 26).',
    en: '3 VP per bonus tile owned, large or small (needs tile 26)',
  },
  '3 VP per income level at the end of the last turn.': {
    vi: '3 VP mỗi cấp thu nhập khi kết thúc lượt cuối.',
    en: '3 VP per income level at the end of the last turn.',
  },
  '3 Wealth each.': { vi: '3 Wealth mỗi cái.', en: '3 Wealth each.' },
  '3 points per crest in your largest group connected by bridges.': {
    vi: '3 điểm mỗi huy hiệu trong nhóm lớn nhất của bạn được nối bằng cầu.',
    en: '3 points per crest in your largest group connected by bridges.',
  },
  '3 points per family member': {
    vi: '3 điểm mỗi thành viên gia đình.',
    en: '3 points per family member',
  },
  '4 VP each.': { vi: '4 VP mỗi cái.', en: '4 VP each.' },
  '4 VP per animal type in your estate (needs tile 24)': {
    vi: '4 VP mỗi loại động vật trong điền trang của bạn (cần ô 24).',
    en: '4 VP per animal type in your estate (needs tile 24)',
  },
  '4 VP per building of each type whose yellow tile you own': {
    vi: '4 VP mỗi công trình thuộc loại có ô vàng bạn sở hữu.',
    en: '4 VP per building of each type whose yellow tile you own',
  },
  '4 VP per worker on the fifth or sixth space of any row.': {
    vi: '4 VP mỗi công nhân ở ô thứ năm hoặc thứ sáu của bất kỳ hàng nào.',
    en: '4 VP per worker on the fifth or sixth space of any row.',
  },
  '5 Wealth each.': { vi: '5 Wealth mỗi cái.', en: '5 Wealth each.' },
  '7 VP to the player(s) with the most completed contracts.': {
    vi: '7 VP cho người chơi có nhiều hợp đồng hoàn thành nhất.',
    en: '7 VP to the player(s) with the most completed contracts.',
  },
  'A heist succeeds when the chip order matches the hand ranking order at showdown; any mistake trips an alarm':
    {
      vi: 'Vụ trộm thành công khi thứ tự chip trùng với thứ hạng bài khi lật bài; bất kỳ sai sót nào cũng kích hoạt báo động.',
      en: 'A heist succeeds when the chip order matches the hand ranking order at showdown; any mistake trips an alarm',
    },
  'Add the values of your Number cards in line (0 is worth nothing). Enter 0 if you busted.': {
    vi: 'Cộng giá trị các thẻ Number trong hàng (0 không có giá trị). Nhập 0 nếu bạn bị bust.',
    en: 'Add the values of your Number cards in line (0 is worth nothing). Enter 0 if you busted.',
  },
  'After deducting Offspring discs in enclosures, applying Animal Welfare adjustments and final building.':
    {
      vi: 'Sau khi trừ đĩa Offspring trong chuồng, áp dụng điều chỉnh Animal Welfare và tính công trình cuối ván.',
      en: 'After deducting Offspring discs in enclosures, applying Animal Welfare adjustments and final building.',
    },
  'After scoring National Park, Breeding Program and Animal Welfare points and final building.': {
    vi: 'Sau khi tính điểm National Park, Breeding Program, Animal Welfare và công trình cuối ván.',
    en: 'After scoring National Park, Breeding Program and Animal Welfare points and final building.',
  },
  'All reputation on the scoring track becomes victory points.': {
    vi: 'Toàn bộ danh tiếng trên track điểm được tính thành điểm chiến thắng.',
    en: 'All reputation on the scoring track becomes victory points.',
  },
  'All your flipped industry tiles on board (level 2+ also scored in canal era).': {
    vi: 'Tất cả ô công nghiệp đã lật của bạn trên bàn (cấp 2 trở lên cũng được tính ở thời kỳ kênh đào).',
    en: 'All your flipped industry tiles on board (level 2+ also scored in canal era).',
  },
  'At least one mistake in the order trips an alarm': {
    vi: 'Chỉ cần một lỗi trong thứ tự là kích hoạt báo động.',
    en: 'At least one mistake in the order trips an alarm',
  },
  'Bonus points from cards/improvements': {
    vi: 'Điểm thưởng từ thẻ/cải tiến.',
    en: 'Bonus points from cards/improvements',
  },
  'Buildings in largest group within Reach: 1st 18, 2nd 12, 3rd 6; ties share summed places rounded down.':
    {
      vi: 'Công trình trong nhóm lớn nhất nằm trong tầm Reach: hạng 1 được 18, hạng 2 được 12, hạng 3 được 6; người hòa chia tổng điểm các hạng, làm tròn xuống.',
      en: 'Buildings in largest group within Reach: 1st 18, 2nd 12, 3rd 6; ties share summed places rounded down.',
    },
  'Calculated from leftover krones and dishes/drinks in the kitchen; already included in total VP.':
    {
      vi: 'Được tính từ krone và món ăn/đồ uống còn lại trong bếp; đã gồm trong tổng VP.',
      en: 'Calculated from leftover krones and dishes/drinks in the kitchen; already included in total VP.',
    },
  'Chỉ VP cuối in trên ô đã kích hoạt; thưởng công nghệ nhận trong ván đã nằm trên track.': {
    vi: 'Chỉ tính VP cuối được in trên ô đã kích hoạt; thưởng công nghệ nhận trong ván đã nằm trên track.',
    en: 'Only count the end-game VP printed on activated spaces; technology bonuses earned during play are already on the track.',
  },
  'Chỉ bật khi cả bàn xác nhận kết quả theo luật. Nếu đã nhập số phi vụ, kết quả vẫn phải khớp.': {
    vi: 'Chỉ bật khi cả bàn xác nhận kết quả theo luật. Nếu đã nhập số phi vụ, kết quả vẫn phải khớp.',
    en: 'Enable only when everyone confirms the result according to the rules. If heist counts are entered, the result must still match.',
  },
  'Convert leftover resources to Coins; 1 VP per 5 Coins.': {
    vi: 'Đổi tài nguyên còn lại thành Coin; 1 VP mỗi 5 Coin.',
    en: 'Convert leftover resources to Coins; 1 VP per 5 Coins.',
  },
  'Convert workers, priests, and power to coins first; 1 VP per 3 coins.': {
    vi: 'Trước tiên đổi worker, priest và power thành coin; 1 VP mỗi 3 coin.',
    en: 'Convert workers, priests, and power to coins first; 1 VP per 3 coins.',
  },
  'Correct gold seal +5, correct silver seal +3, unstarred correct 0. Wrong starred seal -4; wrong unstarred seal -4 unless properly hedged.':
    {
      vi: 'Dấu vàng đúng +5, dấu bạc đúng +3, dấu đúng không có sao 0. Dấu có sao sai -4; dấu không có sao sai -4 trừ khi được phòng hộ đúng cách.',
      en: 'Correct gold seal +5, correct silver seal +3, unstarred correct 0. Wrong starred seal -4; wrong unstarred seal -4 unless properly hedged.',
    },
  'Count all penalty tokens (include 1 per card still below the board). 1st -3, 2nd -5, each further -7.':
    {
      vi: 'Đếm mọi token phạt (cộng 1 cho mỗi lá vẫn nằm dưới bàn). Token thứ nhất -3, thứ hai -5, mỗi token sau đó -7.',
      en: 'Count all penalty tokens (include 1 per card still below the board). 1st -3, 2nd -5, each further -7.',
    },
  'Count all together; 1 VP per full 4 (not VP itself).': {
    vi: 'Cộng tất cả lại; 1 VP mỗi 4 đơn vị trọn vẹn (không phải VP).',
    en: 'Count all together; 1 VP per full 4 (not VP itself).',
  },
  'Count buildings in largest connected group. 1st 18, 2nd 12, 3rd 6; ties split.': {
    vi: 'Đếm công trình trong nhóm kết nối lớn nhất. Hạng 1 được 18, hạng 2 được 12, hạng 3 được 6; người hòa chia điểm.',
    en: 'Count buildings in largest connected group. 1st 18, 2nd 12, 3rd 6; ties split.',
  },
  'Count each level 3, 4 and 5 reached or passed across all six tracks.': {
    vi: 'Đếm mỗi cấp 3, 4 và 5 đã đạt hoặc vượt trên cả sáu track.',
    en: 'Count each level 3, 4 and 5 reached or passed across all six tracks.',
  },
  'Count empty hex spaces on your duchy board; fewer wins the first tiebreak.': {
    vi: 'Đếm ô lục giác trống trên bảng công quốc; ít hơn thắng lượt phân định hòa đầu tiên.',
    en: 'Count empty hex spaces on your duchy board; fewer wins the first tiebreak.',
  },
  'Count for the most-contracts bonus.': {
    vi: 'Dùng để tính thưởng nhiều hợp đồng nhất.',
    en: 'Count for the most-contracts bonus.',
  },
  'Count only field tiles on your farmyard; field cards do not count. 0–1: −1 VP; 2: 1; 3: 2; 4: 3; 5+: 4.':
    {
      vi: 'Chỉ đếm ô đồng ruộng trên sân nhà; không tính thẻ đồng ruộng. 0–1: −1 VP; 2: 1; 3: 2; 4: 3; 5+: 4.',
      en: 'Count only field tiles on your farmyard; field cards do not count. 0–1: −1 VP; 2: 1; 3: 2; 4: 3; 5+: 4.',
    },
  'Count orchestra first chairs you occupy. Use this row for 1-3 players only': {
    vi: 'Đếm First Chair trong dàn nhạc bạn đang giữ. Chỉ dùng hàng này cho 1–3 người chơi.',
    en: 'Count orchestra first chairs you occupy. Use this row for 1-3 players only',
  },
  'Current Reputation.': { vi: 'Uy tín hiện tại.', en: 'Current Reputation.' },
  'Current gate health at the end of wave 4.': {
    vi: 'Máu cổng hiện tại khi kết thúc đợt 4.',
    en: 'Current gate health at the end of wave 4.',
  },
  'Doubles the Number-card sum only (before adding +modifiers). Adds an extra copy of the sum.': {
    vi: 'Chỉ nhân đôi tổng thẻ Number (trước khi cộng các bổ trợ +). Cộng thêm một bản sao của tổng đó.',
    en: 'Doubles the Number-card sum only (before adding +modifiers). Adds an extra copy of the sum.',
  },
  'Each grant tile is worth 1 or 2 VP.': {
    vi: 'Mỗi ô trợ cấp có giá trị 1 hoặc 2 VP.',
    en: 'Each grant tile is worth 1 or 2 VP.',
  },
  'Each marker on 0 costs 3 VP.': {
    vi: 'Mỗi dấu trên ô 0 bị trừ 3 VP.',
    en: 'Each marker on 0 costs 3 VP.',
  },
  'Eliminated players cannot win.': {
    vi: 'Người chơi bị loại không thể thắng.',
    en: 'Eliminated players cannot win.',
  },
  'Enter actual VP lost during play, capped by VP available at the time, not unpaid money. Do not subtract again if already included in an entered net era subtotal.':
    {
      vi: 'Nhập VP thực tế đã mất trong ván, tối đa bằng số VP có tại thời điểm đó; không nhập tiền chưa trả. Không trừ lần nữa nếu đã tính trong tổng ròng của thời kỳ.',
      en: 'Enter actual VP lost during play, capped by VP available at the time, not unpaid money. Do not subtract again if already included in an entered net era subtotal.',
    },
  "Enter each player's final rank from first (1) to last; for markers on the same space, use their top-to-bottom stack order. The player farthest behind wins the second tiebreak.":
    {
      vi: 'Nhập thứ hạng cuối của mỗi người từ đầu (1) đến cuối; nếu các dấu ở cùng ô, dùng thứ tự chồng từ trên xuống dưới. Người ở sau xa nhất thắng lượt phân định hòa thứ hai.',
      en: "Enter each player's final rank from first (1) to last; for markers on the same space, use their top-to-bottom stack order. The player farthest behind wins the second tiebreak.",
    },
  'Everything scored before the final AGM (launches, section 1/2 progress, etc.). Track continues past 100/200.':
    {
      vi: 'Mọi điểm tính trước AGM cuối (phóng tàu, tiến độ khu 1/2, v.v.). Track tiếp tục vượt 100/200.',
      en: 'Everything scored before the final AGM (launches, section 1/2 progress, etc.). Track continues past 100/200.',
    },
  'Excavators + Concrete Mixers + Credits in supply (not on Construction Wheel); 1 VP per 5.': {
    vi: 'Excavator + Concrete Mixer + Credit trong kho (không đặt trên Construction Wheel); 1 VP mỗi 5.',
    en: 'Excavators + Concrete Mixers + Credits in supply (not on Construction Wheel); 1 VP per 5.',
  },
  'Extra VP from Endgame Intrigue cards played at game end (not yet on the track).': {
    vi: 'VP bổ sung từ thẻ Endgame Intrigue được chơi khi kết thúc ván (chưa có trên track).',
    en: 'Extra VP from Endgame Intrigue cards played at game end (not yet on the track).',
  },
  'Final position of your Score marker (influence VP, alliances, conflict, cards, battle-icon pairs all included).':
    {
      vi: 'Vị trí cuối của dấu Điểm (đã gồm VP ảnh hưởng, liên minh, xung đột, thẻ và các cặp biểu tượng chiến đấu).',
      en: 'Final position of your Score marker (influence VP, alliances, conflict, cards, battle-icon pairs all included).',
    },
  'Fulfilled cards add printed VP; unfulfilled subtract printed penalty. Net result (may be negative).':
    {
      vi: 'Thẻ hoàn thành cộng VP được in; thẻ chưa hoàn thành trừ điểm phạt được in. Kết quả ròng có thể âm.',
      en: 'Fulfilled cards add printed VP; unfulfilled subtract printed penalty. Net result (may be negative).',
    },
  'Gain or lose the VP value of the highest or lowest humanity space reached (enter negative if loss).':
    {
      vi: 'Nhận hoặc mất số VP của ô Humanity cao nhất hoặc thấp nhất đã đạt (nhập số âm nếu mất điểm).',
      en: 'Gain or lose the VP value of the highest or lowest humanity space reached (enter negative if loss).',
    },
  'Gold remaining after buying VP at 3 gold each (favor cards counted as 2 gold).': {
    vi: 'Gold còn lại sau khi mua VP với giá 3 gold mỗi điểm (thẻ favor tính là 2 gold).',
    en: 'Gold remaining after buying VP at 3 gold each (favor cards counted as 2 gold).',
  },
  'Goods in Workshops or on ships in port; 1 Wealth each.': {
    vi: 'Hàng hóa trong Workshop hoặc trên tàu ở cảng; mỗi món được 1 Wealth.',
    en: 'Goods in Workshops or on ships in port; 1 Wealth each.',
  },
  'Goods in storehouse at printed price + cash; 1 VP per full 10 sestertii, per Vesta card.': {
    vi: 'Hàng hóa trong kho tính theo giá in trên thẻ cộng tiền mặt; mỗi 10 sestertii trọn vẹn được 1 VP theo thẻ Vesta.',
    en: 'Goods in storehouse at printed price + cash; 1 VP per full 10 sestertii, per Vesta card.',
  },
  'Heist succeeds when chip order matches the hand ranking order at showdown': {
    vi: 'Vụ trộm thành công khi thứ tự chip trùng với thứ hạng bài lúc lật bài.',
    en: 'Heist succeeds when chip order matches the hand ranking order at showdown',
  },
  'Highest 8 VP, 2nd 4, 3rd 2; ties split and round down. Must be above space 0.': {
    vi: 'Hạng cao nhất được 8 VP, hạng 2 được 4, hạng 3 được 2; người hòa chia đều và làm tròn xuống. Phải đứng trên ô 0.',
    en: 'Highest 8 VP, 2nd 4, 3rd 2; ties split and round down. Must be above space 0.',
  },
  'If your gate is defeated in the last wave, your fortress power counts as 0.': {
    vi: 'Nếu cổng của bạn bị đánh bại ở đợt cuối, sức mạnh pháo đài tính là 0.',
    en: 'If your gate is defeated in the last wave, your fortress power counts as 0.',
  },
  'Immediate VP already earned during play (score marker position).': {
    vi: 'VP tức thời đã nhận trong ván (vị trí dấu điểm).',
    en: 'Immediate VP already earned during play (score marker position).',
  },
  'Income level number, not income track space.': {
    vi: 'Số cấp thu nhập, không phải ô trên track thu nhập.',
    en: 'Income level number, not income track space.',
  },
  'Individual: 2 VP per province with 2+ of your houses, max 14 per card. Legatus counts as Venus too.':
    {
      vi: 'Cá nhân: 2 VP mỗi tỉnh có từ 2 nhà của bạn trở lên, tối đa 14 VP mỗi thẻ. Legatus cũng được tính là Venus.',
      en: 'Individual: 2 VP per province with 2+ of your houses, max 14 per card. Legatus counts as Venus too.',
    },
  'Influence trong Supply TRƯỚC quy đổi Lore; không cộng phần Lore một lần nữa.': {
    vi: 'Influence trong Supply trước khi đổi Lore; không cộng lại phần Lore.',
    en: 'Influence in Supply before converting Lore; do not count the Lore portion again.',
  },
  'Level 0 scores nothing. 1st 8, 2nd 4, 3rd 2; ties share summed places rounded down.': {
    vi: 'Cấp 0 không có điểm. Hạng 1 được 8, hạng 2 được 4, hạng 3 được 2; người hòa chia tổng điểm các hạng và làm tròn xuống.',
    en: 'Level 0 scores nothing. 1st 8, 2nd 4, 3rd 2; ties share summed places rounded down.',
  },
  'Lịch sử đã trừ trên track khi patron rời đi; không trừ lần nữa ở cuối ván.': {
    vi: 'Điểm này đã bị trừ trên track khi Patron rời đi; không trừ lần nữa vào cuối ván.',
    en: 'This was already subtracted from the track when the Patron left; do not subtract it again at game end.',
  },
  'Marker on the VP track (starts at 10) after round 6.': {
    vi: 'Vị trí dấu trên track VP (bắt đầu ở 10) sau vòng 6.',
    en: 'Marker on the VP track (starts at 10) after round 6.',
  },
  'Marker position at end of round 5, before final scoring. Past 100 = add 100 per lap.': {
    vi: 'Vị trí dấu vào cuối vòng 5, trước tính điểm cuối. Vượt 100 thì cộng thêm 100 mỗi vòng track.',
    en: 'Marker position at end of round 5, before final scoring. Past 100 = add 100 per lap.',
  },
  "Marker position before final scoring: includes contracts, King's Day scoring, endgame-condition VP (3 each).":
    {
      vi: 'Vị trí dấu trước tính điểm cuối: gồm hợp đồng, điểm King’s Day và VP điều kiện cuối ván (3 mỗi điều kiện).',
      en: "Marker position before final scoring: includes contracts, King's Day scoring, endgame-condition VP (3 each).",
    },
  'Money held after mergers during play.': {
    vi: 'Tiền còn lại sau các vụ sáp nhập trong ván.',
    en: 'Money held after mergers during play.',
  },
  'Most Overseers in Corrupt Administration: enter 4 (sole winner), 2 (tied) or 0.': {
    vi: 'Nhiều Overseer nhất trong Corrupt Administration: nhập 4 (thắng một mình), 2 (hòa) hoặc 0.',
    en: 'Most Overseers in Corrupt Administration: enter 4 (sole winner), 2 (tied) or 0.',
  },
  'Negotiation level (1-4) x number of distinct destinations you exported at least 1 Good to (max 6).':
    {
      vi: 'Cấp Negotiation (1–4) nhân số điểm đến khác nhau mà bạn đã xuất ít nhất 1 Good tới (tối đa 6).',
      en: 'Negotiation level (1-4) x number of distinct destinations you exported at least 1 Good to (max 6).',
    },
  'Not scored; breaks ties.': {
    vi: 'Không tính điểm; dùng để phân định hòa.',
    en: 'Not scored; breaks ties.',
  },
  'Numeric ID matching roles.key; record after the game has ended.': {
    vi: 'Mã số trùng với roles.key; ghi lại sau khi ván kết thúc.',
    en: 'Numeric ID matching roles.key; record after the game has ended.',
  },
  'One entry per alive part: the Alive points printed on that part.': {
    vi: 'Nhập một giá trị cho mỗi bộ phận còn sống: số điểm Alive in trên bộ phận đó.',
    en: 'One entry per alive part: the Alive points printed on that part.',
  },
  "One entry per marker on the milestone track: times its segment tile's condition is met x tier multiplier. Include markers placed in final scoring with leftover Achievement tokens.":
    {
      vi: 'Nhập một giá trị cho mỗi dấu trên track cột mốc: số lần đạt điều kiện của ô phân đoạn nhân hệ số tầng. Tính cả dấu đặt khi chấm điểm cuối bằng Achievement token còn lại.',
      en: "One entry per marker on the milestone track: times its segment tile's condition is met x tier multiplier. Include markers placed in final scoring with leftover Achievement tokens.",
    },
  'One of the destiny goals (e.g. escaping the planet) completed': {
    vi: 'Một mục tiêu định mệnh đã hoàn thành (ví dụ thoát khỏi hành tinh).',
    en: 'One of the destiny goals (e.g. escaping the planet) completed',
  },
  'Only if a discovered alien species adds an extra end-game scoring step.': {
    vi: 'Chỉ tính nếu loài ngoài hành tinh đã khám phá có thêm bước chấm điểm cuối ván.',
    en: 'Only if a discovered alien species adds an extra end-game scoring step.',
  },
  'Only if in play. 3 VP per island where you have the most Settlements (ties for first count).': {
    vi: 'Chỉ tính nếu có trong ván. 3 VP mỗi đảo nơi bạn có nhiều Settlement nhất (hòa nhất cũng được tính).',
    en: 'Only if in play. 3 VP per island where you have the most Settlements (ties for first count).',
  },
  'Only if in play. 4 VP per Settlement on the largest island(s).': {
    vi: 'Chỉ tính nếu có trong ván. 4 VP mỗi Settlement trên đảo lớn nhất.',
    en: 'Only if in play. 4 VP per Settlement on the largest island(s).',
  },
  'Only if in play. 4 VP per Settlement on the smallest island(s).': {
    vi: 'Chỉ tính nếu có trong ván. 4 VP mỗi Settlement trên đảo nhỏ nhất.',
    en: 'Only if in play. 4 VP per Settlement on the smallest island(s).',
  },
  'Only if in play. 5 VP per Settlement adjacent to a Temple space.': {
    vi: 'Chỉ tính nếu có trong ván. 5 VP mỗi Settlement nằm cạnh ô Temple.',
    en: 'Only if in play. 5 VP per Settlement adjacent to a Temple space.',
  },
  'Only if in play. 5 VP per island where you have exactly one Settlement.': {
    vi: 'Chỉ tính nếu có trong ván. 5 VP mỗi đảo nơi bạn có đúng một Settlement.',
    en: 'Only if in play. 5 VP per island where you have exactly one Settlement.',
  },
  'Only if this score card is in play. Settlements in your largest connected group, squared.': {
    vi: 'Chỉ tính nếu thẻ điểm này có trong ván. Bình phương số Settlement trong nhóm kết nối lớn nhất của bạn.',
    en: 'Only if this score card is in play. Settlements in your largest connected group, squared.',
  },
  'Only if you unlocked your 8th Technology; see appendix for your Experiment.': {
    vi: 'Chỉ tính nếu bạn đã mở khóa Công nghệ thứ 8; xem phụ lục về Experiment của bạn.',
    en: 'Only if you unlocked your 8th Technology; see appendix for your Experiment.',
  },
  'Only used to break ties': { vi: 'Chỉ dùng để phân định hòa.', en: 'Only used to break ties' },
  'Per island: your Settlements there x number of Spirit spaces on that island. Enter the total over all islands.':
    {
      vi: 'Mỗi đảo: số Settlement của bạn trên đảo nhân với số ô Spirit trên đảo đó. Nhập tổng của tất cả các đảo.',
      en: 'Per island: your Settlements there x number of Spirit spaces on that island. Enter the total over all islands.',
    },
  'Per link tile: 1 VP per VP icon at each adjacent location.': {
    vi: 'Mỗi ô nối: 1 VP cho mỗi biểu tượng VP tại từng địa điểm kề bên.',
    en: 'Per link tile: 1 VP per VP icon at each adjacent location.',
  },
  'Per specialist: houses in matching city type x VP printed on that card. Enter each card total.':
    {
      vi: 'Mỗi Specialist: số nhà trong loại thành phố tương ứng nhân VP in trên thẻ đó. Nhập tổng của từng thẻ.',
      en: 'Per specialist: houses in matching city type x VP printed on that card. Enter each card total.',
    },
  'Players with negative money after round 7 cannot win.': {
    vi: 'Người chơi có tiền âm sau vòng 7 không thể thắng.',
    en: 'Players with negative money after round 7 cannot win.',
  },
  "Points from face-up District tiles for most crests; tie splits the two positions' points, rounded down.":
    {
      vi: 'Điểm từ các ô District lật ngửa cho số huy hiệu nhiều nhất; nếu hòa, chia điểm của hai hạng và làm tròn xuống.',
      en: "Points from face-up District tiles for most crests; tie splits the two positions' points, rounded down.",
    },
  'Points from your 2 kept goal cards, by level reached': {
    vi: 'Điểm từ 2 thẻ mục tiêu bạn giữ, theo cấp đã đạt.',
    en: 'Points from your 2 kept goal cards, by level reached',
  },
  'Points on the scoring track from play (deliveries, fast-delivery bonuses).': {
    vi: 'Điểm trên track chấm điểm trong ván (giao hàng, thưởng giao nhanh).',
    en: 'Points on the scoring track from play (deliveries, fast-delivery bonuses).',
  },
  'Position of your VP marker (points from building monster parts, by decomposition stage, minus animal-material penalty).':
    {
      vi: 'Vị trí dấu VP của bạn (điểm xây các bộ phận quái vật theo giai đoạn phân rã, trừ phạt nguyên liệu động vật).',
      en: 'Position of your VP marker (points from building monster parts, by decomposition stage, minus animal-material penalty).',
    },
  'Prestige gained during play: instruments, repairs, patrons, performances, awards': {
    vi: 'Danh tiếng nhận trong ván: nhạc cụ, sửa chữa, Patron, biểu diễn và giải thưởng.',
    en: 'Prestige gained during play: instruments, repairs, patrons, performances, awards',
  },
  'Printed points on face-up major/minor improvements; occupations have no printed points.': {
    vi: 'Điểm in trên cải tiến lớn/nhỏ đang lật ngửa; nghề nghiệp không có điểm in sẵn.',
    en: 'Printed points on face-up major/minor improvements; occupations have no printed points.',
  },
  'Randomly chosen mission completed': {
    vi: 'Nhiệm vụ được chọn ngẫu nhiên đã hoàn thành.',
    en: 'Randomly chosen mission completed',
  },
  "Rank on the tile's track: 1st/2nd/3rd/4th = 18/12/6/0; ties split the VP of the shared ranks evenly. Enter VP gained.":
    {
      vi: 'Thứ hạng trên track của ô: hạng 1/2/3/4 được 18/12/6/0; người hòa chia đều VP của các hạng bị chiếm. Nhập VP nhận được.',
      en: "Rank on the tile's track: 1st/2nd/3rd/4th = 18/12/6/0; ties split the VP of the shared ranks evenly. Enter VP gained.",
    },
  'Read your marker on the VP track after the end-game scoring is resolved.': {
    vi: 'Đọc vị trí dấu của bạn trên track VP sau khi hoàn tất tính điểm cuối ván.',
    en: 'Read your marker on the VP track after the end-game scoring is resolved.',
  },
  'Remaining Solari.': { vi: 'Solari còn lại.', en: 'Remaining Solari.' },
  'Remaining spice.': { vi: 'Spice còn lại.', en: 'Remaining spice.' },
  'Remaining water.': { vi: 'Nước còn lại.', en: 'Remaining water.' },
  'Resources, money, ads, agenda cards and blueprints: 1 VP per 3.': {
    vi: 'Tài nguyên, tiền, quảng cáo, thẻ agenda và blueprint: 1 VP mỗi 3.',
    en: 'Resources, money, ads, agenda cards and blueprints: 1 VP per 3.',
  },
  'Same as canal era, using rail links.': {
    vi: 'Tương tự thời kỳ kênh đào, nhưng dùng đường sắt.',
    en: 'Same as canal era, using rail links.',
  },
  'Same as tile 1.': { vi: 'Giống ô 1.', en: 'Same as tile 1.' },
  'Second tiebreaker only.': {
    vi: 'Chỉ dùng để phân định hòa lần hai.',
    en: 'Second tiebreaker only.',
  },
  "Sell all shares at the price for each active chain's name and size; chains off board are worth 0.":
    {
      vi: 'Bán toàn bộ cổ phiếu theo giá dựa trên tên và quy mô của mỗi chuỗi đang hoạt động; chuỗi ngoài bàn có giá trị 0.',
      en: "Sell all shares at the price for each active chain's name and size; chains off board are worth 0.",
    },
  "Sets of the tile's condition x value of your marker on that tile.": {
    vi: 'Số bộ thỏa điều kiện của ô nhân với giá trị dấu của bạn trên ô đó.',
    en: "Sets of the tile's condition x value of your marker on that tile.",
  },
  'Skip if you never reached 50 VP.': {
    vi: 'Bỏ qua nếu bạn chưa từng đạt 50 VP.',
    en: 'Skip if you never reached 50 VP.',
  },
  'Skip if you never reached 70 VP.': {
    vi: 'Bỏ qua nếu bạn chưa từng đạt 70 VP.',
    en: 'Skip if you never reached 70 VP.',
  },
  'Sum VP from game-end Staff cards (e.g. per occupied room/colour, per Staff played).': {
    vi: 'Cộng VP từ thẻ Staff cuối ván (ví dụ theo phòng/màu có khách hoặc theo Staff đã chơi).',
    en: 'Sum VP from game-end Staff cards (e.g. per occupied room/colour, per Staff played).',
  },
  'Sum across Housing (max 6), Commerce (max 9), Industry (max 12), Public Infrastructure (max 15).':
    {
      vi: 'Cộng Housing (tối đa 6), Commerce (tối đa 9), Industry (tối đa 12) và Public Infrastructure (tối đa 15).',
      en: 'Sum across Housing (max 6), Commerce (max 9), Industry (max 12), Public Infrastructure (max 15).',
    },
  'Sum bonuses for all active chains per the stock price chart; ties split and rounded up to $100.':
    {
      vi: 'Cộng thưởng của mọi chuỗi đang hoạt động theo bảng giá cổ phiếu; khi hòa, chia đều và làm tròn lên $100.',
      en: 'Sum bonuses for all active chains per the stock price chart; ties split and rounded up to $100.',
    },
  'Sum of +2/+4/+6/+8/+10 cards in line; scored even without Number cards. Enter 0 if busted.': {
    vi: 'Cộng các thẻ +2/+4/+6/+8/+10 trong hàng; vẫn tính dù không có thẻ Number. Nhập 0 nếu bị bust.',
    en: 'Sum of +2/+4/+6/+8/+10 cards in line; scored even without Number cards. Enter 0 if busted.',
  },
  'Sum of VP from each task on your station master tiles.': {
    vi: 'Cộng VP từ từng nhiệm vụ trên các ô station master của bạn.',
    en: 'Sum of VP from each task on your station master tiles.',
  },
  'Sum of VP on cattle cards in your whole deck.': {
    vi: 'Cộng VP trên các thẻ cattle trong toàn bộ bộ bài của bạn.',
    en: 'Sum of VP on cattle cards in your whole deck.',
  },
  'Sum of VP on your artifacts (some variable, see card). Count Magic Mirror first; Wisdom Idol after the Big Revelation.':
    {
      vi: 'Cộng VP trên artifact của bạn (một số có giá trị thay đổi, xem thẻ). Tính Magic Mirror trước; Wisdom Idol sau Big Revelation.',
      en: 'Sum of VP on your artifacts (some variable, see card). Count Magic Mirror first; Wisdom Idol after the Big Revelation.',
    },
  'Sum of VP on your collected hazard tiles.': {
    vi: 'Cộng VP trên các ô nguy hiểm bạn thu thập.',
    en: 'Sum of VP on your collected hazard tiles.',
  },
  'Sum of VP printed next to stations with your disc.': {
    vi: 'Cộng VP in bên cạnh các nhà ga có đĩa của bạn.',
    en: 'Sum of VP printed next to stations with your disc.',
  },
  'Sum of VP printed on your private buildings placed on the board.': {
    vi: 'Cộng VP in trên các công trình tư nhân của bạn đã đặt lên bàn.',
    en: 'Sum of VP printed on your private buildings placed on the board.',
  },
  'Sum of VPs printed on your flipped industry tiles.': {
    vi: 'Cộng VP in trên các ô công nghiệp đã lật của bạn.',
    en: 'Sum of VPs printed on your flipped industry tiles.',
  },
  'Sum of Wealth from your Goods by their slot on the Asian and European Foreign Market boards.': {
    vi: 'Cộng Wealth từ hàng hóa theo vị trí của chúng trên bảng Asian và European Foreign Market.',
    en: 'Sum of Wealth from your Goods by their slot on the Asian and European Foreign Market boards.',
  },
  'Sum of Wealth on completed Caravan tiles; uncompleted give nothing.': {
    vi: 'Cộng Wealth trên các ô Caravan đã hoàn thành; ô chưa hoàn thành không có điểm.',
    en: 'Sum of Wealth on completed Caravan tiles; uncompleted give nothing.',
  },
  "Sum of each Cockpit's criteria; -5 for each ship never launched.": {
    vi: 'Cộng điểm theo điều kiện của từng Cockpit; trừ 5 cho mỗi tàu chưa phóng.',
    en: "Sum of each Cockpit's criteria; -5 for each ship never launched.",
  },
  'Sum of end-game points printed on your completed patrons': {
    vi: 'Cộng điểm cuối ván in trên các Patron bạn đã hoàn thành.',
    en: 'Sum of end-game points printed on your completed patrons',
  },
  'Sum of points from played cards with a gold box.': {
    vi: 'Cộng điểm từ các thẻ đã chơi có khung vàng.',
    en: 'Sum of points from played cards with a gold box.',
  },
  'Sum of your Victory Point tokens.': {
    vi: 'Cộng các Victory Point token của bạn.',
    en: 'Sum of your Victory Point tokens.',
  },
  'Số Lore còn lại trước quy đổi; chỉ tính nếu Site of Power không còn thẻ.': {
    vi: 'Số Lore còn lại trước khi quy đổi; chỉ tính nếu Site of Power không còn thẻ.',
    en: 'Lore remaining before conversion; count only if no cards remain at the Site of Power.',
  },
  'Third tiebreaker only.': {
    vi: 'Chỉ dùng để phân định hòa lần ba.',
    en: 'Third tiebreaker only.',
  },
  'Top 3 players score 15 / 10 / 5 VP; ties split, rounded up. Enter the VP awarded.': {
    vi: 'Ba người đứng đầu nhận 15 / 10 / 5 VP; khi hòa, chia đều và làm tròn lên. Nhập số VP được trao.',
    en: 'Top 3 players score 15 / 10 / 5 VP; ties split, rounded up. Enter the VP awarded.',
  },
  'Total on the VP track, incl. completed regions, phase bonuses, bonus tiles, animals, sales. Add 100/200 if tile flipped':
    {
      vi: 'Tổng trên track VP, gồm khu vực hoàn thành, thưởng giai đoạn, ô thưởng, động vật và bán hàng. Cộng 100/200 nếu ô đã lật.',
      en: 'Total on the VP track, incl. completed regions, phase bonuses, bonus tiles, animals, sales. Add 100/200 if tile flipped',
    },
  'Total points from active cards with the game-end icon.': {
    vi: 'Tổng điểm từ các thẻ đang hoạt động có biểu tượng cuối ván.',
    en: 'Total points from active cards with the game-end icon.',
  },
  'Total printed prestige of unfinished instruments; you score half, rounded up': {
    vi: 'Tổng danh tiếng in trên nhạc cụ chưa hoàn thành; bạn nhận một nửa, làm tròn lên.',
    en: 'Total printed prestige of unfinished instruments; you score half, rounded up',
  },
  'Total your Progress Cubes on the Progress Track.': {
    vi: 'Tổng Progress Cube của bạn trên Progress Track.',
    en: 'Total your Progress Cubes on the Progress Track.',
  },
  'Troops in your garrison.': { vi: 'Quân trong đồn trú của bạn.', en: 'Troops in your garrison.' },
  'Tự lấy từ tổng Cockpit, không nhập lần hai.': {
    vi: 'Tự lấy từ tổng Cockpit, không nhập lần hai.',
    en: 'Taken from the Cockpit total automatically; do not enter it again.',
  },
  'Up to 36 VP: connect New York, Chicago, New Orleans, and San Francisco; use the lowest transport level across connected regions. If you have separate networks, count only the highest-scoring one.':
    {
      vi: 'Tối đa 36 VP: nối New York, Chicago, New Orleans và San Francisco; dùng cấp vận chuyển thấp nhất giữa các vùng được nối. Nếu có nhiều mạng riêng, chỉ tính mạng có điểm cao nhất.',
      en: 'Up to 36 VP: connect New York, Chicago, New Orleans, and San Francisco; use the lowest transport level across connected regions. If you have separate networks, count only the highest-scoring one.',
    },
  'Use this row for 4 players only': {
    vi: 'Chỉ dùng hàng này cho ván 4 người.',
    en: 'Use this row for 4 players only',
  },
  'VP from Main Objective progress and fulfilled conditions (per your mission card/objective).': {
    vi: 'VP từ tiến độ Main Objective và các điều kiện đã hoàn thành (theo thẻ nhiệm vụ/mục tiêu của bạn).',
    en: 'VP from Main Objective progress and fulfilled conditions (per your mission card/objective).',
  },
  'VP from guests, politics, rooms, Emperor scoring and Emperor tiles gained during play.': {
    vi: 'VP từ khách, chính trị, phòng, điểm Emperor và các ô Emperor nhận trong ván.',
    en: 'VP from guests, politics, rooms, Emperor scoring and Emperor tiles gained during play.',
  },
  'VP from your 2 goal cards.': {
    vi: 'VP từ 2 thẻ mục tiêu của bạn.',
    en: 'VP from your 2 goal cards.',
  },
  'VP gained during play (contracts, trading post milestones, etc.).': {
    vi: 'VP nhận trong ván (hợp đồng, cột mốc trạm giao thương, v.v.).',
    en: 'VP gained during play (contracts, trading post milestones, etc.).',
  },
  'VP gained during the 6 rounds (scoring tiles, favors, towns, etc.).': {
    vi: 'VP nhận trong 6 vòng (ô chấm điểm, favor, thị trấn, v.v.).',
    en: 'VP gained during the 6 rounds (scoring tiles, favors, towns, etc.).',
  },
  'VP gained during the game (actions, celebrations, sailing, etc.).': {
    vi: 'VP nhận trong ván (hành động, lễ hội, đi biển, v.v.).',
    en: 'VP gained during the game (actions, celebrations, sailing, etc.).',
  },
  'VP marker value before final scoring (income, contracts, energy rank, Bonus tiles).': {
    vi: 'Giá trị dấu VP trước tính điểm cuối (thu nhập, hợp đồng, thứ hạng năng lượng, ô thưởng).',
    en: 'VP marker value before final scoring (income, contracts, energy rank, Bonus tiles).',
  },
  'VP marker value before final scoring (round scoring, innovations, cities, etc.).': {
    vi: 'Giá trị dấu VP trước tính điểm cuối (điểm vòng, đổi mới, thành phố, v.v.).',
    en: 'VP marker value before final scoring (round scoring, innovations, cities, etc.).',
  },
  'VP of the highest threshold reached on the Reputation Track.': {
    vi: 'VP của ngưỡng cao nhất đạt được trên Reputation Track.',
    en: 'VP of the highest threshold reached on the Reputation Track.',
  },
  'VP of the rightmost empty column in the Development area.': {
    vi: 'VP của cột trống ngoài cùng bên phải trong khu Development.',
    en: 'VP of the rightmost empty column in the Development area.',
  },
  'VP on claimed big and small Lifeform Objective tiles.': {
    vi: 'VP trên các ô Lifeform Objective lớn và nhỏ đã nhận.',
    en: 'VP on claimed big and small Lifeform Objective tiles.',
  },
  'VP on flipped side; Praha buildings double. Include Government buildings (count matching type tiles in same network, energized or not, any owner).':
    {
      vi: 'VP ở mặt đã lật; công trình Praha được nhân đôi. Tính cả công trình Government (đếm ô cùng loại trong cùng mạng, có điện hay không, bất kể chủ sở hữu).',
      en: 'VP on flipped side; Praha buildings double. Include Government buildings (count matching type tiles in same network, energized or not, any owner).',
    },
  'VP per donation disc (max 12 each, some bonuses raise it).': {
    vi: 'VP mỗi đĩa quyên góp (tối đa 12 mỗi đĩa; một số thưởng làm tăng giới hạn).',
    en: 'VP per donation disc (max 12 each, some bonuses raise it).',
  },
  'VP printed on each built Ship Segment.': {
    vi: 'VP in trên mỗi Ship Segment đã xây.',
    en: 'VP printed on each built Ship Segment.',
  },
  'VP printed on the space your Beijing post occupies (0 if none).': {
    vi: 'VP in trên ô có trạm Beijing của bạn (0 nếu không có).',
    en: 'VP printed on the space your Beijing post occupies (0 if none).',
  },
  'VP unlocked by your discs on city crests (negative allowed, e.g. -6 for Kansas City disc).': {
    vi: 'VP mở khóa bởi đĩa của bạn trên huy hiệu thành phố (có thể âm, ví dụ -6 với đĩa Kansas City).',
    en: 'VP unlocked by your discs on city crests (negative allowed, e.g. -6 for Kansas City disc).',
  },
  'VP value of the highest space your expertise dial reached.': {
    vi: 'Giá trị VP của ô cao nhất mà thước expertise của bạn đạt được.',
    en: 'VP value of the highest space your expertise dial reached.',
  },
  'VP value of the highest space your reputation dial reached.': {
    vi: 'Giá trị VP của ô cao nhất mà thước reputation của bạn đạt được.',
    en: 'VP value of the highest space your reputation dial reached.',
  },
  'Wealth on the Escort Bonus token if you have the most Overseers at the Caravanserai (enter 0 / 2 / 4 as shown).':
    {
      vi: 'Wealth trên token Escort Bonus nếu bạn có nhiều Overseer nhất tại Caravanserai (nhập 0 / 2 / 4 như trên token).',
      en: 'Wealth on the Escort Bonus token if you have the most Overseers at the Caravanserai (enter 0 / 2 / 4 as shown).',
    },
  'Win by cracking 3 vaults before tripping 3 alarms': {
    vi: 'Thắng khi mở được 3 két trước khi kích hoạt 3 báo động.',
    en: 'Win by cracking 3 vaults before tripping 3 alarms',
  },
};

const templateInputCopy: ScoreTranslationMap = {
  ads: { vi: 'Quảng cáo', en: 'Ads' },
  agendaCards: { vi: 'Thẻ Agenda', en: 'Agenda cards' },
  ai: { vi: 'AI', en: 'AI' },
  american: { vi: 'American', en: 'American' },
  apprentices: { vi: 'Người học việc', en: 'Apprentices' },
  area: { vi: 'Khu vực', en: 'Area' },
  blue: { vi: 'Xanh dương', en: 'Blue' },
  blueprints: { vi: 'Bản thiết kế', en: 'Blueprints' },
  breedingTrack: { vi: 'Track sinh sản', en: 'Breeding track' },
  brick: { vi: 'Gạch', en: 'Brick' },
  buildingConservation: { vi: 'Bảo tồn công trình', en: 'Building conservation' },
  buildingPopularity: { vi: 'Độ phổ biến công trình', en: 'Building popularity' },
  cards: { vi: 'Thẻ', en: 'Cards' },
  cash: { vi: 'Tiền mặt', en: 'Cash' },
  cloth: { vi: 'Vải', en: 'Cloth' },
  colonists: { vi: 'Người khai hoang', en: 'Colonists' },
  commodities: { vi: 'Hàng hóa', en: 'Commodities' },
  computer: { vi: 'Máy tính', en: 'Computer' },
  conservation: { vi: 'Bảo tồn', en: 'Conservation' },
  continental: { vi: 'Continental', en: 'Continental' },
  credits: { vi: 'Tín dụng', en: 'Credits' },
  cubes: { vi: 'Khối', en: 'Cubes' },
  darkGreenSpecies: { vi: 'Loài xanh lá đậm', en: 'Dark green species' },
  destinations: { vi: 'Điểm đến', en: 'Destinations' },
  discFour: { vi: 'Đĩa 4', en: 'Disc 4' },
  discOne: { vi: 'Đĩa 1', en: 'Disc 1' },
  discThree: { vi: 'Đĩa 3', en: 'Disc 3' },
  discTwo: { vi: 'Đĩa 2', en: 'Disc 2' },
  dockWorkers: { vi: 'Công nhân bến cảng', en: 'Dock workers' },
  economy: { vi: 'Kinh tế', en: 'Economy' },
  enclosureEggs: { vi: 'Trứng trong chuồng', en: 'Eggs in enclosures' },
  endCards: { vi: 'Thẻ cuối ván', en: 'End-game cards' },
  energy: { vi: 'Năng lượng', en: 'Energy' },
  entropy: { vi: 'Entropy', en: 'Entropy' },
  equalTrackFirst: { vi: 'Hòa: track cao hơn thắng', en: 'Tie: higher track wins' },
  excavators: { vi: 'Máy xúc', en: 'Excavators' },
  favorCards: { vi: 'Thẻ Favor', en: 'Favor cards' },
  festival: { vi: 'Festival', en: 'Festival' },
  fives: { vi: 'Thẻ Number 5', en: 'Number 5 cards' },
  food: { vi: 'Thức ăn', en: 'Food' },
  gaiaforming: { vi: 'Gaiaforming', en: 'Gaiaforming' },
  gold: { vi: 'Vàng', en: 'Gold' },
  goldCorrect: { vi: 'Dấu vàng đúng', en: 'Correct gold seals' },
  goodTypes: { vi: 'Loại hàng hóa', en: 'Types of goods' },
  greenSpecies: { vi: 'Loài xanh lá', en: 'Green species' },
  gulden: { vi: 'Gulden', en: 'Gulden' },
  headAlive: { vi: 'Đầu còn sống', en: 'Head alive' },
  headVp: { vi: 'VP phần đầu', en: 'Head VP' },
  houses: { vi: 'Nhà', en: 'Houses' },
  imperial: { vi: 'Imperial', en: 'Imperial' },
  inspiration: { vi: 'Cảm hứng', en: 'Inspiration' },
  knowledge: { vi: 'Tri thức', en: 'Knowledge' },
  landers: { vi: 'Tàu đổ bộ', en: 'Landers' },
  leftArmAlive: { vi: 'Tay trái còn sống', en: 'Left arm alive' },
  leftArmVp: { vi: 'VP tay trái', en: 'Left arm VP' },
  leftLegAlive: { vi: 'Chân trái còn sống', en: 'Left leg alive' },
  leftLegVp: { vi: 'VP chân trái', en: 'Left leg VP' },
  level: { vi: 'Cấp', en: 'Level' },
  lifeCards: { vi: 'Thẻ Life', en: 'Life cards' },
  luxor: { vi: 'Luxor', en: 'Luxor' },
  mass: { vi: 'Mass', en: 'Mass' },
  materials: { vi: 'Vật liệu', en: 'Materials' },
  missions: { vi: 'Nhiệm vụ', en: 'Missions' },
  mixers: { vi: 'Máy trộn bê tông', en: 'Concrete mixers' },
  money: { vi: 'Tiền', en: 'Money' },
  mostReputation: { vi: 'Danh tiếng cao nhất', en: 'Most reputation' },
  multiplier: { vi: 'Hệ số', en: 'Multiplier' },
  navigation: { vi: 'Điều hướng', en: 'Navigation' },
  normalCount: { vi: 'Số lượng thường', en: 'Normal count' },
  normalRate: { vi: 'Tỷ lệ thường', en: 'Normal rate' },
  normalVp: { vi: 'VP thường', en: 'Normal VP' },
  offspring: { vi: 'Con non', en: 'Offspring' },
  ones: { vi: 'Thẻ Number 1', en: 'Number 1 cards' },
  orbiters: { vi: 'Tàu quỹ đạo', en: 'Orbiters' },
  ore: { vi: 'Quặng', en: 'Ore' },
  parkPoints: { vi: 'Điểm công viên', en: 'Park points' },
  perSet: { vi: 'Mỗi bộ', en: 'Per set' },
  popularity: { vi: 'Độ phổ biến', en: 'Popularity' },
  prahaCount: { vi: 'Số lượng Praha', en: 'Praha count' },
  prahaRate: { vi: 'Tỷ lệ Praha', en: 'Praha rate' },
  prahaVp: { vi: 'VP Praha', en: 'Praha VP' },
  probe: { vi: 'Tàu thăm dò', en: 'Probe' },
  provinces: { vi: 'Tỉnh', en: 'Provinces' },
  quantity: { vi: 'Số lượng', en: 'Quantity' },
  rate: { vi: 'Tỷ lệ', en: 'Rate' },
  red: { vi: 'Đỏ', en: 'Red' },
  resources: { vi: 'Tài nguyên', en: 'Resources' },
  rightArmAlive: { vi: 'Tay phải còn sống', en: 'Right arm alive' },
  rightArmVp: { vi: 'VP tay phải', en: 'Right arm VP' },
  rightLegAlive: { vi: 'Chân phải còn sống', en: 'Right leg alive' },
  rightLegVp: { vi: 'VP chân phải', en: 'Right leg VP' },
  science: { vi: 'Khoa học', en: 'Science' },
  sestertii: { vi: 'Sestertius', en: 'Sestertii' },
  sets: { vi: 'Số bộ', en: 'Sets' },
  silverCorrect: { vi: 'Dấu bạc đúng', en: 'Correct silver seals' },
  techs: { vi: 'Công nghệ', en: 'Technologies' },
  telescope: { vi: 'Kính thiên văn', en: 'Telescope' },
  terraforming: { vi: 'Cải tạo địa hình', en: 'Terraforming' },
  tool: { vi: 'Công cụ', en: 'Tool' },
  torsoAlive: { vi: 'Thân còn sống', en: 'Torso alive' },
  torsoVp: { vi: 'VP phần thân', en: 'Torso VP' },
  tower: { vi: 'Tower', en: 'Tower' },
  valuePerSet: { vi: 'Điểm mỗi bộ', en: 'Value per set' },
  vivariumSections: { vi: 'Khu Vivarium', en: 'Vivarium sections' },
  wine: { vi: 'Rượu', en: 'Wine' },
  wings: { vi: 'Wings', en: 'Wings' },
  wins: { vi: 'Số ván thắng', en: 'Wins' },
  worldwide: { vi: 'Worldwide', en: 'Worldwide' },
  wrongStarred: { vi: 'Dấu có sao sai', en: 'Wrong starred seals' },
  wrongUnhedged: { vi: 'Dấu sai không phòng hộ', en: 'Wrong unhedged seals' },
  yellow: { vi: 'Vàng', en: 'Yellow' },
  yellowSpecies: { vi: 'Loài vàng', en: 'Yellow species' },
};

for (let index = 1; index <= 20; index += 1) {
  templateInputCopy[`settlements${index}`] = {
    vi: `Định cư ${index}`,
    en: `Settlement ${index}`,
  };
  templateInputCopy[`spirits${index}`] = {
    vi: `Spirit ${index}`,
    en: `Spirit ${index}`,
  };
}

const vietnameseSourceCopy: ScoreTranslationMap = Object.fromEntries(
  Object.entries(vietnameseCopy).map(([vi, en]) => [vi, { vi, en }]),
);

const applejackHarmoniesCopy: ScoreTranslationMap = {
  'Count only this variety. Subtract 3 separately from each connected area, minimum 0, then add the honey from those areas. Enter honey BEFORE doubling, not the number of apples; doubled automatically.':
    {
      vi: 'Chỉ tính giống táo này. Trừ 3 riêng mỗi vùng liên thông, lấy tối thiểu 0 rồi cộng mật ong từ các vùng. Nhập mật ong TRƯỚC nhân đôi, không nhập số táo; app tự nhân đôi.',
      en: 'Count only this variety. Subtract 3 separately from each connected area, minimum 0, then add the honey from those areas. Enter honey BEFORE doubling, not the number of apples; doubled automatically.',
    },
  'Automatically counts varieties whose final harvest yields at least 1 honey before doubling. Each variety counts once, even with multiple areas.':
    {
      vi: 'Tự đếm các giống thu hoạch được ít nhất 1 mật ong trước nhân đôi. Mỗi giống chỉ tính một lần, dù có nhiều vùng.',
      en: 'Automatically counts varieties whose final harvest yields at least 1 honey before doubling. Each variety counts once, even with multiple areas.',
    },
  'Automatically scores 4/5/6/7 profitable varieties as 4/11/21/35 honey; 0–3 varieties score 0. This bonus is not doubled.':
    {
      vi: 'Tự tính thưởng 4/5/6/7 giống có lãi thành 4/11/21/35 mật ong; 0–3 giống được 0. Phần thưởng này không nhân đôi.',
      en: 'Automatically scores 4/5/6/7 profitable varieties as 4/11/21/35 honey; 0–3 varieties score 0. This bonus is not doubled.',
    },
  '1 honey per blossom on your tree tiles (last blossom scoring).': {
    vi: 'Mỗi hoa trên các ô cây của bạn được 1 mật ong ở lần tính hoa cuối.',
    en: '1 honey per blossom on your tree tiles (last blossom scoring).',
  },
  'Add all honey you still hold.': {
    vi: 'Cộng toàn bộ mật ong còn trong kho của bạn.',
    en: 'Add all honey you still hold.',
  },
  'No tiebreaker: tied players all win.': {
    vi: 'Không phân định hòa: những người bằng điểm cao nhất cùng thắng.',
    en: 'No tiebreaker: tied players all win.',
  },
  'Everyone must use the same side. 0 = side A (river, default); 1 = side B (islands). This choice does not add points.':
    {
      vi: 'Tất cả người chơi dùng cùng một mặt. 0 = mặt A (sông, mặc định); 1 = mặt B (đảo). Lựa chọn này không cộng điểm.',
      en: 'Everyone must use the same side. 0 = side A (river, default); 1 = side B (islands). This choice does not add points.',
    },
  'Count trees by height: green on 0 brown = 1, on 1 brown = 3, on 2 brown = 7. Brown-only stacks score 0.':
    {
      vi: 'Đếm cây theo độ cao: xanh trên 0/1/2 nâu lần lượt được 1/3/7 điểm. Cọc chỉ có nâu được 0.',
      en: 'Count trees by height: green on 0 brown = 1, on 1 brown = 3, on 2 brown = 7. Brown-only stacks score 0.',
    },
  'Gray stacks adjacent to another mountain: height 1 = 1, height 2 = 3, height 3 = 7. Isolated mountain = 0.':
    {
      vi: 'Núi xám kề ít nhất một núi khác: cao 1/2/3 lần lượt được 1/3/7 điểm. Núi cô lập được 0.',
      en: 'Gray stacks adjacent to another mountain: height 1 = 1, height 2 = 3, height 3 = 7. Isolated mountain = 0.',
    },
  "Each contiguous group of 2+ yellow tokens = 5 points (size doesn't matter).": {
    vi: 'Mỗi nhóm vàng liên thông từ 2 ô trở lên được 5 điểm, không phụ thuộc kích thước nhóm.',
    en: "Each contiguous group of 2+ yellow tokens = 5 points (size doesn't matter).",
  },
  '5 points per building (red on top of brown/grey/red) with top tokens of at least 3 different colours around it, else 0.':
    {
      vi: 'Mỗi nhà (đỏ trên nâu/xám/đỏ) được 5 điểm nếu token trên cùng của các ô kề có ít nhất 3 màu khác nhau; nếu không được 0.',
      en: '5 points per building (red on top of brown/grey/red) with top tokens of at least 3 different colours around it, else 0.',
    },
  'Side A only. Count both ends of the best river along its shortest path: 1 token = 0 points; 2/3/4/5/6 = 2/5/8/11/15, then +4 for each token beyond 6.':
    {
      vi: 'Chỉ mặt A. Đếm sông tốt nhất theo đường ngắn nhất, tính cả hai đầu: 1 ô = 0 điểm; 2/3/4/5/6 ô = 2/5/8/11/15 điểm; sau ô thứ 6 mỗi ô thêm 4 điểm.',
      en: 'Side A only. Count both ends of the best river along its shortest path: 1 token = 0 points; 2/3/4/5/6 = 2/5/8/11/15, then +4 for each token beyond 6.',
    },
  'Side B only. 5 points per island; there is always at least 1, even with no blue tokens. Defaults to 1 island until entered.':
    {
      vi: 'Chỉ mặt B. Mỗi đảo được 5 điểm; luôn có ít nhất 1 đảo, kể cả không có token xanh nước. Mặc định 1 đảo khi chưa nhập.',
      en: 'Side B only. 5 points per island; there is always at least 1, even with no blue tokens. Defaults to 1 island until entered.',
    },
  'Per card (completed or not): value of the topmost space not covered by a cube; a card with all cubes still on it = 0.':
    {
      vi: 'Mỗi thẻ, kể cả đã hoàn thành: đọc giá trị ô điểm trên cùng chưa bị khối che. Thẻ còn nguyên tất cả khối được 0.',
      en: 'Per card (completed or not): value of the topmost space not covered by a cube; a card with all cubes still on it = 0.',
    },
  'Only if used and its cube was placed; value per card text, in addition to normal landscape points.':
    {
      vi: 'Chỉ khi có dùng và đã đặt khối theo luật: nhập điểm theo thẻ, cộng thêm vào điểm cảnh quan thông thường.',
      en: 'Only if used and its cube was placed; value per card text, in addition to normal landscape points.',
    },
  'Only Animal cubes placed on your Personal board; exclude the Nature’s Spirit cube. Used to break equal totals and never added to points.':
    {
      vi: 'Chỉ đếm khối động vật đã đặt trên bàn cá nhân, không tính khối Nature’s Spirit. Chỉ phân định hòa tổng điểm, không cộng vào điểm.',
      en: 'Only Animal cubes placed on your Personal board; exclude the Nature’s Spirit cube. Used to break equal totals and never added to points.',
    },
  'Most Animal cubes placed on the Personal board': {
    vi: 'Hòa tổng điểm: người đặt nhiều khối động vật trên bàn cá nhân hơn thắng.',
    en: 'Most Animal cubes placed on the Personal board',
  },
  'If still tied, players share the victory.': {
    vi: 'Nếu vẫn hòa, các người chơi cùng thắng.',
    en: 'If still tied, players share the victory.',
  },
  height1: { vi: 'Cao 1', en: 'Height 1' },
  height2: { vi: 'Cao 2', en: 'Height 2' },
  height3: { vi: 'Cao 3', en: 'Height 3' },
};

export const scoreUiTranslations: ScoreTranslationMap = {
  ...vietnameseSourceCopy,
  ...englishSourceCopy,
  ...templateInputCopy,
  ...applejackHarmoniesCopy,
  '· {points} {unit}': {
    vi: '· {points} {unit}',
    en: '· {points} {unit}',
  },
  '{guestCount} khách sẽ thấy khi nhận hồ sơ': {
    vi: '{guestCount} khách sẽ thấy khi nhận hồ sơ',
    en: '{guestCount} guests will see it when they claim their profile',
  },
  'Đã đạt tối đa {max} người chơi.': {
    vi: 'Đã đạt tối đa {max} người chơi.',
    en: 'Maximum of {max} players reached.',
  },
  'Đã lưu vào lịch sử của {memberCount} người': {
    vi: 'Đã lưu vào lịch sử của {memberCount} người',
    en: 'Saved to the history of {memberCount} members',
  },
  'Đang đồng bộ {unsynced} thay đổi...': {
    vi: 'Đang đồng bộ {unsynced} thay đổi...',
    en: 'Syncing {unsynced} changes...',
  },
  'Đang dẫn: {winnerText}': {
    vi: 'Đang dẫn: {winnerText}',
    en: 'Currently leading: {winnerText}',
  },
  'Đã đạt mốc {target} · Người thắng: {winnerText}': {
    vi: 'Đã đạt mốc {target} · Người thắng: {winnerText}',
    en: 'Target of {target} reached · Winner: {winnerText}',
  },
  'Gửi link này cho khách: {url}': {
    vi: 'Gửi link này cho khách: {url}',
    en: 'Send this link to the guest: {url}',
  },
  'Hòa điểm cao nhất: {names} cùng thắng.': {
    vi: 'Hòa điểm cao nhất: {names} cùng thắng.',
    en: 'Tie for highest score: {names} share the win.',
  },
  'Hòa điểm cao nhất: {names}. Xem ghi chú luật bên dưới.': {
    vi: 'Hòa điểm cao nhất: {names}. Xem ghi chú luật bên dưới.',
    en: 'Tie for highest score: {names}. See the rules note below.',
  },
  'Chọn nhân vật cho {name}.': {
    vi: 'Chọn nhân vật cho {name}.',
    en: 'Choose a character for {name}.',
  },
  'Chọn Thắng/Thua cho {name}.': {
    vi: 'Chọn Thắng/Thua cho {name}.',
    en: 'Choose Win/Loss for {name}.',
  },
  'Nhân đôi chất lượng món {course}; sao cuối được tính tự động.': {
    vi: 'Nhân đôi chất lượng món {course}; sao cuối được tính tự động.',
    en: 'Double the quality of the {course} dish; final stars are calculated automatically.',
  },
  'Người chơi {seat}': { vi: 'Người chơi {seat}', en: 'Player {seat}' },
  'Thêm gia vị {spice}': { vi: 'Thêm gia vị {spice}', en: 'Add {spice} spice' },
  'Thêm 1 gia vị {spice}': { vi: 'Thêm 1 gia vị {spice}', en: 'Add 1 {spice} spice' },
  'Gia vị {spice}': { vi: 'Gia vị {spice}', en: '{spice} spice' },
  'Gia vị {spice} còn thừa': { vi: 'Gia vị {spice} còn thừa', en: 'Leftover {spice} spice' },
  'Rượu ghép {value}': { vi: 'Rượu ghép {value}', en: 'Paired wine {value}' },
  '{ingredient} {value}': { vi: '{ingredient} {value}', en: '{ingredient} {value}' },
  '{ingredient} {value} còn thừa': {
    vi: '{ingredient} {value} còn thừa',
    en: 'Leftover {ingredient} {value}',
  },
  '{label} · chưa hỗ trợ': { vi: '{label} · chưa hỗ trợ', en: '{label} · not supported' },
  '{label}, phòng {room}': { vi: '{label}, phòng {room}', en: '{label}, room {room}' },
  'Xóa {name}': { vi: 'Xóa {name}', en: 'Remove {name}' },
  '· mốc kết thúc {target}': { vi: '· mốc kết thúc {target}', en: '· target: {target}' },
  '· {roundLimit} vòng': { vi: '· {roundLimit} vòng', en: '· {roundLimit} rounds' },
  '= {points} điểm': { vi: '= {points} điểm', en: '= {points} points' },
  'Đang dẫn: {names}': { vi: 'Đang dẫn: {names}', en: 'Currently leading: {names}' },
  'Đạt tối đa {max} người chơi.': {
    vi: 'Đạt tối đa {max} người chơi.',
    en: 'Maximum of {max} players reached.',
  },
  'Cần ít nhất {min} người chơi.': {
    vi: 'Cần ít nhất {min} người chơi.',
    en: 'At least {min} players are required.',
  },
  '{count} người đã xếp bàn': {
    vi: '{count} người đã xếp bàn',
    en: '{count} people have joined the table',
  },
  'Máy chủ chưa gắn mẫu điểm có thể dùng cho {title}.': {
    vi: 'Máy chủ chưa gắn mẫu điểm có thể dùng cho {title}.',
    en: 'The server has no scoring template available for {title}.',
  },
  'VP mỗi cái = {count}': { vi: 'VP mỗi cái = {count}', en: 'VP per item = {count}' },
  'Tổng điểm: {points}': { vi: 'Tổng điểm: {points}', en: 'Total points: {points}' },
  'Mỗi người chơi {name}': { vi: 'Mỗi người chơi {name}', en: 'Each player: {name}' },
  'Không thể hoàn tất thao tác tính điểm. Hãy kiểm tra dữ liệu rồi thử lại.': {
    vi: 'Không thể hoàn tất thao tác tính điểm. Hãy kiểm tra dữ liệu rồi thử lại.',
    en: 'Could not complete this scoring action. Check the data and try again.',
  },
  'The Mouse': { vi: 'Chuột', en: 'The Mouse' },
  'The Cow': { vi: 'Bò', en: 'The Cow' },
  'The Rabbit': { vi: 'Thỏ', en: 'The Rabbit' },
  'The Kangaroo': { vi: 'Chuột túi', en: 'The Kangaroo' },
  'The Capybara': { vi: 'Chuột lang nước', en: 'The Capybara' },
  'The Badger': { vi: 'Lửng', en: 'The Badger' },
  'The Fruit Bat': { vi: 'Dơi ăn quả', en: 'The Fruit Bat' },
  'The Jerboa': { vi: 'Chuột nhảy', en: 'The Jerboa' },
  'The Poodle': { vi: 'Chó Poodle', en: 'The Poodle' },
  'The Raccoon': { vi: 'Gấu mèo', en: 'The Raccoon' },
  'The Saint Bernard': { vi: 'Chó Saint Bernard', en: 'The Saint Bernard' },
  'The Tree Shrew': { vi: 'Sóc chuột', en: 'The Tree Shrew' },
  'The Pig': { vi: 'Lợn', en: 'The Pig' },
  'Bread Fanatic': { vi: 'Cuồng bánh mì', en: 'Bread Fanatic' },
  'Carrot Fanatic': { vi: 'Cuồng cà rốt', en: 'Carrot Fanatic' },
  'Cheese Fanatic': { vi: 'Cuồng phô mai', en: 'Cheese Fanatic' },
  'Fish Fanatic': { vi: 'Cuồng cá', en: 'Fish Fanatic' },
  'Meat Fanatic': { vi: 'Cuồng thịt', en: 'Meat Fanatic' },
  'Mushroom Fanatic': { vi: 'Cuồng nấm', en: 'Mushroom Fanatic' },
  'Wine Fanatic': { vi: 'Cuồng rượu vang', en: 'Wine Fanatic' },
  'Extremely Pampered': { vi: 'Được nuông chiều hết mực', en: 'Extremely Pampered' },
  Hibernator: { vi: 'Kẻ ngủ đông', en: 'Hibernator' },
  'Psychedelic Flavor': { vi: 'Hương vị ảo giác', en: 'Psychedelic Flavor' },
  'Spice Lover': { vi: 'Người mê gia vị', en: 'Spice Lover' },
  Tender: { vi: 'Mềm mại', en: 'Tender' },
  'Big Cheese': { vi: 'Phô mai đại gia', en: 'Big Cheese' },
  'Big Dipper': { vi: 'Gáo lớn', en: 'Big Dipper' },
  'Odd Tastes': { vi: 'Khẩu vị kỳ lạ', en: 'Odd Tastes' },
  'Simple Palate': { vi: 'Khẩu vị giản đơn', en: 'Simple Palate' },
  'Subtle Flavors': { vi: 'Hương vị tinh tế', en: 'Subtle Flavors' },
  'Super Chatty': { vi: 'Nói nhiều không ngớt', en: 'Super Chatty' },
  'To Go': { vi: 'Mang đi', en: 'To Go' },
  'Wine Cellar': { vi: 'Hầm rượu vang', en: 'Wine Cellar' },
  Mercurial: { vi: 'Thất thường', en: 'Mercurial' },
  Nocturnal: { vi: 'Hoạt động về đêm', en: 'Nocturnal' },
  Picky: { vi: 'Kén chọn', en: 'Picky' },
  Shortsighted: { vi: 'Thiển cận', en: 'Shortsighted' },
  Sommelier: { vi: 'Chuyên gia thử rượu', en: 'Sommelier' },
  Unsophisticated: { vi: 'Không cầu kỳ', en: 'Unsophisticated' },
  'Varied Leftovers': { vi: 'Đồ thừa đa dạng', en: 'Varied Leftovers' },
  'Varied Servings': { vi: 'Khẩu phần đa dạng', en: 'Varied Servings' },
  Coffee: { vi: 'Cà phê', en: 'Coffee' },
  Dumplings: { vi: 'Bánh bao', en: 'Dumplings' },
  Flowers: { vi: 'Hoa', en: 'Flowers' },
  'Food Drive': { vi: 'Quyên góp thực phẩm', en: 'Food Drive' },
  Gelato: { vi: 'Gelato', en: 'Gelato' },
  'Gold Coins': { vi: 'Đồng vàng', en: 'Gold Coins' },
  Newspapers: { vi: 'Báo chí', en: 'Newspapers' },
  Sauces: { vi: 'Nước sốt', en: 'Sauces' },
  'Anthony Boardain': { vi: 'Anthony Boardain', en: 'Anthony Boardain' },
  'Bobcat Flay': { vi: 'Bobcat Flay', en: 'Bobcat Flay' },
  'Falcon Brown': { vi: 'Falcon Brown', en: 'Falcon Brown' },
  "Goat'N Ramsay": { vi: "Goat'N Ramsay", en: "Goat'N Ramsay" },
  'Graham Elephant': { vi: 'Graham Elephant', en: 'Graham Elephant' },
  'Herón Sanchez': { vi: 'Herón Sanchez', en: 'Herón Sanchez' },
  'Jamie Owliver': { vi: 'Jamie Owliver', en: 'Jamie Owliver' },
  'Julia Wild': { vi: 'Julia Wild', en: 'Julia Wild' },
  'Marcus Roostersson': { vi: 'Marcus Roostersson', en: 'Marcus Roostersson' },
  'Martha Shrewart': { vi: 'Martha Shrewart', en: 'Martha Shrewart' },
};
