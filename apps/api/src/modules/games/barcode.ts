import { ApiError } from '../../lib/errors.js';

function checkDigitValid(code: string, oddWeight: number, evenWeight: number): boolean {
  const data = code.slice(0, -1);
  const expected = Number(code.at(-1));
  const sum = data
    .split('')
    .reduce((acc, d, i) => acc + Number(d) * (i % 2 === 0 ? oddWeight : evenWeight), 0);
  return (10 - (sum % 10)) % 10 === expected;
}

/** Normalizes a scanned/typed barcode to digits and validates EAN-13/EAN-8/UPC-A checksum. */
export function normalizeBarcode(raw: string): string {
  const digits = raw.replace(/\D/g, '');

  if (digits.length === 13 && checkDigitValid(digits, 1, 3)) return digits;
  if (digits.length === 8 && checkDigitValid(digits, 3, 1)) return digits;
  // UPC-A is stored as a 13-digit EAN with a leading 0, per GS1's EAN/UPC compatibility rule.
  if (digits.length === 12 && checkDigitValid(digits, 3, 1)) return `0${digits}`;

  throw new ApiError('VALIDATION_FAILED', 422, 'Mã vạch không hợp lệ (sai độ dài hoặc checksum)');
}
