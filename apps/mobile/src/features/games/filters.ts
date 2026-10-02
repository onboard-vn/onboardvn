import type { CategoryDto, GameDetailDto, GameSummaryDto } from '@onboard/shared';
import { modeLabel, normalize, playersLabel, type GameEntry } from '../../games/catalog';

export interface Bounds {
  min: number;
  max: number;
  step: number;
}

export interface Range {
  min: number;
  max: number;
}

export const PLAYERS_BOUNDS: Bounds = { min: 1, max: 12, step: 1 };
export const TIME_BOUNDS: Bounds = { min: 15, max: 300, step: 15 };
export const WEIGHT_BOUNDS: Bounds = { min: 1, max: 5, step: 0.5 };

export const fullRange = (b: Bounds): Range => ({ min: b.min, max: b.max });

export const isFullRange = (r: Range, b: Bounds) => r.min <= b.min && r.max >= b.max;

export function stepRange(r: Range, b: Bounds, edge: 'min' | 'max', dir: 1 | -1): Range {
  const next = Math.round((r[edge] + dir * b.step) * 100) / 100;
  if (edge === 'min') return { min: Math.min(Math.max(next, b.min), r.max), max: r.max };
  return { min: r.min, max: Math.max(Math.min(next, b.max), r.min) };
}

export function rangeLabel(r: Range, b: Bounds, unit: string): string {
  if (isFullRange(r, b)) return 'Bất kỳ';
  const lo = r.min > b.min;
  const hi = r.max < b.max;
  const suffix = unit ? ` ${unit}` : '';
  if (lo && hi) return r.min === r.max ? `${r.min}${suffix}` : `${r.min}–${r.max}${suffix}`;
  return lo ? `≥ ${r.min}${suffix}` : `≤ ${r.max}${suffix}`;
}

export interface GameFilterState {
  q: string;
  categoryId?: string;
  players: Range;
  time: Range;
  weight: Range;
}

export const initialGameFilters = (): GameFilterState => ({
  q: '',
  players: fullRange(PLAYERS_BOUNDS),
  time: fullRange(TIME_BOUNDS),
  weight: fullRange(WEIGHT_BOUNDS),
});

export const hasActiveFilters = (f: GameFilterState): boolean =>
  !!f.categoryId ||
  !isFullRange(f.players, PLAYERS_BOUNDS) ||
  !isFullRange(f.time, TIME_BOUNDS) ||
  !isFullRange(f.weight, WEIGHT_BOUNDS);

export function buildGameQuery(f: GameFilterState): Record<string, string | number> {
  const query: Record<string, string | number> = {};
  const q = f.q.trim();
  if (q) query.q = q;
  if (f.categoryId) query.categoryId = f.categoryId;
  if (f.players.min > PLAYERS_BOUNDS.min) query.minPlayers = f.players.min;
  if (f.players.max < PLAYERS_BOUNDS.max) query.maxPlayers = f.players.max;
  if (f.time.min > TIME_BOUNDS.min) query.minTime = f.time.min;
  if (f.time.max < TIME_BOUNDS.max) query.maxTime = f.time.max;
  if (f.weight.min > WEIGHT_BOUNDS.min) query.minWeight = f.weight.min;
  if (f.weight.max < WEIGHT_BOUNDS.max) query.maxWeight = f.weight.max;
  return query;
}

export interface NamedOption {
  id: string;
  label: string;
}

export const categoryOption = (c: Pick<CategoryDto, 'id' | 'name' | 'nameVi'>): NamedOption => ({
  id: c.id,
  label: c.nameVi ?? c.name,
});

export function findOption(options: NamedOption[], text: string): NamedOption | undefined {
  const key = normalize(text);
  return key ? options.find((o) => normalize(o.label) === key) : undefined;
}

export function suggestOptions(options: NamedOption[], text: string, limit = 6): NamedOption[] {
  const key = normalize(text);
  if (!key) return [];
  const starts: NamedOption[] = [];
  const contains: NamedOption[] = [];
  for (const o of options) {
    const label = normalize(o.label);
    if (label === key) continue;
    if (label.startsWith(key)) starts.push(o);
    else if (label.includes(key)) contains.push(o);
  }
  return [...starts, ...contains].slice(0, limit);
}

export interface GameRow {
  slug: string;
  name: string;
  subName: string | null;
  meta: string;
  imageUrl: string | null;
  categories: string[];
  isVietnamese: boolean;
}

