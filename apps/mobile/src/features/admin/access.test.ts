import { describe, expect, it } from 'vitest';
import { hasAccess } from './access';

describe('hasAccess', () => {
  it('staff allows maintainer and admin only', () => {
    expect(hasAccess('maintainer', 'staff')).toBe(true);
    expect(hasAccess('admin', 'staff')).toBe(true);
    expect(hasAccess('user', 'staff')).toBe(false);
    expect(hasAccess(undefined, 'staff')).toBe(false);
  });
  it('admin allows admin only', () => {
    expect(hasAccess('admin', 'admin')).toBe(true);
    expect(hasAccess('maintainer', 'admin')).toBe(false);
  });
});
