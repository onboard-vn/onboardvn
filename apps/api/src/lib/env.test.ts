import { describe, expect, it } from 'vitest';
import { testEnv } from '../test/global-setup.js';
import { parseEnv } from './env.js';

const base = testEnv();

describe('parseEnv SMTP', () => {
  it('fails fast in production without SMTP_URL / MAIL_FROM', () => {
    expect(() => parseEnv({ ...base, NODE_ENV: 'production' })).toThrow(/SMTP_URL[\s\S]*MAIL_FROM/);
  });

  it('treats empty strings as missing in production', () => {
    expect(() =>
      parseEnv({ ...base, NODE_ENV: 'production', SMTP_URL: '', MAIL_FROM: '' }),
    ).toThrow(/SMTP_URL/);
  });

  it('accepts production with SMTP configured', () => {
    const env = parseEnv({
      ...base,
      NODE_ENV: 'production',
      SMTP_URL: 'smtps://user:pass@smtp.gmail.com:465',
      MAIL_FROM: 'OnBoardVN <no-reply@example.test>',
    });
    expect(env.SMTP_URL).toBe('smtps://user:pass@smtp.gmail.com:465');
  });

  it('keeps SMTP optional outside production', () => {
    expect(parseEnv({ ...base, NODE_ENV: 'development', SMTP_URL: '' }).SMTP_URL).toBeUndefined();
  });
});
