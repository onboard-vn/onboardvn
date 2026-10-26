import type { Language } from './i18n';
import type { AppTheme } from './theme';

export type ThemePreference = 'system' | AppTheme;

/** Only explicit choices are stored, so changing one setting never pins the other. */
export interface PreferenceOverrides {
  language?: Language;
  theme?: ThemePreference;
}

export function readPreferences(value: string | null): PreferenceOverrides {
  if (!value) return {};
  try {
    const parsed: unknown = JSON.parse(value);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    const { language, theme } = parsed as Record<string, unknown>;
    return {
      ...(language === 'vi' || language === 'en' ? { language } : {}),
      ...(theme === 'system' || theme === 'light' || theme === 'dark' ? { theme } : {}),
    };
  } catch {
    return {};
  }
}

export function resolvePreferences(
  overrides: PreferenceOverrides,
  deviceLocale: string | undefined,
  deviceTheme: string | null | undefined,
) {
  const themePreference = overrides.theme ?? 'system';
  const language: Language =
    overrides.language ?? (/^vi(?:[-_]|$)/i.test(deviceLocale ?? '') ? 'vi' : 'en');
  const theme: AppTheme =
    themePreference === 'system' ? (deviceTheme === 'dark' ? 'dark' : 'light') : themePreference;
  return { language, theme, themePreference };
}
