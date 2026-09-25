import { describe, expect, it } from 'vitest';
import { isPubliclyVisibleCafe } from './visibility.js';

describe('isPubliclyVisibleCafe', () => {
  it('hides pending and declined', () => {
    expect(isPubliclyVisibleCafe('pending')).toBe(false);
    expect(isPubliclyVisibleCafe('declined')).toBe(false);
  });

  it('shows granted and public_info_only', () => {
    expect(isPubliclyVisibleCafe('granted')).toBe(true);
    expect(isPubliclyVisibleCafe('public_info_only')).toBe(true);
  });
});
