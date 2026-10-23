import type { SuggestRarity } from '@onboard/shared';

export const RARITY_COMMON_COLOR = '#8a8f98';
export const RARITY_RARE_COLOR = '#16a34a';
export const RARITY_EPIC_COLOR = '#7c3aed';
export const RARITY_LEGENDARY_COLOR = '#dc2f26';
export const RARITY_ANCIENT_COLOR = '#d4a017';

export const RARITY: Record<SuggestRarity, { label: string; color: string }> = {
  common: { label: 'Thường', color: RARITY_COMMON_COLOR },
  rare: { label: 'Hiếm', color: RARITY_RARE_COLOR },
  epic: { label: 'Sử thi', color: RARITY_EPIC_COLOR },
  legendary: { label: 'Huyền thoại', color: RARITY_LEGENDARY_COLOR },
  ancient: { label: 'Cổ vật', color: RARITY_ANCIENT_COLOR },
};

export const RARITY_ORDER = Object.keys(RARITY) as SuggestRarity[];

/** Return black or white text with sufficient contrast against a rarity badge. */
export function rarityForeground(rarity: SuggestRarity): '#111418' | '#ffffff' {
  const hex = RARITY[rarity].color.slice(1);
  const channels = [0, 2, 4].map((index) => Number.parseInt(hex.slice(index, index + 2), 16) / 255);
  const linear = channels.map((channel) =>
    channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4,
  );
  const luminance = 0.2126 * linear[0]! + 0.7152 * linear[1]! + 0.0722 * linear[2]!;
  return luminance > 0.179 ? '#111418' : '#ffffff';
}
