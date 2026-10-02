import { describe, expect, it } from 'vitest';
import {
  currentVnMonth,
  formatVnDateTime,
  formatVnTime,
  isoToLocalDateTimeInputValue,
  localDateTimeInputToIso,
  normalizeLocalDateTime,
  shiftMonth,
  vnDateKey,
} from './time';

describe('localDateTimeInputToIso', () => {
  it('converts VN wall-clock time to UTC', () => {
    expect(localDateTimeInputToIso('2026-09-27T19:00')).toBe('2026-09-27T12:00:00.000Z');
  });

  it('handles the day rollover into the previous UTC day', () => {
    expect(localDateTimeInputToIso('2026-01-01T03:00')).toBe('2025-12-31T20:00:00.000Z');
  });
});

describe('isoToLocalDateTimeInputValue', () => {
  it('round-trips with localDateTimeInputToIso', () => {
    expect(isoToLocalDateTimeInputValue('2026-09-27T12:00:00.000Z')).toBe('2026-09-27T19:00');
  });
});

describe('vnDateKey', () => {
  it('returns the VN calendar day even when UTC day differs', () => {
    // 2026-09-27T18:00Z = 2026-09-28T01:00 in Asia/Saigon.
    expect(vnDateKey('2026-09-27T18:00:00.000Z')).toBe('2026-09-28');
  });
});

describe('formatVnDateTime / formatVnTime', () => {
  it('formats with weekday and VN time', () => {
    expect(formatVnDateTime('2026-09-27T12:00:00.000Z')).toBe('19:00, Chủ nhật 27/09/2026');
    expect(formatVnTime('2026-09-27T12:00:00.000Z')).toBe('19:00');
  });
});

describe('shiftMonth', () => {
  it('shifts forward and backward across year boundaries', () => {
    expect(shiftMonth('2026-12', 1)).toBe('2027-01');
    expect(shiftMonth('2026-01', -1)).toBe('2025-12');
    expect(shiftMonth('2026-05', 0)).toBe('2026-05');
  });
});

describe('currentVnMonth', () => {
  it('returns a YYYY-MM string', () => {
    expect(currentVnMonth()).toMatch(/^\d{4}-\d{2}$/);
  });
});

describe('normalizeLocalDateTime', () => {
  it('accepts space and T separators', () => {
    expect(normalizeLocalDateTime('2026-10-05 19:30')).toBe('2026-10-05T19:30');
    expect(normalizeLocalDateTime('2026-10-05T19:30')).toBe('2026-10-05T19:30');
  });
  it('rejects malformed input', () => {
    expect(normalizeLocalDateTime('05/10/2026 19:30')).toBeNull();
    expect(normalizeLocalDateTime('')).toBeNull();
  });
});
