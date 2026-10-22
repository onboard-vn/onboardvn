import { t } from '../../ui/i18n';
import { CAFE_DAY_KEYS, type CafeOpeningHours } from '@onboard/shared';
import { DAY_LABELS } from '../cafes/labels';

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

export const normalizeTime = (raw: string): string => {
  const m = /^(\d{1,2}):?(\d{2})$/.exec(raw.trim());
  return m ? `${m[1]!.padStart(2, '0')}:${m[2]}` : raw.trim();
};

export function validateHours(hours: CafeOpeningHours): string | null {
  if (!hours) return null;
  for (const day of CAFE_DAY_KEYS) {
    for (const range of hours[day] ?? []) {
      if (!TIME_RE.test(normalizeTime(range.open)) || !TIME_RE.test(normalizeTime(range.close))) {
        return t('Giờ {day} phải theo định dạng HH:MM (00:00-23:59)', { day: t(DAY_LABELS[day]) });
      }
    }
  }
  return null;
}

export function normalizeHours(hours: CafeOpeningHours): CafeOpeningHours {
  if (!hours) return hours;
  const next = { ...hours };
  for (const day of CAFE_DAY_KEYS) {
    const ranges = hours[day];
    if (ranges) {
      next[day] = ranges.map((r) => ({
        open: normalizeTime(r.open),
        close: normalizeTime(r.close),
      }));
    }
  }
  return next;
}
