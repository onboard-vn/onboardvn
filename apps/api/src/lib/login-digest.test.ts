import { describe, expect, it } from 'vitest';
import { parseEnv } from './env.js';
import { digestLoginId } from './login-digest.js';

const rawLoginId = 'club-id-from-input-123456789';
const requiredEnv = {
  DATABASE_URL: 'postgres://user:password@localhost:5432/onboard_test',
  BETTER_AUTH_SECRET: 'a'.repeat(32),
  BETTER_AUTH_URL: 'http://localhost:3000',
  WEB_ORIGIN: 'http://localhost:3000',
};

describe('CLUB_LOGIN_HMAC_KEY configuration', () => {
  it('is optional outside production, has a 32-character minimum, and is required in production', () => {
    expect(() => parseEnv({ ...requiredEnv, NODE_ENV: 'test' })).not.toThrow();
    expect(() =>
      parseEnv({ ...requiredEnv, NODE_ENV: 'development', CLUB_LOGIN_HMAC_KEY: 'short' }),
    ).toThrow();
    expect(() =>
      parseEnv({
        ...requiredEnv,
        NODE_ENV: 'production',
        SMTP_URL: 'smtp://localhost',
        MAIL_FROM: 'club@example.test',
      }),
    ).toThrow(/CLUB_LOGIN_HMAC_KEY/);
  });
});

describe('digestLoginId', () => {
  it('returns a deterministic hex HMAC without the input', () => {
    const digest = digestLoginId(rawLoginId);

    expect(digest).toMatch(/^[0-9a-f]{64}$/);
    expect(digestLoginId(rawLoginId)).toBe(digest);
    expect(digest).not.toBe(rawLoginId);
    expect(digest).not.toContain(rawLoginId);
  });

  it('uses the configured key and trims the input', () => {
    const originalKey = process.env.CLUB_LOGIN_HMAC_KEY!;
    const firstDigest = digestLoginId(rawLoginId);
    try {
      process.env.CLUB_LOGIN_HMAC_KEY = `${originalKey}-rotated`;
      expect(digestLoginId(rawLoginId)).not.toBe(firstDigest);
      expect(digestLoginId(`  ${rawLoginId}  `)).toBe(digestLoginId(rawLoginId));
    } finally {
      process.env.CLUB_LOGIN_HMAC_KEY = originalKey;
    }
  });

  it('fails closed without echoing the input when the key is missing', () => {
    const originalKey = process.env.CLUB_LOGIN_HMAC_KEY;
    try {
      delete process.env.CLUB_LOGIN_HMAC_KEY;
      let message = '';
      try {
        digestLoginId(rawLoginId);
      } catch (error) {
        message = error instanceof Error ? error.message : String(error);
      }

      expect(message).toBe('Club login digest key is not configured');
      expect(message).not.toContain(rawLoginId);
    } finally {
      if (originalKey === undefined) delete process.env.CLUB_LOGIN_HMAC_KEY;
      else process.env.CLUB_LOGIN_HMAC_KEY = originalKey;
    }
  });
});
