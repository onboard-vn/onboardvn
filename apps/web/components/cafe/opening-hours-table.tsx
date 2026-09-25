import type { CafeDayKey, CafeOpeningHours, CafeOpenStatus } from '@onboard/shared';
import { CAFE_DAY_KEYS } from '@onboard/shared';
import { cn } from 'cn';
import { DAY_LABELS, openStatusLabel } from '@/lib/cafe-labels';

function formatRanges(hours: CafeOpeningHours, day: CafeDayKey): string {
  const ranges = hours?.[day] ?? [];
  if (ranges.length === 0) return 'Đóng cửa';
  return ranges.map((r) => `${r.open}–${r.close}`).join(', ');
}

/** Asia/Saigon weekday key for "today", computed server-side. */
export function todayDayKey(now: Date = new Date()): CafeDayKey {
  const weekday = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Saigon',
    weekday: 'short',
  }).format(now);
  const index = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 }[weekday] ?? 0;
  return CAFE_DAY_KEYS[index]!;
}

/** Google-Maps-style read-only hours table, today's row highlighted, with the open/closed
 * status line above it. */
export function OpeningHoursTable({
  hours,
  openStatus,
  today = todayDayKey(),
}: {
  hours: CafeOpeningHours;
  openStatus?: CafeOpenStatus;
  today?: CafeDayKey;
}) {
  if (!hours || CAFE_DAY_KEYS.every((d) => (hours[d]?.length ?? 0) === 0)) return null;
  const statusText = openStatusLabel(openStatus);

  return (
    <div className="text-sm">
      <h2 className="font-medium">Giờ mở cửa</h2>
      {statusText ? (
        <p
          className={cn(
            'mt-1 text-sm font-medium',
            openStatus?.state === 'open' && 'text-emerald-700 dark:text-emerald-400',
            openStatus?.state === 'closing_soon' && 'text-amber-700 dark:text-amber-400',
            openStatus?.state === 'closed' && 'text-muted-foreground',
          )}
        >
          {statusText}
        </p>
      ) : null}
      <ul className="mt-1">
        {CAFE_DAY_KEYS.map((day) => (
          <li
            key={day}
            className={cn(
              'flex justify-between gap-4 py-0.5',
              day === today ? 'font-semibold' : 'text-muted-foreground',
            )}
          >
            <span>{DAY_LABELS[day]}</span>
            <span>{formatRanges(hours, day)}</span>
          </li>
        ))}
      </ul>
      {hours.note ? <p className="text-muted-foreground mt-1 text-xs">{hours.note}</p> : null}
    </div>
  );
}
