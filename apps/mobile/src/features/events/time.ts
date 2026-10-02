/** Vietnam has a fixed UTC+7 offset (no DST), so wall-clock math can be done without a tz DB. */
const VN_OFFSET_MS = 7 * 60 * 60 * 1000;
const WEEKDAYS_VI = ['Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy'];

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

/** Local VN wall-clock string from a `<input type="datetime-local">` (e.g. `2026-09-27T19:00`)
 * → UTC ISO string for the API. */
export function localDateTimeInputToIso(value: string): string {
  const [datePart, timePart] = value.split('T');
  const [y, m, d] = (datePart ?? '').split('-').map(Number);
  const [hh, mm] = (timePart ?? '').split(':').map(Number);
  const utcMs = Date.UTC(y ?? 0, (m ?? 1) - 1, d ?? 1, (hh ?? 0) - 7, mm ?? 0, 0, 0);
  return new Date(utcMs).toISOString();
}

/** UTC ISO string → value for `<input type="datetime-local">` in Asia/Saigon wall-clock time. */
export function isoToLocalDateTimeInputValue(iso: string): string {
  const vn = new Date(new Date(iso).getTime() + VN_OFFSET_MS);
  return `${vn.getUTCFullYear()}-${pad(vn.getUTCMonth() + 1)}-${pad(vn.getUTCDate())}T${pad(vn.getUTCHours())}:${pad(vn.getUTCMinutes())}`;
}

/** `YYYY-MM-DD` calendar day (Asia/Saigon) a UTC ISO instant falls on. */
export function vnDateKey(iso: string): string {
  return isoToLocalDateTimeInputValue(iso).slice(0, 10);
}

/** `HH:mm, Thứ X DD/MM/YYYY` in Asia/Saigon. */
export function formatVnDateTime(iso: string): string {
  const vn = new Date(new Date(iso).getTime() + VN_OFFSET_MS);
  const weekday = WEEKDAYS_VI[vn.getUTCDay()];
  return `${pad(vn.getUTCHours())}:${pad(vn.getUTCMinutes())}, ${weekday} ${pad(vn.getUTCDate())}/${pad(vn.getUTCMonth() + 1)}/${vn.getUTCFullYear()}`;
}

/** `HH:mm` in Asia/Saigon. */
export function formatVnTime(iso: string): string {
  const vn = new Date(new Date(iso).getTime() + VN_OFFSET_MS);
  return `${pad(vn.getUTCHours())}:${pad(vn.getUTCMinutes())}`;
}

/** Current month as `YYYY-MM` in Asia/Saigon, for the calendar view default. */
export function currentVnMonth(): string {
  const vn = new Date(Date.now() + VN_OFFSET_MS);
  return `${vn.getUTCFullYear()}-${pad(vn.getUTCMonth() + 1)}`;
}

/** Today's `YYYY-MM-DD` in Asia/Saigon, for highlighting "today" on the calendar. */
export function todayVnDateKey(): string {
  return vnDateKey(new Date().toISOString());
}

/** `YYYY-MM` shifted by `delta` months (can be negative). */
export function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split('-').map(Number);
  const total = (y ?? 0) * 12 + ((m ?? 1) - 1) + delta;
  const year = Math.floor(total / 12);
  const monthIndex = ((total % 12) + 12) % 12;
  return `${year}-${pad(monthIndex + 1)}`;
}

/** Accepts `YYYY-MM-DD HH:mm` or `YYYY-MM-DDTHH:mm`; returns the `T` form or null when malformed. */
export function normalizeLocalDateTime(value: string): string | null {
  const m = /^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2})$/.exec(value.trim());
  return m ? `${m[1]}T${m[2]}` : null;
}
