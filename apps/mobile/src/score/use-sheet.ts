import type { RawValue, ScoreTemplate } from '@onboard/shared';
import { useCallback, useMemo, useState } from 'react';
import {
  initialState,
  playerBounds,
  summarize,
  type SheetMode,
  type SheetState,
  type Summary,
  type Values,
} from './model';

export interface SheetApi {
  template: ScoreTemplate;
  state: SheetState;
  summary: Summary;
  setMode: (m: SheetMode) => void;
  setOutcome: (o: SheetState['outcome']) => void;
  toggleExpansion: (name: string) => void;
  addPlayer: (name: string) => void;
  removePlayer: (id: string) => void;
  renamePlayer: (id: string, name: string) => void;
  setValue: (playerId: string, key: string, value: RawValue) => void;
  patchValues: (patch: Record<string, Values>) => void;
  setTeamValue: (key: string, value: RawValue) => void;
  setQuickTotal: (playerId: string, total: number) => void;
  setExtra: <T>(key: string, value: T) => void;
  reset: () => void;
}

export function useSheet(template: ScoreTemplate): SheetApi {
  const [state, setState] = useState(() => initialState(template));
  const update = useCallback((fn: (s: SheetState) => SheetState) => setState(fn), []);

  const addPlayer = useCallback(
    (name: string) =>
      update((s) => {
        const clean = name.trim();
        if (!clean || s.players.length >= playerBounds(template).max) return s;
        return {
          ...s,
          players: [...s.players, { id: `p${s.nextId}`, name: clean }],
          nextId: s.nextId + 1,
        };
      }),
    [template, update],
  );

  const removePlayer = useCallback(
    (id: string) =>
      update((s) => {
        if (s.players.length <= playerBounds(template).min) return s;
        const { [id]: _v, ...values } = s.values;
        const { [id]: _q, ...quickTotals } = s.quickTotals;
        return { ...s, players: s.players.filter((p) => p.id !== id), values, quickTotals };
      }),
    [template, update],
  );

  const api = useMemo(
    () => ({
      setMode: (mode: SheetMode) => update((s) => ({ ...s, mode })),
      setOutcome: (outcome: SheetState['outcome']) => update((s) => ({ ...s, outcome })),
      toggleExpansion: (name: string) =>
        update((s) => ({
          ...s,
          expansions: s.expansions.includes(name)
            ? s.expansions.filter((e) => e !== name)
            : [...s.expansions, name],
        })),
      renamePlayer: (id: string, name: string) =>
        update((s) => ({
          ...s,
          players: s.players.map((p) => (p.id === id ? { ...p, name } : p)),
        })),
      setValue: (playerId: string, key: string, value: RawValue) =>
        update((s) => ({
          ...s,
          values: { ...s.values, [playerId]: { ...s.values[playerId], [key]: value } },
        })),
      patchValues: (patch: Record<string, Values>) =>
        update((s) => {
          const values = { ...s.values };
          for (const [id, v] of Object.entries(patch)) values[id] = { ...values[id], ...v };
          return { ...s, values };
        }),
      setTeamValue: (key: string, value: RawValue) =>
        update((s) => ({ ...s, teamValues: { ...s.teamValues, [key]: value } })),
      setQuickTotal: (playerId: string, total: number) =>
        update((s) => ({ ...s, quickTotals: { ...s.quickTotals, [playerId]: total } })),
      setExtra: <T>(key: string, value: T) =>
        update((s) => ({ ...s, extras: { ...s.extras, [key]: value } })),
      reset: () => setState(initialState(template)),
    }),
    [template, update],
  );

  const summary = useMemo(() => summarize(template, state), [template, state]);

  return { template, state, summary, addPlayer, removePlayer, ...api };
}
