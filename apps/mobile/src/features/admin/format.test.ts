import { describe, expect, it } from 'vitest';
import { formatVnDateTime } from './format';

describe('formatVnDateTime', () => {
  it('renders Asia/Saigon wall-clock time', () => {
    expect(formatVnDateTime('2026-09-27T12:00:00.000Z')).toBe('19:00, Chủ nhật 27/09/2026');
  });
});
