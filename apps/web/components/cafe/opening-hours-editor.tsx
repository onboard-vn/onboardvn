'use client';

import type { CafeHourRange, CafeOpeningHours } from '@onboard/shared';
import { CAFE_DAY_KEYS } from '@onboard/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DAY_LABELS } from '@/lib/cafe-labels';

const DEFAULT_RANGE: CafeHourRange = { open: '08:00', close: '22:00' };

/** Google-Maps-style opening hours editor: per-day list of ranges (add/remove), "copy to all
 * days", and a free-text note. `close` may be earlier than `open` (qua đêm). */
export function OpeningHoursEditor({
  value,
  onChange,
}: {
  value: CafeOpeningHours;
  onChange: (next: CafeOpeningHours) => void;
}) {
  const hours = value ?? {};

  function setRanges(day: (typeof CAFE_DAY_KEYS)[number], ranges: CafeHourRange[]) {
    onChange({ ...hours, [day]: ranges });
  }

  function addRange(day: (typeof CAFE_DAY_KEYS)[number]) {
    setRanges(day, [...(hours[day] ?? []), DEFAULT_RANGE]);
  }

  function removeRange(day: (typeof CAFE_DAY_KEYS)[number], index: number) {
    setRanges(
      day,
      (hours[day] ?? []).filter((_, i) => i !== index),
    );
  }

  function updateRange(
    day: (typeof CAFE_DAY_KEYS)[number],
    index: number,
    field: 'open' | 'close',
    time: string,
  ) {
    setRanges(
      day,
      (hours[day] ?? []).map((r, i) => (i === index ? { ...r, [field]: time } : r)),
    );
  }

  function copyToAllDays(day: (typeof CAFE_DAY_KEYS)[number]) {
    const ranges = hours[day] ?? [];
    const next = { ...hours };
    for (const d of CAFE_DAY_KEYS) next[d] = ranges;
    onChange(next);
  }

  return (
    <div className="flex flex-col gap-3">
      {CAFE_DAY_KEYS.map((day) => (
        <div
          key={day}
          data-testid={`hours-day-${day}`}
          className="flex flex-col gap-1.5 rounded-md border p-2.5"
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">{DAY_LABELS[day]}</span>
            <div className="flex gap-2">
              <Button type="button" variant="ghost" size="xs" onClick={() => addRange(day)}>
                + Thêm khung giờ
              </Button>
              {(hours[day]?.length ?? 0) > 0 ? (
                <Button type="button" variant="ghost" size="xs" onClick={() => copyToAllDays(day)}>
                  Áp dụng cho mọi ngày
                </Button>
              ) : null}
            </div>
          </div>

          {(hours[day] ?? []).length === 0 ? (
            <p className="text-muted-foreground text-xs">
              {hours[day] === undefined ? 'Chưa có giờ mở cửa' : 'Đóng cửa'}
            </p>
          ) : (
            (hours[day] ?? []).map((range, index) => (
              <div key={index} className="flex items-center gap-2">
                <Input
                  type="time"
                  aria-label={`Giờ mở cửa ${DAY_LABELS[day]}`}
                  value={range.open}
                  onChange={(e) => updateRange(day, index, 'open', e.target.value)}
                  className="w-28"
                />
                <span className="text-muted-foreground text-xs">đến</span>
                <Input
                  type="time"
                  aria-label={`Giờ đóng cửa ${DAY_LABELS[day]}`}
                  value={range.close}
                  onChange={(e) => updateRange(day, index, 'close', e.target.value)}
                  className="w-28"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => removeRange(day, index)}
                  aria-label="Xóa khung giờ"
                >
                  ×
                </Button>
              </div>
            ))
          )}
        </div>
      ))}

      <div className="flex flex-col gap-1">
        <Label htmlFor="hoursNote">Ghi chú giờ mở cửa</Label>
        <Input
          id="hoursNote"
          value={hours.note ?? ''}
          onChange={(e) => onChange({ ...hours, note: e.target.value || undefined })}
          placeholder="Vd: nghỉ lễ Tết, gọi trước khi tới…"
        />
      </div>
    </div>
  );
}
