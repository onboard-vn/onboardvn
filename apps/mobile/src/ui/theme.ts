export type AppTheme = 'light' | 'dark';

const lightPalette = {
  bg: '#faf7f0',
  card: '#ffffff',
  border: '#e7e1d6',
  text: '#1c1917',
  muted: '#6b6259',
  primary: '#0f766e',
  onPrimary: '#ffffff',
  onAccent: '#1c1917',
  primarySoft: '#ccfbf1',
  accent: '#f5b82e',
  accentSoft: '#fef3c7',
  brand: '#dc2f26',
  success: '#15803d',
  successSoft: '#dcfce7',
  danger: '#b91c1c',
  dangerSoft: '#fee2e2',
  warnSoft: '#fef3c7',
  warn: '#92400e',
  surfaceMuted: '#f1ece2',
} as const;

const darkPalette = {
  bg: '#111418',
  card: '#1b2026',
  border: '#353d46',
  text: '#f3f4f6',
  muted: '#a8b0ba',
  primary: '#5eead4',
  onPrimary: '#111418',
  onAccent: '#111418',
  primarySoft: '#153f3b',
  accent: '#f5b82e',
  accentSoft: '#4b3a12',
  brand: '#ff8178',
  success: '#4ade80',
  successSoft: '#183c27',
  danger: '#f87171',
  dangerSoft: '#492428',
  warnSoft: '#4b3a12',
  warn: '#fcd34d',
  surfaceMuted: '#272e36',
} satisfies Record<keyof typeof lightPalette, string>;

export type AppColors = { readonly [K in keyof typeof lightPalette]: string };

let activeTheme: AppTheme = 'light';

export const colors = new Proxy({} as AppColors, {
  get(_target, key: keyof AppColors) {
    return (activeTheme === 'dark' ? darkPalette : lightPalette)[key];
  },
});

export function setActiveTheme(theme: AppTheme) {
  activeTheme = theme;
}

export function getActiveTheme(): AppTheme {
  return activeTheme;
}

/**
 * Rebuild a module-level stylesheet when the global palette changes. Existing
 * screens read each style by key during render, so the app-shell preference
 * update makes the new palette visible without discarding screen state.
 */
export function themeStyles<S extends object>(factory: () => S): S {
  let cachedTheme: AppTheme | undefined;
  let cachedStyles: S;

  const getStyles = () => {
    const theme = getActiveTheme();
    if (cachedTheme !== theme) {
      cachedTheme = theme;
      cachedStyles = factory();
    }
    return cachedStyles;
  };

  return new Proxy({} as S, {
    get(_target, key: string | symbol) {
      return getStyles()[key as keyof S];
    },
    has(_target, key) {
      return key in getStyles();
    },
  });
}

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 40 } as const;
export const radius = 12;
export const fontFamily =
  "'Be Vietnam Pro', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";
