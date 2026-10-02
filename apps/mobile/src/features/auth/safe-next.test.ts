import { describe, expect, it } from 'vitest';
import { safeNextPath } from './safe-next';

describe('safeNextPath', () => {
  it('keeps same-origin paths with query and hash', () => {
    expect(safeNextPath('/invite/abc?x=1#top')).toBe('/invite/abc?x=1#top');
  });

  it('rejects missing, absolute and protocol-relative values', () => {
    expect(safeNextPath(undefined)).toBeNull();
    expect(safeNextPath('https://evil.com')).toBeNull();
    expect(safeNextPath('//evil.com')).toBeNull();
    expect(safeNextPath('games')).toBeNull();
  });

  it('rejects backslash and control-char tricks, raw or encoded', () => {
    expect(safeNextPath('/\\evil.com')).toBeNull();
    expect(safeNextPath('/a%0d%0ab')).toBeNull();
    expect(safeNextPath('/a%5Cb')).toBeNull();
    expect(safeNextPath('/%E0%A4%A')).toBeNull();
  });
});
