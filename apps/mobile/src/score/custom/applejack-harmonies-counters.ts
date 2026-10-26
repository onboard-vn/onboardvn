import type { RawValue, ScoreTemplate } from '@onboard/shared';

export const APPLEJACK_COLORS = [
  { key: 'honeyBrown', icon: '🟤', vi: 'Nâu', en: 'Brown' },
  { key: 'honeyDarkGreen', icon: '🌲', vi: 'Xanh đậm', en: 'Dark green' },
  { key: 'honeyLightGreen', icon: '🍏', vi: 'Xanh nhạt', en: 'Light green' },
  { key: 'honeyRed', icon: '🔴', vi: 'Đỏ', en: 'Red' },
  { key: 'honeyPink', icon: '🌸', vi: 'Hồng', en: 'Pink' },
  { key: 'honeyOrange', icon: '🟠', vi: 'Cam', en: 'Orange' },
  { key: 'honeyYellow', icon: '🟡', vi: 'Vàng', en: 'Yellow' },
] as const;

const APPLEJACK_KEYS = [
  ...APPLEJACK_COLORS.map(({ key }) => key),
  'profitableVarieties',
  'varietyBonus',
  'blossoms',
  'honeySupply',
];
const HARMONIES_KEYS = [
  'boardSide',
  'trees',
  'mountains',
  'fields',
  'buildings',
  'riverSideA',
  'islandsSideB',
  'animalCards',
  'natureSpirit',
  'animalCubesPlaced',
];

/** Old plays retain their pinned input contract and use the generic score sheet. */
export function supportsApplejackCounters(template: ScoreTemplate): boolean {
  return (
    template.slug === 'applejack-2022' &&
    template.templateVersion >= 2 &&
    APPLEJACK_KEYS.every((key) => template.categories.some((category) => category.key === key))
  );
}

export function supportsHarmoniesCounters(template: ScoreTemplate): boolean {
  return (
    template.slug === 'harmonies' &&
    template.templateVersion >= 2 &&
    HARMONIES_KEYS.every((key) => template.categories.some((category) => category.key === key)) &&
    template.categories.some(
      (category) => category.key === 'boardSide' && category.scope === 'team',
    ) &&
    ['trees', 'mountains'].every((key) => {
      const category = template.categories.find((item) => item.key === key);
      return (
        category?.input === 'counts' &&
        ['height1', 'height2', 'height3'].every((height) => category.inputs?.includes(height))
      );
    })
  );
}

/** Counts and printed card points are whole numbers; no artificial upper limit. */
export function wholeCounter(value: unknown, min = 0): number {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.max(min, Math.trunc(value))
    : min;
}

export function heightCounter(value: RawValue | undefined, height: string): number {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? wholeCounter(value[height])
    : 0;
}

export function animalCardPoints(value: RawValue | undefined): number[] {
  const list = Array.isArray(value) ? value : typeof value === 'number' ? [value] : [];
  return list.map((points) => wholeCounter(points));
}

/** Missing lists show ready inputs; an explicitly saved empty list stays empty. */
export function readyAnimalCardPoints(value: RawValue | undefined): number[] {
  return value === undefined ? Array<number>(8).fill(0) : animalCardPoints(value);
}

export type AnimalCardEdit =
  | { type: 'add'; points: number }
  | { type: 'edit'; index: number; points: number }
  | { type: 'delete'; index: number };

/** Every edit returns a persisted raw list, including cards worth zero points. */
export function editAnimalCards(cards: readonly number[], edit: AnimalCardEdit): number[] {
  if (edit.type === 'add') return [...cards, wholeCounter(edit.points)];
  if (!Number.isInteger(edit.index) || edit.index < 0 || edit.index >= cards.length)
    return [...cards];
  return edit.type === 'delete'
    ? cards.filter((_, index) => index !== edit.index)
    : cards.map((points, index) => (index === edit.index ? wholeCounter(edit.points) : points));
}
