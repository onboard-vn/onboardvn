import { describe, expect, it } from 'vitest';
import { normalizeHours, normalizeTime, validateHours } from './hours';

describe('normalizeTime', () => {
  it('pads and inserts the colon', () => {
    expect(normalizeTime('8:00')).toBe('08:00');
    expect(normalizeTime('1830')).toBe('18:30');
    expect(normalizeTime('22:15')).toBe('22:15');
  });
});

describe('validateHours', () => {
  it('accepts empty and valid hours', () => {
    expect(validateHours(undefined)).toBeNull();
    expect(validateHours({ mon: [{ open: '8:00', close: '22:00' }] })).toBeNull();
  });

  it('rejects out-of-range times with the day label', () => {
    expect(validateHours({ tue: [{ open: '25:00', close: '22:00' }] })).toContain('Thứ Ba');
  });
});

describe('normalizeHours', () => {
  it('normalizes every range', () => {
    expect(normalizeHours({ sun: [{ open: '9:00', close: '2300' }], note: 'x' })).toEqual({
      sun: [{ open: '09:00', close: '23:00' }],
      note: 'x',
    });
  });
});
