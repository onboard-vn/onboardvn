import { describe, expect, it } from 'vitest';
import { readPreferences, resolvePreferences } from './preferences-model';

describe('device preference defaults', () => {
  it.each(['vi', 'vi-VN', 'vi_VN', 'VI-vn'])(
    'uses Vietnamese for %s without storing overrides',
    (locale) => {
      const overrides = readPreferences(null);
      expect(resolvePreferences(overrides, locale, 'light')).toEqual({
        language: 'vi',
        theme: 'light',
        themePreference: 'system',
      });
      expect(overrides).toEqual({});
    },
  );

  it.each(['en', 'en-US', 'fr-FR', 'viking', '', undefined])(
    'uses English for locale %s',
    (locale) => {
      expect(resolvePreferences(readPreferences(null), locale, 'dark')).toEqual({
        language: 'en',
        theme: 'dark',
        themePreference: 'system',
      });
    },
  );

  it.each([
    ['dark', 'dark'],
    ['light', 'light'],
    [null, 'light'],
    [undefined, 'light'],
    ['unspecified', 'light'],
  ])('resolves device theme %s as %s', (deviceTheme, expectedTheme) => {
    expect(resolvePreferences({}, 'vi-VN', deviceTheme)).toEqual({
      language: 'vi',
      theme: expectedTheme,
      themePreference: 'system',
    });
  });
});

describe('stored preference compatibility', () => {
  it.each([
    ['vi', 'light', 'en-US', 'dark'],
    ['en', 'dark', 'vi-VN', 'light'],
  ] as const)(
    'honors existing manual %s/%s settings over the device',
    (language, theme, locale, deviceTheme) => {
      const overrides = readPreferences(JSON.stringify({ language, theme }));
      expect(overrides).toEqual({ language, theme });
      expect(resolvePreferences(overrides, locale, deviceTheme)).toEqual({
        language,
        theme,
        themePreference: theme,
      });
    },
  );

  it.each(['', '{', 'null', 'true', '42', '"vi"', '[]', '[{"language":"vi"}]'])(
    'ignores unusable storage %s',
    (stored) => {
      const overrides = readPreferences(stored);
      expect(overrides).toEqual({});
      expect(resolvePreferences(overrides, 'vi-VN', 'dark')).toEqual({
        language: 'vi',
        theme: 'dark',
        themePreference: 'system',
      });
    },
  );

  it.each([
    {},
    { language: null, theme: null },
    { language: 'fr', theme: 'sepia' },
    { language: 'VI', theme: 'DARK' },
    { language: false, theme: 0 },
    { language: {}, theme: [] },
  ])('leaves missing or invalid fields unpinned: %j', (stored) => {
    const overrides = readPreferences(JSON.stringify(stored));
    expect(overrides).toEqual({});
    expect(resolvePreferences(overrides, 'vi-VN', 'dark')).toEqual({
      language: 'vi',
      theme: 'dark',
      themePreference: 'system',
    });
    expect(resolvePreferences(overrides, 'en-US', 'light')).toEqual({
      language: 'en',
      theme: 'light',
      themePreference: 'system',
    });
  });

  it.each([{ language: 'vi' }, { language: 'vi', theme: 'invalid' }])(
    'keeps a language override independent of device theme: %j',
    (stored) => {
      const overrides = readPreferences(JSON.stringify(stored));
      expect(overrides).toEqual({ language: 'vi' });
      expect(resolvePreferences(overrides, 'en-US', 'dark').theme).toBe('dark');
      expect(resolvePreferences(overrides, 'en-US', 'light')).toEqual({
        language: 'vi',
        theme: 'light',
        themePreference: 'system',
      });
    },
  );

  it.each([{ theme: 'dark' }, { language: 'invalid', theme: 'dark' }])(
    'keeps a theme override independent of device language: %j',
    (stored) => {
      const overrides = readPreferences(JSON.stringify(stored));
      expect(overrides).toEqual({ theme: 'dark' });
      expect(resolvePreferences(overrides, 'vi-VN', 'light').language).toBe('vi');
      expect(resolvePreferences(overrides, 'en-US', 'light')).toEqual({
        language: 'en',
        theme: 'dark',
        themePreference: 'dark',
      });
    },
  );

  it('follows changed device appearance after a stored system choice', () => {
    const overrides = readPreferences('{"language":"en","theme":"system"}');
    expect(overrides).toEqual({ language: 'en', theme: 'system' });
    expect(resolvePreferences(overrides, 'vi-VN', 'dark')).toEqual({
      language: 'en',
      theme: 'dark',
      themePreference: 'system',
    });
    expect(resolvePreferences(overrides, 'vi-VN', 'light')).toEqual({
      language: 'en',
      theme: 'light',
      themePreference: 'system',
    });
    expect(overrides).toEqual({ language: 'en', theme: 'system' });
  });
});
