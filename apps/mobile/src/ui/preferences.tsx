import AsyncStorage from '@react-native-async-storage/async-storage';
import { Appearance, AppState, Platform, useColorScheme } from 'react-native';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { setActiveLanguage, type Language } from './i18n';
import { setActiveTheme } from './theme';
import {
  readPreferences,
  resolvePreferences,
  type PreferenceOverrides,
  type ThemePreference,
} from './preferences-model';

const STORAGE_KEY = 'onboard:app-preferences:v1';

interface PreferencesContextValue extends ReturnType<typeof resolvePreferences> {
  ready: boolean;
  setLanguage: (language: Language) => void;
  setTheme: (theme: ThemePreference) => void;
}

const PreferencesContext = createContext<PreferencesContextValue | null>(null);

function deviceLocale(): string | undefined {
  if (Platform.OS === 'web' && typeof navigator !== 'undefined') return navigator.language;
  try {
    return Intl.DateTimeFormat().resolvedOptions().locale;
  } catch {
    return undefined;
  }
}

function applyNativeTheme(theme: ThemePreference = 'system') {
  if (Platform.OS !== 'web') {
    Appearance.setColorScheme(theme === 'system' ? 'unspecified' : theme);
  }
}

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const systemTheme = useColorScheme();
  const [locale, setLocale] = useState(deviceLocale);
  const [overrides, setOverrides] = useState<PreferenceOverrides>({});
  const [ready, setReady] = useState(false);
  const current = useRef<PreferenceOverrides>({});
  const writes = useRef(Promise.resolve());
  const preferences = resolvePreferences(overrides, locale, systemTheme);

  // Styles and authored copy read these shared values during child rendering.
  setActiveLanguage(preferences.language);
  setActiveTheme(preferences.theme);

  useEffect(() => {
    let mounted = true;
    void AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (!mounted) return;
        const loaded = readPreferences(stored);
        current.current = loaded;
        applyNativeTheme(loaded.theme);
        setOverrides(loaded);
      })
      .catch(() => {
        if (mounted) applyNativeTheme();
      })
      .finally(() => {
        if (mounted) setReady(true);
      });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const refreshLocale = () => setLocale(deviceLocale());
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.addEventListener('languagechange', refreshLocale);
      return () => window.removeEventListener('languagechange', refreshLocale);
    }
    const listener = AppState.addEventListener('change', (state) => {
      if (state === 'active') refreshLocale();
    });
    return () => listener.remove();
  }, []);

  const save = useCallback((patch: Partial<PreferenceOverrides>) => {
    const next = { ...current.current, ...patch };
    current.current = next;
    if (patch.theme !== undefined) applyNativeTheme(next.theme);
    setOverrides(next);
    writes.current = writes.current
      .catch(() => undefined)
      .then(() => AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)))
      .catch(() => undefined);
  }, []);

  const setLanguage = useCallback((language: Language) => save({ language }), [save]);
  const setTheme = useCallback((theme: ThemePreference) => save({ theme }), [save]);

  const { language, theme, themePreference } = preferences;
  const value = useMemo(
    () => ({ language, theme, themePreference, ready, setLanguage, setTheme }),
    [language, theme, themePreference, ready, setLanguage, setTheme],
  );
  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

export function useAppPreferences(): PreferencesContextValue {
  const value = useContext(PreferencesContext);
  if (!value) throw new Error('useAppPreferences must be used within PreferencesProvider');
  return value;
}