const playerText = (min: number | null, max: number | null) => {
  if (min == null && max == null) return '';
  if (min === max || max == null) return `${min} người`;
  if (min == null) return `${max} người`;
  return `${min}-${max} người`;
};

export function summaryMeta(
  g: Pick<GameSummaryDto, 'minPlayers' | 'maxPlayers' | 'playMinutes' | 'weight'>,
): string {
  return [
    playerText(g.minPlayers, g.maxPlayers),
    g.playMinutes ? `${g.playMinutes} phút` : '',
    g.weight ? `Độ khó ${g.weight}` : '',
  ]
    .filter(Boolean)
    .join(' · ');
}

export function rowFromSummary(g: GameSummaryDto): GameRow {
  return {
    slug: g.slug,
    name: g.nameVi || g.nameEn,
    subName: g.nameVi ? g.nameEn : null,
    meta: summaryMeta(g),
    imageUrl: g.imageUrl ?? g.externalThumbUrl ?? null,
    categories: g.categories.map((c) => c.nameVi ?? c.name),
    isVietnamese: g.isVietnamese,
  };
}

export function rowFromLocal(g: GameEntry): GameRow {
  return {
    slug: g.slug,
    name: g.name,
    subName: null,
    meta: [g.year, playersLabel(g.players), modeLabel(g.mode)].filter(Boolean).join(' · '),
    imageUrl: null,
    categories: [],
    isVietnamese: false,
  };
}

export function localMatchesPlayers(g: GameEntry, range: Range): boolean {
  const [lo, hi] = g.players;
  if (lo == null && hi == null) return true;
  const gameMax = hi ?? lo ?? Infinity;
  const gameMin = lo ?? hi ?? 0;
  return gameMax >= range.min && gameMin <= range.max;
}

export interface GameView {
  name: string;
  subName: string | null;
  imageUrl: string | null;
  imageCredit: string | null;
  meta: { label: string; value: string }[];
  categories: string[];
  mechanics: string[];
  description: { text: string; note: string; foreign: boolean } | null;
  bggUrl: string | null;
  isVietnamese: boolean;
  ownersCount: number;
}

export function localView(g: GameEntry): GameView {
  return {
    name: g.name,
    subName: null,
    imageUrl: null,
    imageCredit: null,
    meta: [
      { label: 'Năm', value: g.year ? String(g.year) : '—' },
      { label: 'Số người chơi', value: playersLabel(g.players) || '—' },
      { label: 'Chế độ', value: modeLabel(g.mode) },
    ],
    categories: [],
    mechanics: [],
    description: null,
    bggUrl: null,
    isVietnamese: false,
    ownersCount: 0,
  };
}

export function apiView(g: GameDetailDto, local?: GameEntry): GameView {
  const external = g.external ?? null;
  const externalText = external?.description ?? external?.shortDescription ?? null;
  const description = g.descriptionVi
    ? {
        text: g.descriptionVi,
        note:
          g.descriptionSource === 'translated_with_permission'
            ? `Bản dịch được ${g.descriptionRightsHolder ?? 'NPH'} cho phép`
            : g.descriptionSource === 'translated_from_bgg'
              ? 'Dịch từ mô tả trên BoardGameGeek'
              : 'Mô tả do cộng đồng viết · CC BY-SA 4.0',
        foreign: false,
      }
    : externalText
      ? { text: externalText, note: 'Nguồn: BoardGameGeek', foreign: true }
      : null;
  const players =
    playerText(g.minPlayers, g.maxPlayers) || (local ? playersLabel(local.players) : '');
  return {
    name: g.nameVi || g.nameEn,
    subName: g.nameVi ? g.nameEn : null,
    imageUrl: g.imageUrl ?? external?.imageUrl ?? external?.thumbUrl ?? null,
    imageCredit: g.imageCredit,
    meta: [
      { label: 'Số người chơi', value: players || '—' },
      { label: 'Thời gian', value: g.playMinutes ? `${g.playMinutes} phút` : '—' },
      { label: 'Độ khó', value: g.weight ?? '—' },
      { label: 'Tuổi tối thiểu', value: g.minAge != null ? `${g.minAge}+` : '—' },
    ],
    categories: g.categories.filter((c) => c.kind === 'category').map((c) => c.nameVi ?? c.name),
    mechanics: g.categories.filter((c) => c.kind === 'mechanic').map((c) => c.nameVi ?? c.name),
    description,
    bggUrl: g.bggUrl ?? external?.bggUrl ?? null,
    isVietnamese: g.isVietnamese,
    ownersCount: g.ownersCount,
  };
}
