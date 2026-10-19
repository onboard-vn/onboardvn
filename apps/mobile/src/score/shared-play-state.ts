import type { PlayDto, RawValue, ScoreTemplate } from '@onboard/shared';
import { TEAM_ID, type PlayOp } from '../api/plays-types';
import type { Player, SheetState } from './model';
import { applyOp, initialState, opCell } from './model';

const AVATAR_COLORS = ['#2563eb', '#db2777', '#16a34a', '#d97706', '#7c3aed', '#0891b2', '#dc2626'];

const colorFor = (seed: string) => {
  let hash = 0;
  for (const character of seed) hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length] ?? AVATAR_COLORS[0]!;
};

function isRawValue(value: unknown): value is RawValue {
  if (typeof value === 'number' || typeof value === 'boolean') return true;
  if (Array.isArray(value)) return value.every((entry) => typeof entry === 'number');
  if (!value || typeof value !== 'object') return false;
  return Object.values(value).every((entry) => typeof entry === 'number');
}

function valuesFromPlay(play: PlayDto): Record<string, Record<string, RawValue>> {
  return Object.fromEntries(
    play.players.map((player) => {
      const values: Record<string, RawValue> = {};
      for (const [key, value] of Object.entries(player.values)) {
        if (isRawValue(value)) values[key] = value;
      }
      return [player.identity.id, values];
    }),
  );
}

export function playersFromPlay(play: PlayDto): Player[] {
  return [...play.players]
    .sort((a, b) => a.seat - b.seat)
    .map(({ identity, seat }) => ({
      id: identity.id,
      name: identity.displayName || `Người chơi ${seat}`,
      kind: identity.kind,
      avatarColor: colorFor(identity.id),
    }));
}

export function sheetStateFromPlay(template: ScoreTemplate, play: PlayDto): SheetState {
  const players = playersFromPlay(play);
  const state = initialState(players);
  state.values = valuesFromPlay(play);
  const roundLists = Object.fromEntries(
    play.players.map((player) => [player.identity.id, Object.values(player.rounds ?? {})[0] ?? []]),
  );
  state.rounds = roundLists;
  state.roundCount = Math.max(1, ...Object.values(roundLists).map((rounds) => rounds.length));
  state.outcome = play.outcome;

  for (const category of template.categories) {
    if (category.scope !== 'team') continue;
    const value = play.players.find((player) => player.values[category.key] !== undefined)?.values[
      category.key
    ];
    if (isRawValue(value)) state.teamValues[category.key] = value;
  }
  // Team categories are projected onto the single local team row. The server scorer reads the
  // team value from any member; the mutation adapter writes it to the first seated identity.
  return state;
}

export function mergePendingEdits(snapshot: SheetState, current: SheetState): SheetState {
  let merged: SheetState = {
    ...snapshot,
    mode: current.mode,
    extras: current.extras,
    pendingOps: current.pendingOps,
  };
  for (const op of current.pendingOps) merged = applyOp(merged, op);
  return merged;
}

export function applyPersistedOps(snapshot: SheetState, ops: PlayOp[]): SheetState {
  let merged = snapshot;
  for (const op of ops) {
    const cell = opCell(op);
    merged = applyOp(merged, op);
    merged.pendingOps = [...merged.pendingOps.filter((pending) => opCell(pending) !== cell), op];
  }
  return merged;
}

export const sharedTeamIdentity = (play: PlayDto): string | null =>
  [...play.players].sort((a, b) => a.seat - b.seat)[0]?.identity.id ?? null;

export const SHARED_TEAM_ID = TEAM_ID;
