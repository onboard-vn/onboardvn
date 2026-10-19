import type { GameGuide } from './types';

export const strategyGuides: Record<string, GameGuide> = {
  'agricola-2007': {
    edition: 'Agricola Revised 2016',
    summary: 'Nhập số lượng trên nông trại; app tự đổi ra điểm theo bảng.',
    groups: [
      {
        title: 'Đất và chuồng',
        icon: '🌾',
        fields: [
          {
            key: 'fields',
            icon: '🌾',
            hint: 'Chỉ đếm ô ruộng trên bàn; không đếm thẻ bài làm ruộng.',
          },
          {
            key: 'pastures',
            icon: '🟩',
            hint: 'Đếm khu rào kín, không đếm số ô trong rào.',
          },
          {
            key: 'unusedSpaces',
            icon: '⬜',
          },
          {
            key: 'fencedStables',
            icon: '🏠',
            hint: 'Chỉ chuồng trong rào được cộng 1 VP; chuồng ngoài rào chỉ giúp ô được sử dụng.',
          },
        ],
      },
      {
        title: 'Nông sản và vật nuôi',
        icon: '🐑',
        fields: [
          {
            key: 'grain',
            icon: '🌾',
          },
          {
            key: 'vegetables',
            icon: '🥕',
          },
          {
            key: 'sheep',
            icon: '🐑',
          },
          {
            key: 'wildBoar',
            icon: '🐗',
          },
          {
            key: 'cattle',
            icon: '🐄',
          },
        ],
        hint: 'Tính cả nông sản đã gieo và tài sản trên thẻ đủ điều kiện; không tính phần thưởng chưa nhận.',
      },
      {
        title: 'Nhà và gia đình',
        icon: '🏡',
        fields: [
          {
            key: 'clayRooms',
            icon: '🧱',
          },
          {
            key: 'stoneRooms',
            icon: '🪨',
          },
          {
            key: 'familyMembers',
            icon: '👪',
          },
        ],
      },
      {
        title: 'Thẻ và phân định hòa',
        icon: '🃏',
        fields: [
          {
            key: 'cardPoints',
            icon: '🃏',
            manualPoints: true,
            hint: 'Tổng VP in trên cải tiến đang ngửa trước mặt.',
          },
          {
            key: 'bonusPoints',
            icon: '⭐',
            manualPoints: true,
            hint: 'Điểm theo nội dung thẻ, không nhập lại VP đã tính ở dòng cải tiến.',
          },
          {
            key: 'beggingCards',
            icon: '🍲',
          },
          {
            key: 'buildingResources',
            icon: '🪵',
            hint: 'Tổng gỗ, đất sét, sậy, đá còn trong kho; chỉ phân định hòa, không cộng VP.',
          },
        ],
      },
    ],
    sources: [
      'https://www.lookout-spiele.de/upload/en_agricolare.html_Rules_Agricola-RE_EN.pdf',
      'https://www.lookout-spiele.de/upload/de_15jahreagricolajubilaeumsbox.html_Argicola_Aniversery_Appendix_155_EN_WEB.pdf',
    ],
    limitations: ['Bản gốc 2007, chiến dịch solo và ngoại lệ mở rộng chưa tự động hóa.'],
    minTemplateVersion: 3,
    requiredKeys: ['buildingResources'],
  },
  'agricola-15-2022': {
    edition: 'Agricola 15 (2022)',
    summary: 'Nhập số lượng trên nông trại; app tự đổi ra điểm theo bảng.',
    groups: [
      {
        title: 'Đất và chuồng',
        icon: '🌾',
        fields: [
          {
            key: 'fields',
            icon: '🌾',
            hint: 'Chỉ đếm ô ruộng trên bàn; không đếm thẻ bài làm ruộng.',
          },
          {
            key: 'pastures',
            icon: '🟩',
            hint: 'Đếm khu rào kín, không đếm số ô trong rào.',
          },
          {
            key: 'unusedSpaces',
            icon: '⬜',
          },
          {
            key: 'fencedStables',
            icon: '🏠',
            hint: 'Chỉ chuồng trong rào được cộng 1 VP; chuồng ngoài rào chỉ giúp ô được sử dụng.',
          },
        ],
      },
      {
        title: 'Nông sản và vật nuôi',
        icon: '🐑',
        fields: [
          {
            key: 'grain',
            icon: '🌾',
          },
          {
            key: 'vegetables',
            icon: '🥕',
          },
          {
            key: 'sheep',
            icon: '🐑',
          },
          {
            key: 'wildBoar',
            icon: '🐗',
          },
          {
            key: 'cattle',
            icon: '🐄',
          },
        ],
        hint: 'Tính cả nông sản đã gieo và tài sản trên thẻ đủ điều kiện; không tính phần thưởng chưa nhận.',
      },
      {
        title: 'Nhà và gia đình',
        icon: '🏡',
        fields: [
          {
            key: 'clayRooms',
            icon: '🧱',
          },
          {
            key: 'stoneRooms',
            icon: '🪨',
          },
          {
            key: 'familyMembers',
            icon: '👪',
          },
        ],
      },
      {
        title: 'Thẻ và phân định hòa',
        icon: '🃏',
        fields: [
          {
            key: 'cardPoints',
            icon: '🃏',
            manualPoints: true,
            hint: 'Tổng VP in trên cải tiến đang ngửa trước mặt.',
          },
          {
            key: 'bonusPoints',
            icon: '⭐',
            manualPoints: true,
            hint: 'Điểm theo nội dung thẻ, không nhập lại VP đã tính ở dòng cải tiến.',
          },
          {
            key: 'beggingCards',
            icon: '🍲',
          },
          {
            key: 'buildingResources',
            icon: '🪵',
            hint: 'Tổng gỗ, đất sét, sậy, đá còn trong kho; chỉ phân định hòa, không cộng VP.',
          },
        ],
      },
    ],
    sources: [
      'https://www.lookout-spiele.de/upload/en_agricolare.html_Rules_Agricola-RE_EN.pdf',
      'https://www.lookout-spiele.de/upload/de_15jahreagricolajubilaeumsbox.html_Argicola_Aniversery_Appendix_155_EN_WEB.pdf',
    ],
    limitations: ['Bản gốc 2007, chiến dịch solo và ngoại lệ mở rộng chưa tự động hóa.'],
    minTemplateVersion: 3,
    requiredKeys: ['buildingResources'],
  },
  amsterdam: {
    edition: 'Queen Games — bản cơ bản',
    summary: 'Nhập huy hiệu và tài nguyên còn lại; điểm thẻ/khu phố nhập theo VP đã tính.',
    groups: [
      {
        title: 'Điểm và thẻ phạt',
        icon: '🚣',
        fields: [
          {
            key: 'trackScore',
            icon: '🏁',
          },
          {
            key: 'penaltyTokens',
            icon: '⚠️',
            hint: 'Gồm 1 token cho mỗi thẻ còn dưới bảng. Tổng phạt:1→−3;2→−8;3→−15;4→−22.',
          },
          {
            key: 'endCards',
            icon: '🃏',
            manualPoints: true,
          },
        ],
      },
      {
        title: 'Thành phố',
        icon: '🏙️',
        fields: [
          {
            key: 'cityCrests',
            icon: '🛡️',
          },
          {
            key: 'districts',
            icon: '🏘️',
            manualPoints: true,
            hint: 'Cộng VP từng khu đang ngửa. Hòa: gộp các vị trí rồi chia đều, làm tròn xuống.',
          },
          {
            key: 'amstelPosition',
            icon: '🚣',
            hint: 'Nhập thứ tự vị trí trên kênh; số lớn hơn là đi xa hơn. Không cộng VP.',
          },
        ],
      },
      {
        title: 'Thành phần còn lại',
        icon: '📦',
        fields: [
          {
            key: 'leftovers',
            icon: '📦',
            inputs: {
              commodities: 'Hàng hóa còn trên bảng',
              dockWorkers: 'Công nhân bến tàu còn lại',
              gulden: 'Gulden còn lại',
              resources: 'Tài nguyên còn lại',
            },
            hint: 'Gộp tất cả 4 loại; mỗi 2 thành phần được 1 VP.',
          },
        ],
      },
    ],
    sources: ['https://rules.queen-games.com/amsterdam_en.pdf'],
    limitations: [
      'Điểm từ thẻ và đa số khu phố vẫn do người chơi xác định.',
      'Mở rộng và soloTOM chưa tự động hóa.',
    ],
    minTemplateVersion: 3,
    requiredKeys: ['leftovers', 'amstelPosition'],
  },
  'terra-mystica': {
    edition: 'Terra Mystica — cơ bản, luậtENv 3',
    summary: 'Nhập vị trí 4 giáo phái, số công trình liên kết và xu sau quy đổi.',
    groups: [
      {
        title: 'Điểm trong ván',
        icon: '🏁',
        fields: [
          {
            key: 'trackVp',
            icon: '🏁',
          },
        ],
      },
      {
        title: 'Giáo phái',
        icon: '🔥',
        fields: [
          {
            key: 'fireCult',
            icon: '🔥',
          },
          {
            key: 'waterCult',
            icon: '💧',
          },
          {
            key: 'earthCult',
            icon: '🌱',
          },
          {
            key: 'airCult',
            icon: '💨',
          },
        ],
        hint: 'Nhập vị trí, không nhập VP. Ô 0 không được điểm; hòa chia các hạng và làm tròn xuống.',
      },
      {
        title: 'Lãnh thổ và tài nguyên',
        icon: '🏘️',
        fields: [
          {
            key: 'network',
            icon: '🏘️',
            hint: 'Số công trình trong mạng lớn nhất; áp dụng kết nối hợp lệ của tộc.',
          },
          {
            key: 'alchemists',
            icon: '⚗️',
            label: 'Tộc Giả kim (Alchemists)',
          },
          {
            key: 'coins',
            icon: '🪙',
            hint: 'Xu sau quy đổi hợp lệ: Giả kim 2 xu/VP; tộc khác 3 xu/VP.',
          },
        ],
      },
    ],
    sources: [
      'https://www.feuerland-spiele.de/fileadmin/game/Terra_Mystica/Terra_Mystica_rules_EN_Web.pdf',
    ],
    limitations: [
      'Người chơi xác định kết nối, vận chuyển và quy đổi theo tộc.',
      'Mở rộng chưa tự động hóa.',
    ],
    minTemplateVersion: 3,
    requiredKeys: ['alchemists'],
  },
  'age-of-innovation': {
    edition: 'Age of Innovation 2023 — cơ bản',
    summary: 'Nhập số công trình và cấp ngành; ván 2 người cần các giá trị phe trung lập.',
    groups: [
      {
        title: 'Điểm và khu vực',
        icon: '🏘️',
        fields: [
          {
            key: 'trackVp',
            icon: '🏁',
          },
          {
            key: 'area',
            icon: '🏘️',
            hint: 'Số công trình trong nhóm lớn nhất có thể tiếp cận nhau; không nhập VP.',
          },
        ],
      },
      {
        title: 'Khoa học',
        icon: '📚',
        fields: [
          {
            key: 'discOne',
            icon: '🟨',
            label: 'Ngân hàng (vàng)',
          },
          {
            key: 'discTwo',
            icon: '🟦',
            label: 'Luật (xanh dương)',
          },
          {
            key: 'discThree',
            icon: '🟫',
            label: 'Y học (nâu)',
          },
          {
            key: 'discFour',
            icon: '⬜',
            label: 'Kỹ thuật (xám)',
          },
        ],
        hint: 'Nhập cấp 0–12. Thứ tự ômàu phải khớp bảng khoa học của ván.',
      },
      {
        title: 'Tài nguyên còn lại',
        icon: '🪙',
        fields: [
          {
            key: 'resources',
            icon: '🪙',
            hint: 'Nhập xu sau quy đổi hợp lệ;5 xu=1 VP.',
          },
        ],
      },
      {
        title: 'Phe trung lập — chỉ ván 2 người',
        icon: '⚪',
        fields: [
          {
            key: 'neutralFaction',
            hostOnly: true,
            icon: '⚪',
            inputs: {
              area: 'Số trên thẻ khu vực trung lập',
              discOne: 'Cấp Ngân hàng trung lập',
              discTwo: 'Cấp Luật trung lập',
              discThree: 'Cấp Y học trung lập',
              discFour: 'Cấp Kỹ thuật trung lập',
            },
            hint: 'Người quản lý nhập một lần; phe trung lập chỉ cạnh tranh hạng, không có tổng điểm hay chiến thắng.',
          },
        ],
      },
    ],
    sources: [
      'https://www.feuerland-spiele.de/fileadmin/game/Age_of_Innovation/Age_of_Innovation_rules_EN_V1-1_low.pdf',
    ],
    limitations: [
      'Solo/Automa và mở rộng chưa tự động hóa.',
      'Ván 2 người không thể chốt nếu thiếu thông số phe trung lập.',
    ],
    minTemplateVersion: 3,
    requiredKeys: ['neutralFaction'],
  },
  'great-western-trail': {
    edition: 'Second Edition 2021 — không phải 2016',
    summary:
      'Điểm in trên tài sản vẫn nhập VP; tiền, công nhân cuối hàng và token được tự quy đổi.',
    groups: [
      {
        title: 'Tiền và tài sản',
        icon: '🐄',
        fields: [
          {
            key: 'dollars',
            icon: '💵',
          },
          {
            key: 'buildings',
            icon: '🏠',
            manualPoints: true,
          },
          {
            key: 'cityCrests',
            icon: '🛡️',
            manualPoints: true,
          },
          {
            key: 'stations',
            icon: '🚂',
            manualPoints: true,
          },
          {
            key: 'hazards',
            icon: '⚠️',
            manualPoints: true,
          },
          {
            key: 'cattle',
            icon: '🐄',
            manualPoints: true,
          },
        ],
      },
      {
        title: 'Nhiệm vụ và trưởng ga',
        icon: '🎯',
        fields: [
          {
            key: 'objectives',
            icon: '🎯',
            manualPoints: true,
            hint: 'VP thẻ hoàn thành trừ phạt thẻ chưa hoàn thành trong khu mục tiêu. Thẻ còn trong bộ được bỏ hoặc đưa vào khu trước khi chấm.',
          },
          {
            key: 'stationMasters',
            icon: '🚉',
            manualPoints: true,
          },
        ],
      },
      {
        title: 'Thưởng trên bảng',
        icon: '👷',
        fields: [
          {
            key: 'workers',
            icon: '👷',
            hint: 'Số công nhân ở ôthứ 5 hoặc 6 của các hàng;4 VP/người.',
          },
          {
            key: 'discSpace',
            icon: '⚪',
          },
          {
            key: 'jobMarket',
            icon: '🎟️',
          },
        ],
      },
    ],
    sources: [
      'https://cdn.1j1ju.com/medias/de/cb/bb-great-western-trail-second-edition-rulebook.pdf',
    ],
    limitations: [
      'Không dùng cho bản 2016, Argentina, New Zealand hay El Paso.',
      'Trưởng ga và tài sản in VP vẫn nhập điểm thủ công; Rails to the North/solo chưa tự động hóa.',
    ],
    minTemplateVersion: 3,
    requiredKeys: ['dollars', 'workers'],
  },
  'dune-imperium-uprising-2023': {
    edition: 'Uprising 2023 — ván 3–4 người',
    summary: 'Điểm trên track cộng Intrigue cuối ván chưa tính; tài nguyên chỉ phân định hòa.',
    groups: [
      {
        title: 'Chiến thắng',
        icon: '🏁',
        fields: [
          {
            key: 'vpTrack',
            icon: '🏁',
            hint: 'Giá trị trước khi giải quyết Intrigue Endgame; gồm VP đã nhận trong ván.',
          },
          {
            key: 'endgameIntrigueVp',
            icon: '🃏',
            manualPoints: true,
            hint: 'Chỉ VP bổ sung chưa có trên track, tránh cộng hai lần.',
          },
        ],
      },
      {
        title: 'Phân định hòa theo thứ tự',
        icon: '⚖️',
        fields: [
          {
            key: 'spice',
            icon: '🟠',
          },
          {
            key: 'solari',
            icon: '🪙',
          },
          {
            key: 'water',
            icon: '💧',
          },
          {
            key: 'troops',
            icon: '🛡️',
            hint: 'Chỉ quân trong đồn trú, không phải trong kho.',
          },
        ],
      },
    ],
    sources: [
      'https://dwd-web.s3.us-west-2.amazonaws.com/pdfs/DUNE_IMPERIUM_UPRISING_Main_Rulebook_23-10-12.pdf',
    ],
    limitations: ['Không áp dụng Rivals 1–2 người, đội 6 người hay CHOAM/mở rộng.'],
    minTemplateVersion: 3,
    requiredKeys: ['endgameIntrigueVp', 'spice', 'solari', 'water', 'troops'],
  },
  'seti-search-for-extraterrestrial-intelligence-2024': {
    edition: 'SETI 2024 + tùy chọn tổ chứcSpace Agencies 2025',
    summary: 'Nhập số lượng thực tế cho mặt thẻ vàng đã chọn; app đếm bộ và nhân VP in tại marker.',
    groups: [
      {
        title: 'Điểm và cách chơi',
        icon: '🛰️',
        fields: [
          {
            key: 'trackScore',
            icon: '🏁',
          },
          {
            key: 'organizations',
            hostOnly: true,
            icon: '🏢',
            hint: 'Bật nếu dùng tổ chức + khởi đầu nhanh:4 vòng đánh số 2–5. Chỉ thêm thẻ/alien/token không bắt buộc bật.',
          },
        ],
      },
      {
        title: 'Vàng — Công nghệ',
        icon: '🔭',
        fields: [
          {
            key: 'techTriples',
            icon: '🟨',
            inputs: {
              probe: 'Công nghệ tàu thăm dò',
              telescope: 'Công nghệ kính thiên văn',
              computer: 'Công nghệ máy tính',
              rate: 'VP mỗi bộ in tại marker (0=nếu không chọn mặt này)',
            },
          },
          {
            key: 'techPairs',
            icon: '🟨',
            inputs: {
              techs: 'Tổng công nghệ',
              rate: 'VP mỗi bộ in tại marker (0=nếu không chọn mặt này)',
            },
          },
        ],
      },
      {
        title: 'Vàng — Nhiệm vụ',
        icon: '🎯',
        fields: [
          {
            key: 'missionSingles',
            icon: '🟨',
            inputs: {
              missions: 'Nhiệm vụ đã hoàn thành',
              rate: 'VP mỗi bộ in tại marker (0=nếu không chọn mặt này)',
            },
          },
          {
            key: 'missionPairs',
            icon: '🟨',
            inputs: {
              missions: 'Nhiệm vụ đã hoàn thành',
              endCards: 'Thẻ cuối ván đã chơi',
              rate: 'VP mỗi bộ in tại marker (0=nếu không chọn mặt này)',
            },
          },
        ],
      },
      {
        title: 'Vàng — Thu nhập',
        icon: '💳',
        fields: [
          {
            key: 'incomeTriples',
            icon: '🟨',
            inputs: {
              credits: 'Thẻ thu nhập tín dụng đã nhét',
              energy: 'Thẻ thu nhập năng lượng đã nhét',
              cards: 'Thẻ thu nhập rút bài đã nhét',
              rate: 'VP mỗi bộ in tại marker (0=nếu không chọn mặt này)',
            },
          },
          {
            key: 'incomeMajority',
            icon: '🟨',
            inputs: {
              credits: 'Thẻ thu nhập tín dụng đã nhét',
              energy: 'Thẻ thu nhập năng lượng đã nhét',
              rate: 'VP mỗi bộ in tại marker (0=nếu không chọn mặt này)',
            },
          },
        ],
        hint: 'Không tính thu nhập in sẵn trên thẻ bắt đầu.',
      },
      {
        title: 'Vàng — Dấu vết và khu vực',
        icon: '👽',
        fields: [
          {
            key: 'traceTriples',
            icon: '🟨',
            inputs: {
              red: 'Dấu vết đỏ',
              yellow: 'Dấu vết vàng',
              blue: 'Dấu vết xanh',
              rate: 'VP mỗi bộ in tại marker (0=nếu không chọn mặt này)',
            },
          },
          {
            key: 'sectorPairs',
            icon: '🟨',
            inputs: {
              wins: 'Số lần thắng khu vực',
              orbiters: 'Tàu quỹ đạo',
              landers: 'Tàu đổ bộ',
              rate: 'VP mỗi bộ in tại marker (0=nếu không chọn mặt này)',
            },
          },
        ],
        hint: 'Dấu vết tràn vẫn tính. Số tàu là tàu quỹ đạo cộng đổ bộ.',
      },
      {
        title: 'Thẻ và loài ngoài hành tinh',
        icon: '🃏',
        fields: [
          {
            key: 'endGameCards',
            icon: '🃏',
            manualPoints: true,
          },
          {
            key: 'alienBonus',
            icon: '👽',
            manualPoints: true,
          },
        ],
      },
      {
        title: 'Nhập bộ thủ công — cách cũ',
        icon: '✍️',
        fields: [
          {
            key: 'goldTile25',
            icon: '✍️',
            inputs: {
              sets: 'Số bộ đã tự đếm',
              valuePerSet: 'VP mỗi bộ in tại marker',
            },
            manualPoints: true,
          },
          {
            key: 'goldTile50',
            icon: '✍️',
            inputs: {
              sets: 'Số bộ đã tự đếm',
              valuePerSet: 'VP mỗi bộ in tại marker',
            },
            manualPoints: true,
          },
          {
            key: 'goldTile70',
            icon: '✍️',
            inputs: {
              sets: 'Số bộ đã tự đếm',
              valuePerSet: 'VP mỗi bộ in tại marker',
            },
            manualPoints: true,
          },
        ],
        hint: 'Chọn cách này hoặc 8 bộ đếm bên trên; không nhập cả hai.',
      },
    ],
    sources: [
      'https://bghub.org/r/setisearchforextraterrestrialintelligence.pdf',
      'https://www.hras.cz/user/related_files/se2_rulebook_en_13_lowres.pdf',
    ],
    limitations: [
      'Mỗi thẻ vật lý chỉ chọn 1 mặt, tối đa 3 thẻ; rate 0 là không chọn.',
      'Loài mớiArkhos/Glyphids/Amoeba và ngoại lệ tổ chức chưa được tự động xác minh; nhập VP cuối ván theo tờ luật.',
      'Solo rival chưa tự động hóa.',
    ],
    minTemplateVersion: 3,
    requiredKeys: ['techTriples', 'sectorPairs', 'organizations'],
  },
  'nucleum-2023': {
    edition: 'Nucleum 2023 — cơ bản',
    summary:
      'Nhập số lần đạt điều kiện cột mốc và hệ số in trên bàn; không đoán hệ số theo số thứ tự tầng.',
    groups: [
      {
        title: 'Điểm đã nhận',
        icon: '🏁',
        fields: [
          {
            key: 'vpTrack',
            icon: '🏁',
          },
          {
            key: 'zeroMarkers',
            icon: '⚠️',
          },
        ],
      },
      {
        title: 'Cột mốc theo số lượng',
        icon: '🏅',
        fields: [
          {
            key: 'milestone1',
            icon: '🏅',
            inputs: {
              quantity: 'Số đối tượng đủ điều kiện',
              perSet: 'Số đối tượng cần cho 1 bộ',
              multiplier: 'Hệ số VP in tại marker',
            },
            hint: 'floor(số lượng / cỡ bộ) × hệ số. Cột mốc không dùng: để 0.',
          },
          {
            key: 'milestone2',
            icon: '🏅',
            inputs: {
              quantity: 'Số đối tượng đủ điều kiện',
              perSet: 'Số đối tượng cần cho 1 bộ',
              multiplier: 'Hệ số VP in tại marker',
            },
            hint: 'floor(số lượng / cỡ bộ) × hệ số. Cột mốc không dùng: để 0.',
          },
          {
            key: 'milestone3',
            icon: '🏅',
            inputs: {
              quantity: 'Số đối tượng đủ điều kiện',
              perSet: 'Số đối tượng cần cho 1 bộ',
              multiplier: 'Hệ số VP in tại marker',
            },
            hint: 'floor(số lượng / cỡ bộ) × hệ số. Cột mốc không dùng: để 0.',
          },
          {
            key: 'milestone4',
            icon: '🏅',
            inputs: {
              quantity: 'Số đối tượng đủ điều kiện',
              perSet: 'Số đối tượng cần cho 1 bộ',
              multiplier: 'Hệ số VP in tại marker',
            },
            hint: 'floor(số lượng / cỡ bộ) × hệ số. Cột mốc không dùng: để 0.',
          },
          {
            key: 'milestone5',
            icon: '🏅',
            inputs: {
              quantity: 'Số đối tượng đủ điều kiện',
              perSet: 'Số đối tượng cần cho 1 bộ',
              multiplier: 'Hệ số VP in tại marker',
            },
            hint: 'floor(số lượng / cỡ bộ) × hệ số. Cột mốc không dùng: để 0.',
          },
          {
            key: 'milestone6',
            icon: '🏅',
            inputs: {
              quantity: 'Số đối tượng đủ điều kiện',
              perSet: 'Số đối tượng cần cho 1 bộ',
              multiplier: 'Hệ số VP in tại marker',
            },
            hint: 'floor(số lượng / cỡ bộ) × hệ số. Cột mốc không dùng: để 0.',
          },
        ],
      },
      {
        title: 'Công trình đã cấp điện',
        icon: '⚡',
        fields: [
          {
            key: 'ordinaryBuildings',
            icon: '🏭',
            inputs: {
              normalVp: 'Tổng VP in trên công trình thường ngoàiPraha',
              prahaVp: 'Tổng VP in trên công trình thường tạiPraha',
            },
            manualPoints: true,
            hint: 'App nhân đôi phầnPraha.',
          },
          {
            key: 'governmentBuildings',
            icon: '🏛️',
            inputs: {
              normalCount: 'Công trình đúng loại trong mạng Chính phủ ngoàiPraha',
              normalRate: 'VP mỗi công trình theo ôChính phủ đó',
              prahaCount: 'Công trình đúng loại trong mạng Chính phủ tạiPraha',
              prahaRate: 'VP mỗi công trình theo ôChính phủ tạiPraha',
            },
            hint: 'Nếu có nhiều ôChính phủ khác loại/hệ số, dùng tổng VP thủ công bên dưới thay phần này.',
          },
        ],
      },
      {
        title: 'Track và công nghệ',
        icon: '🔬',
        fields: [
          {
            key: 'incomeThaler',
            icon: '📈',
            choices: [
              {
                value: 0,
                label: 'Chưa vào 3 ôcuối (0 VP)',
              },
              {
                value: 1,
                label: 'Ôcuối thứ 3 (3 VP)',
              },
              {
                value: 2,
                label: 'Ôápchót (6 VP)',
              },
              {
                value: 3,
                label: 'Ôcuối (10 VP)',
              },
            ],
          },
          {
            key: 'incomeWorker',
            icon: '📈',
            choices: [
              {
                value: 0,
                label: 'Chưa vào 3 ôcuối (0 VP)',
              },
              {
                value: 1,
                label: 'Ôcuối thứ 3 (3 VP)',
              },
              {
                value: 2,
                label: 'Ôápchót (6 VP)',
              },
              {
                value: 3,
                label: 'Ôcuối (10 VP)',
              },
            ],
          },
          {
            key: 'incomeVp',
            icon: '📈',
            choices: [
              {
                value: 0,
                label: 'Chưa vào 3 ôcuối (0 VP)',
              },
              {
                value: 1,
                label: 'Ôcuối thứ 3 (3 VP)',
              },
              {
                value: 2,
                label: 'Ôápchót (6 VP)',
              },
              {
                value: 3,
                label: 'Ôcuối (10 VP)',
              },
            ],
          },
          {
            key: 'ultimateGoal',
            icon: '🔬',
            manualPoints: true,
            hint: 'Chỉ nhập khi mở khóa công nghệ thứ 8; theo bảng thí nghiệm.',
          },
        ],
      },
      {
        title: 'Tài nguyên còn lại',
        icon: '🪙',
        fields: [
          {
            key: 'leftoverUranium',
            icon: '☢️',
          },
          {
            key: 'leftoverWorkers',
            icon: '👷',
          },
          {
            key: 'leftoverThaler',
            icon: '🪙',
          },
        ],
        hint: 'Nhập sau quy đổi tự chọn hợp lệ:2 Uranium/1 VP;2 công nhân/1 VP;5 Thaler/1 VP.',
      },
      {
        title: 'Tổng VP thủ công — cách cũ',
        icon: '✍️',
        fields: [
          {
            key: 'milestones',
            icon: '🏅',
            manualPoints: true,
          },
          {
            key: 'energizedBuildings',
            icon: '⚡',
            manualPoints: true,
          },
        ],
        hint: 'Không nhập lại phần đã tính bằng các bộ đếm ở trên.',
      },
    ],
    sources: ['https://boardanddice.com/nucleum/'],
    limitations: [
      'Điều kiện cụ thể theo thẻ và công nghệ 8 vẫn đọc trên bàn; hệ số tầng lấy từbàn (tầng trên cùng×7).',
      'ThưởngChính phủ nhiều mạng/loại khác nhau có thể dùng tổng VP thủ công.',
      'Australia, Court of Progress, ERI, Gibraltar chưa tự động hóa.',
    ],
    minTemplateVersion: 3,
    requiredKeys: ['milestone1', 'governmentBuildings'],
  },
};
