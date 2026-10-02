import { describe, expect, it } from 'vitest';
import { buildCafeBody, emptyCafeValues, validateCafe } from './cafe-body';

const filled = () => ({
  ...emptyCafeValues(),
  name: ' Quán A ',
  provinceCode: '01',
  wardCode: '0101',
  addressLine: '1 Phố',
});

describe('buildCafeBody', () => {
  it('omits emptied fields on create', () => {
    const body = buildCafeBody(filled(), false);
    expect(body.name).toBe('Quán A');
    expect(body.legacyDistrict).toBeUndefined();
    expect(body.lat).toBeUndefined();
    expect(body.links).toBeUndefined();
    expect(body.openingHours).toBeUndefined();
  });

  it('sends null for emptied fields on edit', () => {
    const body = buildCafeBody(filled(), true);
    expect(body.legacyDistrict).toBeNull();
    expect(body.lat).toBeNull();
    expect(body.links).toBeNull();
    expect(body.feeNote).toBeNull();
  });

  it('builds links when either is set', () => {
    const body = buildCafeBody({ ...filled(), fanpage: 'https://fb.com/x' }, false);
    expect(body.links).toEqual({ fanpage: 'https://fb.com/x', maps: undefined });
  });
});

describe('buildCafeBody phone', () => {
  it('maps phone into links', () => {
    const body = buildCafeBody({ ...filled(), phone: ' 0901234567 ' }, false);
    expect(body.links).toEqual({ phone: '0901234567' });
  });
});

describe('validateCafe', () => {
  it('requires location and name', () => {
    expect(validateCafe(emptyCafeValues())).toBe('Nhập tên quán');
    expect(validateCafe(filled())).toBeNull();
  });
  it('requires sourceUrl unless granted', () => {
    expect(validateCafe({ ...filled(), consentStatus: 'pending' })).toMatch(/sourceUrl/);
    expect(validateCafe({ ...filled(), consentStatus: 'pending', sourceUrl: 'x' })).toBeNull();
  });
});

describe('buildCafeBody keeps links the form does not edit', () => {
  it('merges stored zalo/instagram with edited fields and drops cleared ones', () => {
    const body = buildCafeBody({ ...emptyCafeValues(), name: 'Q', phone: '0901234567' }, true, {
      zalo: '0912345678',
      instagram: 'https://instagram.com/q',
      fanpage: 'https://facebook.com/old',
    });
    expect(body.links).toEqual({
      zalo: '0912345678',
      instagram: 'https://instagram.com/q',
      phone: '0901234567',
    });
  });
});
