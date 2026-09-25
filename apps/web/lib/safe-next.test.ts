import { describe, expect, it } from 'vitest';
import { safeNextPath } from './safe-next';

describe('safeNextPath', () => {
  it('accepts a normal same-origin path with query', () => {
    expect(safeNextPath('/friends?tab=x')).toBe('/friends?tab=x');
  });

  it('accepts a bare path', () => {
    expect(safeNextPath('/invite/abc')).toBe('/invite/abc');
  });

  it('rejects undefined/empty', () => {
    expect(safeNextPath(undefined)).toBeNull();
    expect(safeNextPath('')).toBeNull();
  });

  it('rejects a relative path with no leading slash', () => {
    expect(safeNextPath('foo')).toBeNull();
  });

  it('rejects a protocol-relative URL', () => {
    expect(safeNextPath('//evil.com')).toBeNull();
  });

  it('rejects a backslash trick that browsers normalize to protocol-relative', () => {
    expect(safeNextPath('/\\evil.com')).toBeNull();
  });

  it('rejects a percent-encoded backslash', () => {
    expect(safeNextPath('/%5Cevil.com')).toBeNull();
  });

  it('rejects a percent-encoded control character', () => {
    expect(safeNextPath('/%09/evil.com')).toBeNull();
  });

  it('rejects a javascript: URL', () => {
    expect(safeNextPath('javascript:alert(1)')).toBeNull();
  });

  it('rejects an absolute http(s) URL', () => {
    expect(safeNextPath('http://evil.com')).toBeNull();
    expect(safeNextPath('https://evil.com/x')).toBeNull();
  });

  it('rejects a malformed percent-encoding', () => {
    expect(safeNextPath('/%')).toBeNull();
  });
});
