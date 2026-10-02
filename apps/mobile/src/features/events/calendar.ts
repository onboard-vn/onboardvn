import type { MeetupCalendarDay } from '@onboard/shared';

export interface CalendarCell {
  date: string | null;
  inCurrentMonth: boolean;
  players: number;
  tables: number;
  meetupIds: string[];
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

const EMPTY_CELL: CalendarCell = {
  date: null,
  inCurrentMonth: false,
  players: 0,
  tables: 0,
  meetupIds: [],
};

/** Builds a Monday-first month grid for `/events?view=calendar`, padded to full weeks. */
export function buildCalendarGrid(month: string, days: MeetupCalendarDay[]): CalendarCell[][] {
  const [y, m] = month.split('-').map(Number);
  const year = y ?? 1970;
  const monthNum = m ?? 1;
  const firstWeekday = (new Date(Date.UTC(year, monthNum - 1, 1)).getUTCDay() + 6) % 7;
  const daysInMonth = new Date(Date.UTC(year, monthNum, 0)).getUTCDate();
  const byDate = new Map(days.map((d) => [d.date, d]));

  const cells: CalendarCell[] = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(EMPTY_CELL);
  for (let day = 1; day <= daysInMonth; day++) {
    const date = `${year}-${pad(monthNum)}-${pad(day)}`;
    const agg = byDate.get(date);
    cells.push({
      date,
      inCurrentMonth: true,
      players: agg?.players ?? 0,
      tables: agg?.tables ?? 0,
      meetupIds: agg?.meetupIds ?? [],
    });
  }
  while (cells.length % 7 !== 0) cells.push(EMPTY_CELL);

  const weeks: CalendarCell[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}
