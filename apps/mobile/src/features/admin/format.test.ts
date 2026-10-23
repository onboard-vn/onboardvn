import { afterEach, describe, expect, it } from 'vitest';
import { setActiveLanguage } from '../../ui/i18n';
import { formatVnDateTime } from './format';

describe('formatVnDateTime', () => {
  afterEach(() => setActiveLanguage('vi'));

  it('renders Asia/Saigon wall-clock time', () => {
    expect(formatVnDateTime('2026-09-27T12:00:00.000Z')).toBe('19:00, Chủ nhật 27/09/2026');
  });

  it('renders the same wall-clock time with English weekday labels', () => {
    setActiveLanguage('en');
    expect(formatVnDateTime('2026-09-27T12:00:00.000Z')).toBe('19:00, Sunday 27/09/2026');
  });
});
