import { describe, expect, it } from 'vitest';
import { authErrorMessage } from './auth-errors';

describe('authErrorMessage', () => {
  it('maps known Better Auth codes to Vietnamese', () => {
    expect(authErrorMessage({ code: 'USERNAME_IS_ALREADY_TAKEN' })).toBe(
      'Tên đăng nhập đã có người dùng',
    );
  });

  it('prefers the rate-limit message for 429', () => {
    expect(authErrorMessage({ status: 429, code: 'X' })).toMatch(/quá nhiều/);
  });

  it('falls back to the server message, then a generic one', () => {
    expect(authErrorMessage({ code: 'UNKNOWN', message: 'raw' })).toBe('raw');
    expect(authErrorMessage({})).toBe('Có lỗi xảy ra, thử lại sau');
  });
});
