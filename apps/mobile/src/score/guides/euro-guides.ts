import type { GameGuide } from './types';

export const euroGuides: Record<string, GameGuide> = {
  barrage: {
    edition: 'base',
    summary:
      'Nhập VP trên track và số lượng còn lại; tự đổi máy móc/tín dụng thành VP. Leeghwater có VP Private Buildings riêng.',
    groups: [
      {
        title: 'Điểm đã có và mục tiêu',
        fields: [
          {
            key: 'vpTrack',
            label: 'VP trước tính điểm cuối',
            manualPoints: true,
          },
          {
            key: 'objective',
            label: 'VP thẻ mục tiêu',
            manualPoints: true,
            hint: 'Xếp 15/10/5; hòa chia các hạng bị chiếm và làm tròn lên.',
          },
        ],
        icon: '★',
      },
      {
        title: 'Kho cá nhân và nước',
        fields: [
          {
            key: 'supplyQuantities',
            inputs: {
              excavators: 'Máy xúc trong kho',
              mixers: 'Máy trộn trong kho',
              credits: 'Tín dụng trong kho',
            },
            hint: 'Không tính máy trên Construction Wheel hoặc máy đã chi cho External Works.',
          },
          {
            key: 'leftoverItems',
            label: 'Tổng máy móc + tín dụng → mỗi 5 = 1 VP',
            readOnly: true,
          },
          {
            key: 'waterDrops',
            label: 'Giọt nước trong đập riêng → mỗi giọt = 1 VP',
          },
        ],
        icon: '⚙',
      },
      {
        title: 'The Leeghwater Project',
        fields: [
          {
            key: 'leeghwaterEnabled',
            choices: [
              {
                value: 0,
                label: 'Không',
              },
              {
                value: 1,
                label: 'Có',
              },
            ],
          },
          {
            key: 'privateBuildingVp',
            label: 'VP cuối từ Private Buildings đã kích hoạt',
            manualPoints: true,
            hint: 'Cộng đúng các VP in trên các ô đã kích hoạt. Không nhập thưởng đã nhận trong ván lần nữa.',
          },
        ],
        icon: '⌂',
      },
      {
        title: 'Phân định hòa',
        fields: [
          {
            key: 'lastRoundEnergy',
            label: 'Năng lượng sản xuất vòng 5',
          },
        ],
        icon: '↔',
      },
    ],
    sources: [
      'https://www.craniocreations.it/storage/media/product_downloads/35/488/Barrage_LWP_Rulebook_ENG_Low.pdf',
    ],
    limitations: [
      'Chỉ kết quả multiplayer base và VP cuối Private Buildings của Leeghwater.',
      'Điểm thẻ mục tiêu và từng Private Building vẫn nhập VP đã xác định theo thẻ. Không tự mô phỏng vòng chơi, solo/automa hay bản đồ mở rộng.',
    ],
    minTemplateVersion: 3,
    requiredKeys: [
      'vpTrack',
      'objective',
      'supplyQuantities',
      'leftoverItems',
      'waterDrops',
      'leeghwaterEnabled',
      'privateBuildingVp',
      'lastRoundEnergy',
    ],
  },
  'trajan-2011': {
    edition: 'base',
    summary:
      'Chọn tổng VP đã hoàn tất hoặc nhập số lượng để tính điểm cuối. Hai cách không cộng chồng.',
    groups: [
      {
        title: 'Cách ghi kết quả',
        fields: [
          {
            key: 'entryMode',
            choices: [
              {
                value: 0,
                label: 'Tổng VP cuối đã tính',
              },
              {
                value: 1,
                label: 'Tính từ số lượng cuối ván',
              },
            ],
          },
          {
            key: 'victoryPoints',
            label: 'VP cuối (đã gồm mọi thưởng cuối)',
            manualPoints: true,
          },
          {
            key: 'trackBeforeFinal',
            label: 'VP trên track trước thưởng cuối',
            manualPoints: true,
          },
        ],
        icon: '★',
      },
      {
        title: 'Bài và quân trong trại',
        fields: [
          {
            key: 'handCards',
            label: 'Bài hàng hóa trên tay × 1 VP',
          },
          {
            key: 'campWorkers',
            label: 'Thợ trong trại × 1 VP',
          },
          {
            key: 'campLegionnaires',
            label: 'Lính trong trại quân × 1 VP',
          },
        ],
        icon: '♟',
      },
      {
        title: 'Bộ công trình',
        fields: [
          {
            key: 'constructionTriples',
            label: 'Bộ 3 cùng biểu tượng × 10 VP',
          },
          {
            key: 'constructionQuadruples',
            label: 'Bộ 4 cùng biểu tượng × 20 VP',
          },
          {
            key: 'bonusTileVp',
            label: 'VP thẻ thưởng vàng/xám',
            manualPoints: true,
          },
        ],
        icon: '⌂',
        hint: 'Phân bổ wildcard trước. Một viên công trình chỉ thuộc một bộ; bộ 4 không tính thêm bộ 3.',
      },
      {
        title: 'Phân định hòa',
        fields: [
          {
            key: 'senatePosition',
            label: 'Thứ hạng Senate cuối (1 = cao nhất)',
            hint: 'Dùng cả thứ tự chồng đĩa để nhập thứ hạng duy nhất.',
          },
        ],
        icon: '↔',
      },
    ],
    sources: ['https://www.boardgamesbot.com/assets/games-library/trajan/manual_eng.pdf'],
    limitations: [
      'Bonus tile tính theo đúng mặt vàng/xám và biểu tượng; hiện nhập VP đã xác định.',
      'Tổng cuối giữ nguyên ý nghĩa cũ; chỉ chế độ số lượng mới cộng các khoản chi tiết.',
    ],
    minTemplateVersion: 3,
    requiredKeys: [
      'entryMode',
      'victoryPoints',
      'trackBeforeFinal',
      'handCards',
      'campWorkers',
      'campLegionnaires',
      'constructionTriples',
      'constructionQuadruples',
      'bonusTileVp',
      'senatePosition',
    ],
  },
  'galactic-cruise': {
    edition: 'base',
    summary:
      'Nhập track sau lượt cuối và lượt tiến tàu cuối, trước AGM C. Tự đổi vật tư và tính tiến độ; Cockpit giữ cả số âm.',
    groups: [
      {
        title: 'Track và tàu',
        fields: [
          {
            key: 'trackVp',
            label: 'VP trước AGM C',
            manualPoints: true,
          },
          {
            key: 'cockpits',
            label: 'Tổng VP Cockpit sau phạt',
            manualPoints: true,
            hint: 'Mỗi tàu chưa phóng trừ 5. Có thể âm.',
          },
          {
            key: 'segments',
            label: 'VP in trên các khoang tàu',
            manualPoints: true,
          },
        ],
        icon: '🚀',
      },
      {
        title: 'Tiến độ và uy tín',
        fields: [
          {
            key: 'progress',
            inputs: {
              cubes: 'Cube trong khu 3 + overflow',
              wings: 'Biểu tượng Wings của bạn đã mở',
              mostReputation: 'Nhiều uy tín nhất (kể cả hòa)',
            },
            inputChoices: {
              mostReputation: [
                {
                  value: 0,
                  label: 'Không',
                },
                {
                  value: 1,
                  label: 'Có',
                },
              ],
            },
          },
          {
            key: 'reputation',
            label: 'VP tại ngưỡng uy tín cao nhất',
            manualPoints: true,
          },
          {
            key: 'developments',
            label: 'VP cột trống ngoài cùng bên phải',
            manualPoints: true,
          },
        ],
        icon: '▥',
      },
      {
        title: 'Vật tư cuối',
        fields: [
          {
            key: 'supplyQuantities',
            inputs: {
              resources: 'Tổng Food + Oxygen + Fuel',
              money: 'Tiền',
              ads: 'Quảng cáo',
              agendaCards: 'Bài Agenda',
              blueprints: 'Blueprint chưa dùng',
            },
          },
          {
            key: 'supplies',
            label: 'Tổng vật tư → mỗi 3 = 1 VP',
            readOnly: true,
          },
        ],
        icon: '▣',
      },
      {
        title: 'Phân định hòa',
        fields: [
          {
            key: 'progressCubes',
            label: 'Tổng cube thật trên toàn Progress Track',
            hint: 'Không tính cube thưởng uy tín giả định.',
          },
          {
            key: 'reputationLevel',
            label: 'Mức uy tín hiện tại',
          },
          {
            key: 'cockpitVp',
            label: 'VP Cockpit (lấy từ mục tàu)',
            readOnly: true,
          },
          {
            key: 'turnOrder',
            label: 'Thứ tự lượt (số lớn đi sau)',
          },
        ],
        icon: '↔',
      },
    ],
    sources: ['https://bghub.org/r/galacticcruise.pdf'],
    limitations: [
      'Base multiplayer; không tự chấm Rachel solo hoặc các expansion.',
      'Cần đối chiếu bản in retail với Training Manual truy cập được trước khi tuyên bố toàn bộ edition đã xác minh.',
      'Cockpit, ngưỡng uy tín và Development vẫn là VP xác định theo thành phần vật lý.',
    ],
    minTemplateVersion: 3,
    requiredKeys: [
      'trackVp',
      'cockpits',
      'segments',
      'progress',
      'reputation',
      'developments',
      'supplyQuantities',
      'supplies',
      'progressCubes',
      'reputationLevel',
      'cockpitVp',
      'turnOrder',
    ],
  },
  luthier: {
    edition: 'base',
    summary:
      'Số ghế tự chọn bảng 1–3/4 người. Mỗi nhạc cụ ở finishing bench chia đôi và làm tròn lên riêng.',
    groups: [
      {
        title: 'Uy tín đã có',
        fields: [
          {
            key: 'trackScore',
            label: 'Uy tín trên track trước tính điểm cuối',
            manualPoints: true,
            hint: 'Đã gồm mọi phạt Patron rời đi; không trừ lịch sử phạt lần nữa.',
          },
        ],
        icon: '★',
      },
      {
        title: 'Dàn nhạc',
        fields: [
          {
            key: 'chairCount',
            label: 'Số First Chairs đang giữ',
          },
          {
            key: 'firstChairs',
            label: 'Uy tín từ ghế (1–3 người)',
            readOnly: true,
          },
          {
            key: 'firstChairs4p',
            label: 'Uy tín từ ghế (4 người)',
            readOnly: true,
          },
        ],
        icon: '♫',
      },
      {
        title: 'Nhạc cụ và thành tựu',
        fields: [
          {
            key: 'finishingInstruments',
            label: 'Uy tín in trên từng nhạc cụ ở finishing bench',
            hint: 'Thêm một giá trị cho mỗi nhạc cụ, ví dụ 3 và 3 → 2 + 2 = 4 VP. Không tính roughing bench.',
          },
          {
            key: 'finishingVp',
            label: 'Uy tín nhạc cụ đang hoàn thiện',
            readOnly: true,
          },
          {
            key: 'patronEndBonus',
            label: 'Thưởng cuối từ Patron đã hoàn thành',
            manualPoints: true,
          },
          {
            key: 'personalGoals',
            label: 'Mục tiêu cá nhân: chỉ cấp cao nhất mỗi thẻ',
            manualPoints: true,
          },
          {
            key: 'specialWorkers',
            label: 'Specialty worker đã có × 1 uy tín',
          },
        ],
        icon: '♪',
      },
      {
        title: 'Vật tư và phân định hòa',
        fields: [
          {
            key: 'resourceQuantities',
            inputs: {
              money: 'Tiền trước đổi điểm',
              materials: 'Vật liệu',
              inspiration: 'Cảm hứng',
              apprentices: 'Học việc',
            },
          },
          {
            key: 'leftoverResources',
            label: 'Tổng vật tư → mỗi 10 = 1 uy tín',
            readOnly: true,
          },
          {
            key: 'leftoverMoney',
            label: 'Tiền còn sau quy đổi (0–9)',
            hint: 'Phân bổ quy đổi để phần còn lại là tiền theo luật. Sau hòa uy tín và tiền thì cùng thắng.',
          },
        ],
        icon: '▣',
      },
    ],
    sources: ['https://bghub.org/r/luthier.pdf'],
    limitations: [
      'Bảng chấm điểm bản English 2025, trang 26 đã xem ảnh. Solo và thay đổi edition khác chưa tự động hóa.',
      'Patron/goal theo điều kiện in trên thẻ vẫn nhập uy tín đã xác định.',
    ],
    minTemplateVersion: 3,
    requiredKeys: [
      'trackScore',
      'chairCount',
      'firstChairs',
      'firstChairs4p',
      'finishingInstruments',
      'finishingVp',
      'patronEndBonus',
      'personalGoals',
      'specialWorkers',
      'resourceQuantities',
      'leftoverResources',
      'leftoverMoney',
    ],
  },
  'entropy-2026': {
    edition: 'base',
    summary: 'Cộng VP token, ô Lifeform đã nhận, điểm mục tiêu chính và mỗi 4 tài nguyên còn lại.',
    groups: [
      {
        title: 'VP đã đạt',
        fields: [
          {
            key: 'vpTokens',
            label: 'Tổng VP token',
            manualPoints: true,
          },
          {
            key: 'lifeformObjectives',
            label: 'VP ô Lifeform lớn + nhỏ đã nhận',
            manualPoints: true,
          },
          {
            key: 'mainObjective',
            label: 'VP tiến độ và điều kiện Main Objectives',
            manualPoints: true,
          },
        ],
        icon: '★',
      },
      {
        title: 'Tài nguyên còn lại',
        fields: [
          {
            key: 'resourceQuantities',
            inputs: {
              lifeCards: 'Bài Life trên tay',
              entropy: 'Entropy',
              mass: 'Mass',
              energy: 'Energy',
            },
          },
          {
            key: 'leftoverItems',
            label: 'Tổng bốn loại tài nguyên',
            readOnly: true,
          },
          {
            key: 'leftoverVp',
            label: 'VP từ mỗi nhóm 4 tài nguyên',
            readOnly: true,
          },
        ],
        icon: '✦',
      },
    ],
    sources: [
      'https://www.dropbox.com/scl/fi/lg9iu1qq1s457uymglaxo/entropy_rules_EN_web.pdf?dl=0&rlkey=lpst6su3lu76smw2yrlnz363m',
    ],
    limitations: [
      'Rulebook chính thức trang 13: ví dụ 43 + 44 + 45 + 2 = 134 VP.',
      'Không tự suy luận điều kiện của từng Main Objective, solo hoặc promo. Hòa tổng thì cùng thắng.',
    ],
    minTemplateVersion: 3,
    requiredKeys: [
      'vpTokens',
      'lifeformObjectives',
      'mainObjective',
      'resourceQuantities',
      'leftoverItems',
      'leftoverVp',
    ],
  },
  'the-old-kings-crown': {
    edition: 'base',
    summary:
      'Đếm Influence trước quy đổi Lore; chỉ đổi Lore khi Site of Power không còn thẻ. Giữ nguyên thứ tự Favour rồi Order.',
    groups: [
      {
        title: 'Influence và Lore',
        fields: [
          {
            key: 'supplyTokens',
            inputs: {
              ones: 'Token Influence giá trị 1',
              fives: 'Token Influence giá trị 5',
            },
            hint: 'Chỉ token trong Supply; nhập trước khi đổi Lore cuối ván.',
          },
          {
            key: 'influence',
            label: 'Influence trước quy đổi Lore',
            readOnly: true,
          },
          {
            key: 'siteEmpty',
            label: 'Site of Power không còn thẻ',
            choices: [
              {
                value: 0,
                label: 'Không',
              },
              {
                value: 1,
                label: 'Có',
              },
            ],
          },
          {
            key: 'loreBonus',
            label: 'Số Lore còn lại → mỗi 2 = 1 Influence',
            hint: 'Không nhập Influence đã đổi. Site không rỗng thì phần này không cộng.',
          },
        ],
        icon: '♛',
      },
      {
        title: 'Phân định hòa',
        fields: [
          {
            key: 'favour',
            label: 'Giữ Kingdom’s Favour',
            choices: [
              {
                value: 0,
                label: 'Không',
              },
              {
                value: 1,
                label: 'Có',
              },
            ],
          },
          {
            key: 'orderPos',
            label: 'Vị trí Order Track (1 cao nhất)',
          },
        ],
        icon: '↔',
      },
    ],
    sources: [
      'https://gamers-hq.de/media/pdf/23/1b/5a/The-Old-King-s-Crown-Rulebook-Single-Page-Version.pdf',
    ],
    limitations: [
      'Kết quả multiplayer theo official rulebook. Không mô phỏng Clash/Council hay tự suy luận tác động thẻ.',
      'Không cộng Lore lần nữa nếu bạn đã cộng nó vào Supply vật lý. Solo và New Songs of Home không được tự động hóa.',
    ],
    minTemplateVersion: 3,
    requiredKeys: ['supplyTokens', 'influence', 'siteEmpty', 'loreBonus', 'favour', 'orderPos'],
  },
  'yinzi-ming': {
    edition: 'base',
    summary:
      'Nhập cấp/số lượng cho các khoản tuyến tính; điểm thị trường, đoàn buôn và đa số vẫn xác định theo thẻ đang chơi.',
    groups: [
      {
        title: 'Vận chuyển và xưởng',
        fields: [
          {
            key: 'transport',
            label: 'Cấp vận chuyển Yangtze × 2',
          },
          {
            key: 'workshopsI',
            label: 'Xưởng cấp I × 1',
          },
          {
            key: 'workshopsII',
            label: 'Xưởng cấp II × 3',
          },
          {
            key: 'workshopsIII',
            label: 'Xưởng cấp III × 5',
          },
          {
            key: 'goods',
            label: 'Hàng chưa xuất × 1',
          },
        ],
        icon: '⚙',
      },
      {
        title: 'Thương mại và ảnh hưởng',
        fields: [
          {
            key: 'exports',
            label: 'VP đã xác định từ ô Foreign Markets',
            manualPoints: true,
          },
          {
            key: 'negotiation',
            inputs: {
              level: 'Cấp Negotiation (1–4)',
              destinations: 'Điểm đến khác nhau đã xuất hàng (0–6)',
            },
          },
          {
            key: 'escort',
            label: 'VP theo Escort Bonus token',
            manualPoints: true,
          },
          {
            key: 'caravans',
            label: 'VP đoàn buôn đã hoàn thành',
            manualPoints: true,
          },
          {
            key: 'bribe',
            label: 'VP đa số Corrupt Administration',
            manualPoints: true,
            choices: [
              {
                value: 0,
                label: '0 — không đạt',
              },
              {
                value: 2,
                label: '2 — hòa nhiều nhất',
              },
              {
                value: 4,
                label: '4 — nhiều nhất riêng',
              },
            ],
          },
        ],
        icon: '⚑',
      },
      {
        title: 'Bạc, rủi ro và phân định hòa',
        fields: [
          {
            key: 'silver',
            label: 'Thỏi bạc sau đổi Copper × 1',
          },
          {
            key: 'misfortune',
            label: 'Misfortune × −2',
          },
          {
            key: 'turnOrder',
            label: 'Thứ tự lượt cuối (1 đi trước)',
          },
        ],
        icon: '▣',
      },
    ],
    sources: [],
    limitations: [
      'Chưa đọc được PDF primary chính xác của Yinzi: Ming. Các mức chuyển đổi hiện giữ theo bản chép luật đang có, chưa nâng nhãn xác minh.',
      'Không thay bằng luật Yinzi 2019; solo và Natural Disaster chưa mô hình hóa.',
    ],
    minTemplateVersion: 3,
    requiredKeys: [
      'transport',
      'workshopsI',
      'workshopsII',
      'workshopsIII',
      'goods',
      'exports',
      'negotiation',
      'escort',
      'caravans',
      'bribe',
      'silver',
      'misfortune',
      'turnOrder',
    ],
  },
  'gaia-project-2017': {
    edition: 'base (expansion The Lost Fleet not modelled)',
    summary:
      'Chọn cấp cuối của sáu nhánh nghiên cứu, tự tính 4 VP mỗi cấp 3–5 đã đạt; cộng tài nguyên trước khi chia 3.',
    groups: [
      {
        title: 'VP trước và thẻ cuối',
        fields: [
          {
            key: 'vpTrack',
            label: 'VP trên track sau vòng 6, trước thưởng cuối',
            manualPoints: true,
          },
          {
            key: 'finalTile1',
            label: 'VP đã phân hạng từ thẻ cuối 1',
            manualPoints: true,
          },
          {
            key: 'finalTile2',
            label: 'VP đã phân hạng từ thẻ cuối 2',
            manualPoints: true,
          },
        ],
        icon: '★',
        hint: '18/12/6/0 theo hạng; hòa chia VP của các hạng bị chiếm. Nhớ đối thủ trung lập ở cấu hình ít người.',
      },
      {
        title: 'Sáu nhánh nghiên cứu',
        fields: [
          {
            key: 'researchTrackLevels',
            inputs: {
              terraforming: 'Terraforming',
              navigation: 'Navigation',
              ai: 'Artificial Intelligence',
              gaiaforming: 'Gaia Project',
              economy: 'Economy',
              science: 'Science',
            },
            inputChoices: {
              terraforming: [
                {
                  value: 0,
                  label: '0',
                },
                {
                  value: 1,
                  label: '1',
                },
                {
                  value: 2,
                  label: '2',
                },
                {
                  value: 3,
                  label: '3',
                },
                {
                  value: 4,
                  label: '4',
                },
                {
                  value: 5,
                  label: '5',
                },
              ],
              navigation: [
                {
                  value: 0,
                  label: '0',
                },
                {
                  value: 1,
                  label: '1',
                },
                {
                  value: 2,
                  label: '2',
                },
                {
                  value: 3,
                  label: '3',
                },
                {
                  value: 4,
                  label: '4',
                },
                {
                  value: 5,
                  label: '5',
                },
              ],
              ai: [
                {
                  value: 0,
                  label: '0',
                },
                {
                  value: 1,
                  label: '1',
                },
                {
                  value: 2,
                  label: '2',
                },
                {
                  value: 3,
                  label: '3',
                },
                {
                  value: 4,
                  label: '4',
                },
                {
                  value: 5,
                  label: '5',
                },
              ],
              gaiaforming: [
                {
                  value: 0,
                  label: '0',
                },
                {
                  value: 1,
                  label: '1',
                },
                {
                  value: 2,
                  label: '2',
                },
                {
                  value: 3,
                  label: '3',
                },
                {
                  value: 4,
                  label: '4',
                },
                {
                  value: 5,
                  label: '5',
                },
              ],
              economy: [
                {
                  value: 0,
                  label: '0',
                },
                {
                  value: 1,
                  label: '1',
                },
                {
                  value: 2,
                  label: '2',
                },
                {
                  value: 3,
                  label: '3',
                },
                {
                  value: 4,
                  label: '4',
                },
                {
                  value: 5,
                  label: '5',
                },
              ],
              science: [
                {
                  value: 0,
                  label: '0',
                },
                {
                  value: 1,
                  label: '1',
                },
                {
                  value: 2,
                  label: '2',
                },
                {
                  value: 3,
                  label: '3',
                },
                {
                  value: 4,
                  label: '4',
                },
                {
                  value: 5,
                  label: '5',
                },
              ],
            },
          },
          {
            key: 'researchLevels',
            label: 'Số cấp 3–5 đạt hoặc vượt × 4 VP',
            readOnly: true,
          },
        ],
        icon: '✦',
      },
      {
        title: 'Tài nguyên còn lại',
        fields: [
          {
            key: 'leftoverResources',
            inputs: {
              credits: 'Credits',
              knowledge: 'Knowledge',
              ore: 'Ore',
            },
            hint: 'Cộng ba loại rồi mỗi 3 đổi 1 VP. Không tính Power hoặc QIC.',
          },
        ],
        icon: '▣',
      },
    ],
    sources: ['https://cdn.1j1ju.com/medias/98/91/61-gaia-project-rulebook.pdf'],
    limitations: [
      'Base game có cả Lost Planet và Ivits. The Lost Fleet không được mô hình hóa.',
      'Thẻ cuối hiện nhập VP đã phân hạng; chưa tự tính điều kiện/tie allocation hay đối thủ neutral/automa. Hòa tổng thì cùng thắng.',
    ],
    minTemplateVersion: 3,
    requiredKeys: [
      'vpTrack',
      'finalTile1',
      'finalTile2',
      'researchTrackLevels',
      'researchLevels',
      'leftoverResources',
    ],
  },
};
