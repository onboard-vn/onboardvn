import type { ShelfCondition, ShelfItemDto } from '@onboard/shared';
import { getActiveLanguage, t } from '../../ui/i18n';

export const STALE_DAYS = 90;
const DAY_MS = 86_400_000;

export const CONDITION_OPTIONS: { value: ShelfCondition; label: string }[] = [
  { value: 'new', label: 'Mới' },
  { value: 'like_new', label: 'Như mới' },
  { value: 'good', label: 'Tốt' },
  { value: 'worn', label: 'Cũ' },
];

export const conditionLabel = (c: ShelfCondition | null): string => {
  const label = CONDITION_OPTIONS.find((o) => o.value === c)?.label;
  return label ? t(label) : '—';
};

export type ShelfSort = 'name' | 'lastPlayed' | 'added';

export const SORT_OPTIONS: { value: ShelfSort; label: string }[] = [
  { value: 'name', label: 'Tên' },
  { value: 'lastPlayed', label: 'Lần chơi cuối' },
  { value: 'added', label: 'Mới thêm' },
];

export type ShelfColumn =
  'lastPlayed' | 'condition' | 'sleeved' | 'boxProtected' | 'edition' | 'note';

export const COLUMN_OPTIONS: { value: ShelfColumn; label: string }[] = [
  { value: 'lastPlayed', label: 'Lần chơi cuối' },
  { value: 'condition', label: 'Tình trạng' },
  { value: 'sleeved', label: 'Bọc sleeve' },
  { value: 'boxProtected', label: 'Bọc hộp' },
  { value: 'edition', label: 'Phiên bản' },
  { value: 'note', label: 'Ghi chú' },
];

export const DEFAULT_COLUMNS: ShelfColumn[] = COLUMN_OPTIONS.map((c) => c.value);

export function parseColumns(raw: string | null): ShelfColumn[] {
  if (!raw) return DEFAULT_COLUMNS;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return DEFAULT_COLUMNS;
    const valid = new Set<string>(DEFAULT_COLUMNS);
    return DEFAULT_COLUMNS.filter((c) => parsed.includes(c) && valid.has(c));
  } catch {
    return DEFAULT_COLUMNS;
  }
}

export const gameName = (g: { nameVi: string | null; nameEn: string }) =>
  getActiveLanguage() === 'en' ? g.nameEn || g.nameVi || '' : g.nameVi || g.nameEn;

export function daysSince(iso: string, now: number): number {
  return Math.max(0, Math.floor((now - new Date(iso).getTime()) / DAY_MS));
}

export function isStale(lastPlayedAt: string | null, now: number): boolean {
  return lastPlayedAt === null || daysSince(lastPlayedAt, now) > STALE_DAYS;
}

export function formatLastPlayed(lastPlayedAt: string | null, now: number): string {
  if (lastPlayedAt === null) return t('Chưa chơi');
  const d = daysSince(lastPlayedAt, now);
  if (d === 0) return t('Hôm nay');
  if (d < 7) return t('{count} ngày trước', { count: d });
  if (d < 30) return t('{count} tuần trước', { count: Math.floor(d / 7) });
  if (d < 365) return t('{count} tháng trước', { count: Math.floor(d / 30) });
  return t('{count} năm trước', { count: Math.floor(d / 365) });
}

const time = (iso: string | null) => (iso ? new Date(iso).getTime() : -Infinity);

export function sortShelf(items: ShelfItemDto[], sort: ShelfSort): ShelfItemDto[] {
  const copy = [...items];
  if (sort === 'name') {
    const locale = getActiveLanguage() === 'en' ? 'en' : 'vi';
    return copy.sort((a, b) => gameName(a.game).localeCompare(gameName(b.game), locale));
  }
  if (sort === 'added') return copy.sort((a, b) => time(b.createdAt) - time(a.createdAt));
  return copy.sort((a, b) => time(a.lastPlayedAt) - time(b.lastPlayedAt));
}
