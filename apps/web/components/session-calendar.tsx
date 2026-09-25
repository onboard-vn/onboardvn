'use client';

import type { MeetupCalendarDay } from '@onboard/shared';
import { useRouter } from 'next/navigation';
import { buildCalendarGrid } from '@/lib/events-calendar';
import { shiftMonth, todayVnDateKey } from '@/lib/events-time';
import { Button } from '@/components/ui/button';

const WEEKDAY_LABELS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
const WEEKDAY_FULL = ['Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy', 'Chủ Nhật'];

export function SessionCalendar({
  month,
  days,
  baseHref,
}: {
  month: string;
  days: MeetupCalendarDay[];
  /** Base URL (without `month`/`date`) used to build prev/next/day links, e.g. `/events?view=calendar`. */
  baseHref: string;
}) {
  const router = useRouter();
  const weeks = buildCalendarGrid(month, days);
  const joiner = baseHref.includes('?') ? '&' : '?';
  const today = todayVnDateKey();

  function goToMonth(target: string) {
    router.push(`${baseHref}${joiner}month=${target}`);
  }

  function selectDay(date: string) {
    router.push(`${baseHref}${joiner}month=${month}&date=${date}`);
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <Button variant="outline" size="sm" onClick={() => goToMonth(shiftMonth(month, -1))}>
          ← Tháng trước
        </Button>
        <p className="text-sm font-medium">Tháng {month}</p>
        <Button variant="outline" size="sm" onClick={() => goToMonth(shiftMonth(month, 1))}>
          Tháng sau →
        </Button>
      </div>

      <div role="row" className="grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground">
        {WEEKDAY_LABELS.map((label) => (
          <span
            key={label}
            role="columnheader"
            aria-label={WEEKDAY_FULL[WEEKDAY_LABELS.indexOf(label)]}
          >
            {label}
          </span>
        ))}
      </div>

      <div role="grid" aria-label={`Lịch tháng ${month}`} className="flex flex-col gap-1">
        {weeks.map((week, weekIndex) => (
          <div role="row" key={weekIndex} className="grid grid-cols-7 gap-1">
            {week.map((cell, i) => {
              const busy = cell.inCurrentMonth && (cell.tables > 0 || cell.players > 0);
              const isToday = cell.date === today;
              const label = cell.date
                ? `${cell.date}${busy ? `: ${cell.players} người, ${cell.tables} bàn` : ': không có Kèo'}`
                : undefined;
              return (
                <button
                  key={cell.date ?? `pad-${i}`}
                  type="button"
                  role="gridcell"
                  aria-label={label}
                  disabled={!cell.inCurrentMonth}
                  onClick={() => cell.date && selectDay(cell.date)}
                  className={`flex min-h-16 flex-col items-start gap-0.5 rounded-md border p-1.5 text-left text-xs disabled:opacity-30 ${
                    busy ? 'border-primary/40 bg-primary/5' : 'border-transparent'
                  } ${isToday ? 'ring-2 ring-primary' : ''}`}
                >
                  {cell.date ? (
                    <span className="font-medium">{Number(cell.date.slice(-2))}</span>
                  ) : null}
                  {busy ? (
                    <span className="text-muted-foreground">
                      {cell.players} người · {cell.tables} bàn
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
