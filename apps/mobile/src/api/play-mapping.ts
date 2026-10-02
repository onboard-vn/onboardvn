import {
  FREE_TOTAL_KEY,
  type PlayDto,
  type PlayValueOp,
  type ScoreTemplate,
} from '@onboard/shared';
import { applyOp, initialState, type Player, type SheetState } from '../score/model';
import { avatarColorFor } from '../ui/avatar-color';
import { QUICK_KEY, ROUND_KEY, TEAM_ID, type PlayOp } from './plays-types';

export interface CellMap {
  roundKey: string | null;
  teamKeys: Set<string>;
  teamAnchor: string | null;
}

export const cellMapFor = (template: ScoreTemplate | null, play: PlayDto): CellMap => ({
  roundKey: template?.categories.find((c) => c.input === 'perRound')?.key ?? null,
  teamKeys: new Set(
    template?.categories.filter((c) => c.scope !== 'player').map((c) => c.key) ?? [],
  ),
  teamAnchor: play.players[0]?.identity.id ?? null,
});

type Cell = Pick<PlayOp, 'identityId' | 'categoryKey' | 'roundIndex'>;

export function toServerCell(cell: Cell, map: CellMap): Cell | null {
  const identityId = cell.identityId === TEAM_ID ? map.teamAnchor : cell.identityId;
  if (!identityId) return null;
  if (cell.categoryKey === QUICK_KEY) return { identityId, categoryKey: FREE_TOTAL_KEY };
  if (cell.categoryKey === ROUND_KEY) {
    return map.roundKey
      ? { identityId, categoryKey: map.roundKey, roundIndex: cell.roundIndex ?? 0 }
      : null;
  }
  return { identityId, categoryKey: cell.categoryKey };
}

export function fromServerCell(cell: Cell, map: CellMap): Cell {
  if (map.teamKeys.has(cell.categoryKey)) {
    return { identityId: TEAM_ID, categoryKey: cell.categoryKey };
  }
  if (cell.categoryKey === FREE_TOTAL_KEY && !map.teamKeys.has(FREE_TOTAL_KEY)) {
    return { identityId: cell.identityId, categoryKey: QUICK_KEY };
  }
  if (cell.roundIndex !== undefined && cell.categoryKey === map.roundKey) {
    return { identityId: cell.identityId, categoryKey: ROUND_KEY, roundIndex: cell.roundIndex };
  }
  return cell;
}

export const toServerOp = (op: PlayOp, map: CellMap): PlayValueOp | null => {
  const cell = toServerCell(op, map);
  return cell ? { opId: op.opId, ...cell, value: op.value } : null;
};

type ServerCell = Cell & { value: PlayOp['value'] };

export function playCells(play: PlayDto): ServerCell[] {
  const out: ServerCell[] = [];
  for (const p of play.players) {
    for (const [categoryKey, value] of Object.entries(p.values)) {
      out.push({ identityId: p.identity.id, categoryKey, value: value as PlayOp['value'] });
    }
    for (const [categoryKey, list] of Object.entries(p.rounds ?? {})) {
      list.forEach((value, roundIndex) =>
        out.push({ identityId: p.identity.id, categoryKey, roundIndex, value }),
      );
    }
  }
  return out;
}

const cellId = (c: Cell) => `${c.identityId}|${c.categoryKey}|${c.roundIndex ?? ''}`;

export function diffPlays(prev: PlayDto | null, next: PlayDto): ServerCell[] {
  const before = new Map((prev ? playCells(prev) : []).map((c) => [cellId(c), c]));
  const changed: ServerCell[] = [];
  for (const c of playCells(next)) {
    const old = before.get(cellId(c));
    if (!old || JSON.stringify(old.value) !== JSON.stringify(c.value)) changed.push(c);
  }
  return changed;
}

export const playersOf = (play: PlayDto): Player[] =>
  play.players.map((p) => ({
    id: p.identity.id,
    name: p.identity.displayName,
    kind: p.identity.kind,
    avatarColor: avatarColorFor(p.identity.id),
    ...(p.identity.birthYear ? { birthYear: p.identity.birthYear } : {}),
  }));

export function sheetFromPlay(play: PlayDto, template: ScoreTemplate | null): SheetState {
  const map = cellMapFor(template, play);
  let state = initialState(playersOf(play));
  let quick = false;
  for (const c of playCells(play)) {
    const cell = fromServerCell(c, map);
    if (cell.categoryKey === QUICK_KEY) quick = true;
    state = applyOp(state, { opId: 'server', actorId: 'server', ...cell, value: c.value });
  }
  return {
    ...state,
    mode: quick && !play.template ? 'quick' : 'detailed',
    outcome: play.outcome,
  };
}
