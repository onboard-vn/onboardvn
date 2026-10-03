import { describe, expect, it } from 'vitest';
import { nearestProvinceCode } from './nearest-province';

describe('nearestProvinceCode', () => {
  it('maps cities to their post-merger province', () => {
    expect(nearestProvinceCode(21.0285, 105.8542)).toBe('01');
    expect(nearestProvinceCode(10.7769, 106.7009)).toBe('79');
    expect(nearestProvinceCode(16.0544, 108.2022)).toBe('48');
    expect(nearestProvinceCode(13.9833, 108.0)).toBe('52');
    expect(nearestProvinceCode(20.4388, 106.1621)).toBe('37');
    expect(nearestProvinceCode(10.98, 106.65)).toBe('79');
  });
});
