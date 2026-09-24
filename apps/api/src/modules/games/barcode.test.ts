import { describe, expect, it } from 'vitest';
import { normalizeBarcode } from './barcode.js';

describe('normalizeBarcode', () => {
  it('accepts a valid EAN-13', () => {
    expect(normalizeBarcode('4006381333931')).toBe('4006381333931');
  });

  it('accepts a valid EAN-8', () => {
    expect(normalizeBarcode('96385074')).toBe('96385074');
  });

  it('accepts a valid UPC-A and stores it as a 13-digit EAN with a leading 0', () => {
    expect(normalizeBarcode('036000291452')).toBe('0036000291452');
  });

  it('strips separators before validating', () => {
    expect(normalizeBarcode('4006-3813-33931')).toBe('4006381333931');
  });

  it('rejects a bad checksum with a 422 ApiError', () => {
    expect(() => normalizeBarcode('4006381333930')).toThrowError(
      expect.objectContaining({ status: 422, code: 'VALIDATION_FAILED' }),
    );
  });

  it('rejects an invalid length', () => {
    expect(() => normalizeBarcode('12345')).toThrow();
  });
});
