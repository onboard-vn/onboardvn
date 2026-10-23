import AsyncStorage from '@react-native-async-storage/async-storage';
import { Appearance, Platform } from 'react-native';
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
import { setActiveTheme, type AppTheme } from './theme';

const STORAGE_KEY = 'onboard:app-preferences:v1';

interface Preferences {
  language: Language;
  theme: AppTheme;
}

interface PreferencesContextValue extends Preferences {
  ready: boolean;
  setLanguage: (language: Language) => void;
  setTheme: (theme: AppTheme) => void;
}

const DEFAULT_PREFERENCES: Preferences = { language: 'vi', theme: 'light' };
const PreferencesContext = createContext<PreferencesContextValue | null>(null);

function readPreferences(value: string | null): Preferences {
  if (!value) return DEFAULT_PREFERENCES;
  try {
    const parsed = JSON.parse(value) as Partial<Preferences>;
    return {
      language: parsed.language === 'en' ? 'en' : 'vi',
      theme: parsed.theme === 'dark' ? 'dark' : 'light',
    };
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [preferences, setPreferences] = useState(DEFAULT_PREFERENCES);
  const [ready, setReady] = useState(false);
  const current = useRef(DEFAULT_PREFERENCES);
  const writes = useRef(Promise.resolve());

  useEffect(() => {
    let mounted = true;
    void AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (!mounted) return;
        const loaded = readPreferences(stored);
        current.current = loaded;
        setActiveLanguage(loaded.language);
        setActiveTheme(loaded.theme);
        if (Platform.OS !== 'web') Appearance.setColorScheme(loaded.theme);
        setPreferences(loaded);
      })
      .catch(() => {
        // Keep the usable defaults when local storage is unavailable.
      })
      .finally(() => {
        if (mounted) setReady(true);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const save = useCallback((patch: Partial<Preferences>) => {
    const next = { ...current.current, ...patch };
    current.current = next;
    setPreferences(next);
    setActiveLanguage(next.language);
    setActiveTheme(next.theme);
    if (Platform.OS !== 'web') Appearance.setColorScheme(next.theme);
    writes.current = writes.current
      .catch(() => undefined)
      .then(() => AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)))
      .catch(() => undefined);
  }, []);

  const setLanguage = useCallback((language: Language) => save({ language }), [save]);
  const setTheme = useCallback((theme: AppTheme) => save({ theme }), [save]);

  const value = useMemo(
    () => ({ ...preferences, ready, setLanguage, setTheme }),
    [preferences, ready, setLanguage, setTheme],
  );
  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

export function useAppPreferences(): PreferencesContextValue {
  const value = useContext(PreferencesContext);
  if (!value) throw new Error('useAppPreferences must be used within PreferencesProvider');
  return value;
}
