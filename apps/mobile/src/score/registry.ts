import { createElement } from 'react';
import { GenericCategories } from './generic-categories';
import { GuidedScoreInput, guideMatches } from './guided-score-input';
import { strategyGuides } from './guides/strategy-guides';
import { mixedGuides } from './guides/mixed-guides';
import { euroGuides } from './guides/euro-guides';
import type { GameGuide } from './guides/types';
import type { ComponentType } from 'react';
import type { SheetApi } from './use-sheet';
import { AcquireInput } from './custom/acquire-input';
import { GrandAustriaInput } from './custom/grand-austria-input';
import { ShadowHuntersInput } from './custom/shadow-hunters-input';

export type ScoreInputComponent = ComponentType<{ sheet: SheetApi }>;

export const scoreInputRegistry: Record<string, ScoreInputComponent> = {
  'acquire-1963': AcquireInput,
  'grand-austria-hotel-deluxe': GrandAustriaInput,
  'shadow-hunters': ShadowHuntersInput,
};

export const gameGuides: Record<string, GameGuide> = {
  ...strategyGuides,
  ...euroGuides,
  ...mixedGuides,
  'acquire-1963': {
    edition: 'Acquire · Renegade Classic',
    minTemplateVersion: 3,
    requiredKeys: ['chainPrices', 'chainShares', 'marketShares'],
    summary:
      'Nhập tiền mặt, giá cổ phiếu và số cổ phiếu. Tiền bán và thưởng cổ đông tự tính cho cả bàn.',
    limitations: [
      'Chỉ Classic. Hai người: rút cổ phần thị trường theo luật rồi nhập kết quả; tiền thưởng thị trường trả về ngân hàng. Giá theo bảng của phiên bản đang chơi.',
    ],
    groups: [
      {
        title: 'Tiền và cổ phiếu',
        fields: [
          { key: 'cash', icon: '$' },
          { key: 'chainShares', icon: '▤' },
        ],
      },
      {
        title: 'Ngân hàng · chủ bàn nhập',
        fields: [
          { key: 'chainPrices', icon: '$' },
          { key: 'marketShares', icon: '▥' },
        ],
      },
      {
        title: 'Tự tính',
        fields: [
          { key: 'stockSales', readOnly: true },
          { key: 'endBonuses', readOnly: true },
        ],
      },
    ],
  },
  'the-gang-2024': {
    edition: 'The Gang · base',
    minTemplateVersion: 3,
    requiredKeys: ['heistsSucceeded', 'heistsFailed'],
    summary: 'Không tính VP. Cả đội thắng khi đủ 3 phi vụ thành công; thua khi đủ 3 thất bại.',
    groups: [
      {
        title: 'Kết quả phi vụ',
        fields: [
          { key: 'heistsSucceeded', icon: '🔓' },
          { key: 'heistsFailed', icon: '🚨' },
          { key: 'manualResult', icon: '✓' },
        ],
      },
    ],
  },
};
if (gameGuides.vantage)
  gameGuides.vantage.companion = {
    label: 'Mở Vantage Rulepop ↗',
    url: 'https://vantage.rulepop.com/',
    hint: 'Tra luật, ký hiệu và storybook trên trang chính thức. Mở website bên ngoài; không gửi dữ liệu bàn chơi.',
  };
for (const [slug, guide] of Object.entries(gameGuides)) {
  scoreInputRegistry[slug] = ({ sheet }) =>
    guideMatches(sheet, guide)
      ? createElement(GuidedScoreInput, { sheet, guide })
      : createElement(slug === 'acquire-1963' ? AcquireInput : GenericCategories, { sheet });
}

// Keep the game's compact chain grid while storing quantities in synced categories.
scoreInputRegistry['acquire-1963'] = AcquireInput;
