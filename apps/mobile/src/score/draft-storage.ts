import AsyncStorage from '@react-native-async-storage/async-storage';
import type { SheetState, SummaryRow } from './model';

const draftKey = (tableId: string) => `onboard:draft:v1:${tableId}`;
const resultKey = (tableId: string) => `onboard:result:v1:${tableId}`;

export interface FinishedResult {
  finishedAt: string;
  rows: SummaryRow[];
  winners: string[];
  memberCount: number;
  guestCount: number;
}

const isDraft = (v: unknown): v is SheetState => {
  if (!v || typeof v !== 'object') return false;
  const s = v as Partial<SheetState>;
  return (
    Array.isArray(s.players) &&
    typeof s.roundCount === 'number' &&
    !!s.rounds &&
    !!s.values &&
    !!s.quickTotals &&
    !!s.extras
  );
};

async function readJson<T>(key: string, guard: (v: unknown) => v is T): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return guard(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export const loadDraft = (tableId: string) => readJson(draftKey(tableId), isDraft);
export const saveDraft = (tableId: string, state: SheetState) =>
  AsyncStorage.setItem(draftKey(tableId), JSON.stringify(state));
export const clearDraft = (tableId: string) => AsyncStorage.removeItem(draftKey(tableId));

const isResult = (v: unknown): v is FinishedResult =>
  !!v && typeof v === 'object' && Array.isArray((v as FinishedResult).rows);

export const loadResult = (tableId: string) => readJson(resultKey(tableId), isResult);
export const saveResult = (tableId: string, result: FinishedResult) =>
  AsyncStorage.setItem(resultKey(tableId), JSON.stringify(result));
