import type { RawValue, ScoreTemplate } from '@onboard/shared';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { QUICK_KEY, ROUND_KEY, TEAM_ID, type PlayOp } from '../api/plays-types';
import {
  applyOp,
  cellKey,
  initialState,
  opCell,
  playerBounds,
  readCell,
  summarize,
  type Player,
  type SheetMode,
  type SheetState,
  type Summary,
  type Values,
} from './model';
import { mergePendingEdits } from './shared-play-state';

const FLASH_MS = 1600;

type Draft = Pick<PlayOp, 'identityId' | 'categoryKey' | 'roundIndex' | 'inputKey' | 'value'>;

const newOpId = () =>
  'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.floor(Math.random() * 16);
    return (c === 'x' ? r : (r & 3) | 8).toString(16);
  });

export interface SheetApi {
  template: ScoreTemplate;
  state: SheetState;
  summary: Summary;
  presence: Record<string, boolean>;
  canManage: boolean;
  canEditIdentity: (identityId: string) => boolean;
  isFlashed: (identityId: string, categoryKey?: string, roundIndex?: number) => boolean;
  setMode: (m: SheetMode) => void;
  setOutcome: (o: SheetState['outcome']) => void;
  toggleExpansion: (name: string) => void;
  addPlayer: (player: Player) => void;
  removePlayer: (id: string) => void;
  setValue: (playerId: string, key: string, value: RawValue) => void;
  setInputValue: (playerId: string, key: string, inputKey: string, value: number | null) => void;
  patchValues: (patch: Record<string, Values>) => void;
  setTeamValue: (key: string, value: RawValue) => void;
  setQuickTotal: (playerId: string, total: number) => void;
  setRoundScore: (playerId: string, round: number, score: number) => void;
  addRound: () => void;
  removeLastRound: () => void;
  setExtra: <T>(key: string, value: T) => void;
  reset: () => void;
  applyRemote: (op: PlayOp) => void;
  setPresence: (identityId: string, typing: boolean) => void;
  ackOps: (opIds: string[]) => void;
  restorePending: (ops: PlayOp[]) => void;
  applySnapshot: (snapshot: SheetState) => void;
  replaceSnapshot: (snapshot: SheetState) => void;
}

export interface SheetOptions {
  actorId: string;
  saved?: SheetState | null;
  allowIncompleteRoster?: boolean;
  editableIdentityIds?: string[];
  canManage?: boolean;
  canEdit?: boolean;
}

