import { describe, expect, it } from 'vitest';
import { facebookPagePluginUrl, isFacebookFanpageUrl } from './cafe-fanpage';

describe('isFacebookFanpageUrl', () => {
  it('accepts a facebook.com URL', () => {
    expect(isFacebookFanpageUrl('https://facebook.com/onboardvn')).toBe(true);
  });

  it('accepts a www.facebook.com URL', () => {
    expect(isFacebookFanpageUrl('https://www.facebook.com/onboardvn')).toBe(true);
  });

  it('rejects a non-Facebook URL', () => {
    expect(isFacebookFanpageUrl('https://instagram.com/onboardvn')).toBe(false);
  });

  it('rejects a lookalike host', () => {
    expect(isFacebookFanpageUrl('https://facebook.com.evil.test/onboardvn')).toBe(false);
  });

  it('rejects undefined/empty input', () => {
    expect(isFacebookFanpageUrl(undefined)).toBe(false);
    expect(isFacebookFanpageUrl('')).toBe(false);
  });

  it('rejects a malformed URL', () => {
    expect(isFacebookFanpageUrl('not-a-url')).toBe(false);
  });
});

describe('facebookPagePluginUrl', () => {
  it('embeds the fanpage URL as the href param', () => {
    const embed = facebookPagePluginUrl('https://facebook.com/onboardvn');
    expect(embed).toContain('href=https%3A%2F%2Ffacebook.com%2Fonboardvn');
    expect(embed.startsWith('https://www.facebook.com/plugins/page.php?')).toBe(true);
  });
});
