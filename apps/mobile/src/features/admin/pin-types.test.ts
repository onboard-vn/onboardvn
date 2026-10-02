import { describe, expect, it } from 'vitest';
import { isOutsideVietnam } from './pin-types';

describe('isOutsideVietnam', () => {
  it('flags coordinates outside the bounding box', () => {
    expect(isOutsideVietnam(21.03, 105.85)).toBe(false);
    expect(isOutsideVietnam(48.8, 2.3)).toBe(true);
    expect(isOutsideVietnam(null, null)).toBe(false);
  });
});