export function useSheet(
  template: ScoreTemplate,
  players: Player[],
  {
    actorId,
    saved,
    editableIdentityIds,
    canManage = true,
    canEdit = true,
    allowIncompleteRoster = false,
  }: SheetOptions,
): SheetApi {
  const [state, setState] = useState<SheetState>(() => saved ?? initialState(players));
  const [presence, setPresenceState] = useState<Record<string, boolean>>({});
  const [flash, setFlash] = useState<Record<string, true>>({});
  const timers = useRef(new Set<ReturnType<typeof setTimeout>>());
  const editableIds = useMemo(() => new Set(editableIdentityIds ?? []), [editableIdentityIds]);
  const canEditIdentity = useCallback(
    (identityId: string) =>
      canEdit && (editableIdentityIds === undefined || canManage || editableIds.has(identityId)),
    [canEdit, canManage, editableIds, editableIdentityIds],
  );

  useEffect(() => {
    const live = timers.current;
    return () => live.forEach(clearTimeout);
  }, []);

  const edit = useCallback(
    (drafts: Draft[]) =>
      setState((s) => {
        let next = s;
        for (const d of drafts) {
          if (
            !canEdit ||
            (d.identityId === TEAM_ID ? !canManage : !canEditIdentity(d.identityId))
          ) {
            continue;
          }
          const previous = readCell(next, d);
          if (
            (d.value === null && previous === undefined) ||
            JSON.stringify(previous) === JSON.stringify(d.value)
          )
            continue;
          const op: PlayOp = { opId: newOpId(), actorId, ...d };
          const cell = opCell(op);
          next = applyOp(next, op);
          next = {
            ...next,
            pendingOps: [...next.pendingOps.filter((o) => opCell(o) !== cell), op],
          };
        }
        return next;
      }),
    [actorId, canEdit, canEditIdentity, canManage],
  );

  const addPlayer = useCallback(
    (player: Player) =>
      setState((s) => {
        if (
          !canEdit ||
          !canManage ||
          s.players.length >= playerBounds(template).max ||
          s.players.some((p) => p.id === player.id)
        ) {
          return s;
        }
        return { ...s, players: [...s.players, player] };
      }),
    [canEdit, canManage, template],
  );

  const removePlayer = useCallback(
    (id: string) =>
      setState((s) => {
        if (
          !canEdit ||
          !canManage ||
          (!allowIncompleteRoster && s.players.length <= playerBounds(template).min)
        )
          return s;
        const { [id]: _v, ...values } = s.values;
        const { [id]: _q, ...quickTotals } = s.quickTotals;
        const { [id]: _r, ...rounds } = s.rounds;
        return {
          ...s,
          players: s.players.filter((p) => p.id !== id),
          values,
          quickTotals,
          rounds,
          pendingOps: s.pendingOps.filter((o) => o.identityId !== id),
        };
      }),
    [canEdit, canManage, template, allowIncompleteRoster],
  );

  const api = useMemo(
    () => ({
      setMode: (mode: SheetMode) =>
        canEdit && canManage ? setState((s) => ({ ...s, mode })) : undefined,
      setOutcome: (outcome: SheetState['outcome']) =>
        canEdit && canManage ? setState((s) => ({ ...s, outcome })) : undefined,
      toggleExpansion: (name: string) =>
        canEdit && canManage
          ? setState((s) => ({
              ...s,
              expansions: s.expansions.includes(name)
                ? s.expansions.filter((e) => e !== name)
                : [...s.expansions, name],
            }))
          : undefined,
      setValue: (playerId: string, key: string, value: RawValue) =>
        edit([{ identityId: playerId, categoryKey: key, value }]),
      setInputValue: (playerId: string, key: string, inputKey: string, value: number | null) =>
        edit([{ identityId: playerId, categoryKey: key, inputKey, value }]),
      patchValues: (patch: Record<string, Values>) =>
        edit(
          Object.entries(patch).flatMap(([identityId, v]) =>
            Object.entries(v).map(([categoryKey, value]) => ({ identityId, categoryKey, value })),
          ),
        ),
      setTeamValue: (key: string, value: RawValue) =>
        edit([{ identityId: TEAM_ID, categoryKey: key, value }]),
      setQuickTotal: (playerId: string, total: number) =>
        edit([{ identityId: playerId, categoryKey: QUICK_KEY, value: total }]),
      setRoundScore: (playerId: string, round: number, score: number) =>
        edit([{ identityId: playerId, categoryKey: ROUND_KEY, roundIndex: round, value: score }]),
      addRound: () => setState((s) => ({ ...s, roundCount: s.roundCount + 1 })),
      removeLastRound: () =>
        setState((s) => {
          if (s.roundCount <= 1) return s;
          const last = s.roundCount - 1;
          const rounds = Object.fromEntries(
            Object.entries(s.rounds).map(([id, l]) => [id, l.slice(0, last)]),
          );
          return {
            ...s,
            roundCount: last,
            rounds,
            pendingOps: s.pendingOps.filter(
              (o) => !(o.categoryKey === ROUND_KEY && (o.roundIndex ?? 0) >= last),
            ),
          };
        }),
      setExtra: <T>(key: string, value: T) =>
        canEdit && canManage
          ? setState((s) => ({ ...s, extras: { ...s.extras, [key]: value } }))
          : undefined,
      reset: () => (canEdit && canManage ? setState((s) => initialState(s.players)) : undefined),
      applyRemote: (op: PlayOp) => {
        const cell = opCell(op);
        setState((s) => (s.pendingOps.some((o) => opCell(o) === cell) ? s : applyOp(s, op)));
        const flashKey = cellKey(op.identityId, op.categoryKey, op.roundIndex);
        setFlash((f) => ({ ...f, [flashKey]: true }));
        const t = setTimeout(() => {
          timers.current.delete(t);
          setFlash(({ [flashKey]: _gone, ...rest }) => rest);
        }, FLASH_MS);
        timers.current.add(t);
      },
      setPresence: (identityId: string, typing: boolean) =>
        setPresenceState((p) => ({ ...p, [identityId]: typing })),
      ackOps: (opIds: string[]) =>
        setState((s) => {
          const done = new Set(opIds);
          return s.pendingOps.some((o) => done.has(o.opId))
            ? { ...s, pendingOps: s.pendingOps.filter((o) => !done.has(o.opId)) }
            : s;
        }),
      restorePending: (ops: PlayOp[]) =>
        setState((s) => {
          let next = s;
          for (const op of ops) {
            if (op.actorId !== actorId) continue;
            next = applyOp(next, op);
            next = {
              ...next,
              pendingOps: [
                ...next.pendingOps.filter((pending) => opCell(pending) !== opCell(op)),
                op,
              ],
            };
          }
          return next;
        }),
      applySnapshot: (snapshot: SheetState) =>
        setState((current) => mergePendingEdits(snapshot, current)),
      replaceSnapshot: (snapshot: SheetState) => setState(snapshot),
    }),
    [actorId, canEdit, canManage, edit],
  );

  const isFlashed = useCallback(
    (identityId: string, categoryKey?: string, roundIndex?: number) =>
      categoryKey === undefined
        ? Object.keys(flash).some((k) => k.startsWith(`${identityId}|`))
        : !!flash[cellKey(identityId, categoryKey, roundIndex)],
    [flash],
  );

  const summary = useMemo(() => summarize(template, state), [template, state]);

  return {
    template,
    state,
    summary,
    presence,
    canManage: canManage && canEdit,
    canEditIdentity,
    isFlashed,
    addPlayer,
    removePlayer,
    ...api,
  };
}
