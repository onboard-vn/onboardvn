import { describe, expect, it } from 'vitest';
import { getOpenStatus, mergeCafeHourRanges, type CafeOpeningHours } from './cafes.js';

// All timestamps below are UTC instants; Asia/Saigon is UTC+7 with no DST.
function vnTime(isoUtc: string): Date {
  return new Date(isoUtc);
}

describe('getOpenStatus', () => {
  it('returns unknown when hours are absent', () => {
    expect(getOpenStatus(undefined, vnTime('2026-09-25T03:00:00Z'))).toEqual({ state: 'unknown' });
    expect(getOpenStatus(null, vnTime('2026-09-25T03:00:00Z'))).toEqual({ state: 'unknown' });
  });

  it('returns unknown when every day is empty (no ranges anywhere)', () => {
    const hours: CafeOpeningHours = { note: 'gọi trước khi tới' };
    expect(getOpenStatus(hours, vnTime('2026-09-25T03:00:00Z'))).toEqual({ state: 'unknown' });
  });

  it('reports open within a same-day range', () => {
    // 2026-09-25 is a Friday. 10:00 UTC = 17:00 Asia/Saigon.
    const hours: CafeOpeningHours = { fri: [{ open: '08:00', close: '22:00' }] };
    const result = getOpenStatus(hours, vnTime('2026-09-25T10:00:00Z'));
    expect(result).toEqual({ state: 'open', until: '22:00' });
  });

  it('reports closing_soon within the last 60 minutes before close', () => {
    // 14:30 UTC = 21:30 Asia/Saigon, 30 min before 22:00 close.
    const hours: CafeOpeningHours = { fri: [{ open: '08:00', close: '22:00' }] };
    const result = getOpenStatus(hours, vnTime('2026-09-25T14:30:00Z'));
    expect(result).toEqual({ state: 'closing_soon', until: '22:00' });
  });

  it('reports closed with the next opening time on a closed day', () => {
    // Saturday 2026-09-26, closed all day; next range is Monday 08:00.
    const hours: CafeOpeningHours = {
      mon: [{ open: '08:00', close: '22:00' }],
      sat: [],
      sun: [],
    };
    const result = getOpenStatus(hours, vnTime('2026-09-26T03:00:00Z'));
    expect(result).toEqual({ state: 'closed', nextOpen: { day: 'mon', time: '08:00' } });
  });

  it('handles an overnight range that closes past midnight', () => {
    // Friday 20:00 Saigon (13:00 UTC) is within a 18:00-02:00 range.
    const hours: CafeOpeningHours = { fri: [{ open: '18:00', close: '02:00' }] };
    const openResult = getOpenStatus(hours, vnTime('2026-09-25T13:00:00Z'));
    expect(openResult).toEqual({ state: 'open', until: '02:00' });

    // Saturday 01:00 Saigon (Fri 18:00 UTC) still falls in Friday's overnight tail, 60min to close.
    const tailResult = getOpenStatus(hours, vnTime('2026-09-25T18:00:00Z'));
    expect(tailResult).toEqual({ state: 'closing_soon', until: '02:00' });

    // Saturday 03:00 Saigon (Fri 20:00 UTC) is after the overnight range closed.
    const afterResult = getOpenStatus(hours, vnTime('2026-09-25T20:00:00Z'));
    expect(afterResult.state).toBe('closed');
  });

  it('picks the matching range when a day has multiple ranges (lunch break)', () => {
    const hours: CafeOpeningHours = {
      fri: [
        { open: '08:00', close: '11:30' },
        { open: '13:00', close: '22:00' },
      ],
    };
    // 12:00 Saigon (05:00 UTC) — in the gap between ranges.
    const gapResult = getOpenStatus(hours, vnTime('2026-09-25T05:00:00Z'));
    expect(gapResult).toEqual({ state: 'closed', nextOpen: { day: 'fri', time: '13:00' } });

    // 14:00 Saigon (07:00 UTC) — inside the afternoon range.
    const afternoonResult = getOpenStatus(hours, vnTime('2026-09-25T07:00:00Z'));
    expect(afternoonResult).toEqual({ state: 'open', until: '22:00' });
  });

  it('finds next opening across a week boundary (Sunday closed, opens next Monday)', () => {
    // Sunday 2026-09-27, only Monday has hours.
    const hours: CafeOpeningHours = { mon: [{ open: '09:00', close: '18:00' }] };
    const result = getOpenStatus(hours, vnTime('2026-09-27T10:00:00Z'));
    expect(result).toEqual({ state: 'closed', nextOpen: { day: 'mon', time: '09:00' } });
  });

  it('treats touching ranges as continuously open (10-14 + 14-22, at 13:30 open until 22:00)', () => {
    const hours: CafeOpeningHours = {
      fri: [
        { open: '10:00', close: '14:00' },
        { open: '14:00', close: '22:00' },
      ],
    };
    // 13:30 Saigon = 06:30 UTC.
    const result = getOpenStatus(hours, vnTime('2026-09-25T06:30:00Z'));
    expect(result).toEqual({ state: 'open', until: '22:00' });
  });

  it('is defensive against a legacy/malformed stored shape — never throws, reports unknown', () => {
    const legacy = { mon: '8:00-22:00' } as unknown as CafeOpeningHours;
    expect(() => getOpenStatus(legacy, vnTime('2026-09-25T03:00:00Z'))).not.toThrow();
    expect(getOpenStatus(legacy, vnTime('2026-09-25T03:00:00Z'))).toEqual({ state: 'unknown' });

    const garbage = 'not even an object' as unknown as CafeOpeningHours;
    expect(() => getOpenStatus(garbage, vnTime('2026-09-25T03:00:00Z'))).not.toThrow();
  });
});

describe('mergeCafeHourRanges', () => {
  it('merges touching ranges into one', () => {
    const merged = mergeCafeHourRanges([
      { open: '10:00', close: '14:00' },
      { open: '14:00', close: '22:00' },
    ]);
    expect(merged).toEqual([{ open: '10:00', close: '22:00' }]);
  });

  it('merges overlapping ranges into one', () => {
    const merged = mergeCafeHourRanges([
      { open: '10:00', close: '15:00' },
      { open: '14:00', close: '22:00' },
    ]);
    expect(merged).toEqual([{ open: '10:00', close: '22:00' }]);
  });

  it('leaves non-touching ranges separate, regardless of input order', () => {
    const merged = mergeCafeHourRanges([
      { open: '18:00', close: '22:00' },
      { open: '08:00', close: '11:00' },
    ]);
    expect(merged).toEqual([
      { open: '08:00', close: '11:00' },
      { open: '18:00', close: '22:00' },
    ]);
  });
});
