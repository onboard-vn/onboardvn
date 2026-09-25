import { describe, expect, it } from 'vitest';
import { buildCalendarGrid } from './events-calendar';

describe('buildCalendarGrid', () => {
  it('pads September 2026 to Monday-first full weeks', () => {
    // 2026-09-01 is a Tuesday, so the first row has 1 leading empty cell.
    const weeks = buildCalendarGrid('2026-09', []);
    expect(weeks[0]?.[0]).toEqual({
      date: null,
      inCurrentMonth: false,
      players: 0,
      tables: 0,
      meetupIds: [],
    });
    expect(weeks[0]?.[1]?.date).toBe('2026-09-01');
    expect(weeks.every((w) => w.length === 7)).toBe(true);
    const allDates = weeks.flat().filter((c) => c.inCurrentMonth);
    expect(allDates).toHaveLength(30);
    expect(allDates.at(-1)?.date).toBe('2026-09-30');
  });

  it('merges aggregate counts by date', () => {
    const weeks = buildCalendarGrid('2026-09', [
      { date: '2026-09-15', players: 7, tables: 3, meetupIds: ['a', 'b'] },
    ]);
    const cell = weeks.flat().find((c) => c.date === '2026-09-15');
    expect(cell).toMatchObject({ players: 7, tables: 3, meetupIds: ['a', 'b'] });
  });
});
