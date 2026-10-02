import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Lang } from './cards';
import type { GangState } from './engine';

const KEY = 'onboard:the-gang:v1';

export interface SavedSession {
  lang: Lang;
  /** Oldest first; the last entry is the current state, earlier ones back the undo button. */
  states: GangState[];
}

const isState = (v: unknown): v is GangState => {
  const s = v as Partial<GangState> | null;
  return (
    !!s &&
    typeof s.config?.mode === 'string' &&
    Array.isArray(s.stacks?.bad) &&
    Array.isArray(s.stacks?.good) &&
    Array.isArray(s.active)
  );
};

const isSession = (v: unknown): v is SavedSession =>
  !!v &&
  typeof v === 'object' &&
  Array.isArray((v as SavedSession).states) &&
  (v as SavedSession).states.every(isState);

export async function loadSession(): Promise<SavedSession | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    return isSession(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export const saveSession = (s: SavedSession) => AsyncStorage.setItem(KEY, JSON.stringify(s));
