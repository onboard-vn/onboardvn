import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Lang } from './cards';
import type { GangState } from './engine';

const KEY = 'onboard:the-gang:v1';

export interface SavedSession {
  lang: Lang;
  /** Oldest first; the last entry is the current state, earlier ones back the undo button. */
  states: GangState[];
}

const isSession = (v: unknown): v is SavedSession =>
  !!v && typeof v === 'object' && Array.isArray((v as SavedSession).states);

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
