import { describe, expect, it } from 'vitest';
import { DEFAULT_PROVINCE_CODE, nearestProvinceCode, provinceCenter } from './nearest-province';

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

describe('provinceCenter', () => {
  it('returns the current capital as [lng, lat] and null for unknown codes', () => {
    expect(provinceCenter(DEFAULT_PROVINCE_CODE)).toEqual([105.85, 21.03]);
    expect(provinceCenter('52')).toEqual([109.22, 13.78]);
    expect(provinceCenter('15')).toEqual([104.91, 21.72]);
    expect(provinceCenter(undefined)).toBeNull();
    expect(provinceCenter('xx')).toBeNull();
  });
});
