import { describe, expect, it } from 'vitest';
import { authErrorMessage } from './auth-errors';

class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly code?: string,
  ) {
    super(message);
  }
}

describe('authErrorMessage', () => {
  it('maps known codes to Vietnamese', () => {
    expect(authErrorMessage(new ApiError(401, 'x', 'INVALID_EMAIL_OR_PASSWORD'))).toBe(
      'Sai email hoặc mật khẩu',
    );
  });

  it('handles rate limit and unknown codes', () => {
    expect(authErrorMessage(new ApiError(429, 'x'))).toContain('quá nhiều lần');
    expect(authErrorMessage(new ApiError(400, 'Server says no', 'WHAT'))).toBe('Server says no');
  });

  it('falls back for non-API errors', () => {
    expect(authErrorMessage(new Error('boom'))).toBe('Không kết nối được máy chủ');
  });
});
