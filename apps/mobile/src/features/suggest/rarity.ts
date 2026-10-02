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
