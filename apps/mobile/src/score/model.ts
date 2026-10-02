import {
  computeScores,
  evaluate,
  type RawValue,
  type ScoreCategory,
  type ScoreInput,
  type ScoreResult,
  type ScoreTemplate,
} from '@onboard/shared';
import { QUICK_KEY, ROUND_KEY, TEAM_ID, type PlayOp } from '../api/plays-types';
import type { PlayerKind } from '../mock/club';

export type SheetMode = 'quick' | 'detailed';
export type Values = Record<string, RawValue>;

export interface Player {
  id: string;
  name: string;
  kind?: PlayerKind;
  avatarColor?: string;
  birthYear?: number;
}

export interface SheetState {
  players: Player[];
  pendingOps: PlayOp[];
  roundCount: number;
  rounds: Record<string, number[]>;
  mode: SheetMode;
  expansions: string[];
  values: Record<string, Values>;
  teamValues: Values;
  quickTotals: Record<string, number>;
  outcome: 'win' | 'loss' | null;
  extras: Record<string, unknown>;
}

export interface SummaryRow {
  id: string;
  name: string;
  total: number;
  rank: number | null;
}

export interface Summary {
  rows: SummaryRow[];
  winners: string[];
  note: string | null;
  error: string | null;
  result: ScoreResult | null;
}

export const cellKey = (identityId: string, categoryKey: string, roundIndex?: number): string =>
  `${identityId}|${categoryKey}|${roundIndex ?? ''}`;

export const opCell = (op: PlayOp): string => cellKey(op.identityId, op.categoryKey, op.roundIndex);

export function applyOp(s: SheetState, op: PlayOp): SheetState {
  if (op.identityId === TEAM_ID) {
    return { ...s, teamValues: { ...s.teamValues, [op.categoryKey]: op.value } };
  }
  if (!s.players.some((p) => p.id === op.identityId)) return s;
  if (op.categoryKey === QUICK_KEY && typeof op.value === 'number') {
    return { ...s, quickTotals: { ...s.quickTotals, [op.identityId]: op.value } };
  }
  if (op.categoryKey === ROUND_KEY) {
    if (typeof op.value !== 'number' || op.roundIndex === undefined) return s;
    const count = Math.max(s.roundCount, op.roundIndex + 1);
    const list = Array.from({ length: count }, (_, r) => s.rounds[op.identityId]?.[r] ?? 0);
    list[op.roundIndex] = op.value;
    return { ...s, roundCount: count, rounds: { ...s.rounds, [op.identityId]: list } };
  }
  return {
    ...s,
    values: {
      ...s.values,
      [op.identityId]: { ...s.values[op.identityId], [op.categoryKey]: op.value },
    },
  };
}

export function readCell(
  s: SheetState,
  op: Pick<PlayOp, 'identityId' | 'categoryKey' | 'roundIndex'>,
) {
  if (op.identityId === TEAM_ID) return s.teamValues[op.categoryKey];
  if (op.categoryKey === QUICK_KEY) return s.quickTotals[op.identityId];
  if (op.categoryKey === ROUND_KEY) return s.rounds[op.identityId]?.[op.roundIndex ?? 0];
  return s.values[op.identityId]?.[op.categoryKey];
}

export const playerBounds = (t: ScoreTemplate) => {
  const min = Math.max(1, t.playerCount?.min ?? 1);
  return { min, max: Math.max(min, t.playerCount?.max ?? 8) };
};

export const isCoop = (t: ScoreTemplate) => t.mode === 'coop';
export const isRankable = (t: ScoreTemplate) =>
  !isCoop(t) && (t.winRule === 'highest' || t.winRule === 'lowest');
export const needsOutcome = (t: ScoreTemplate) => isCoop(t) || !!t.outcome;

export function initialState(players: Player[]): SheetState {
  return {
    players,
    pendingOps: [],
    roundCount: 1,
    rounds: {},
    mode: 'detailed',
    expansions: [],
    values: {},
    teamValues: {},
    quickTotals: {},
    outcome: null,
    extras: {},
  };
}

export const expansionsOf = (t: ScoreTemplate): string[] => [
  ...new Set(t.categories.flatMap((c) => (c.optional && c.expansion ? [c.expansion] : []))),
];

export const isEnabled = (cat: ScoreCategory, s: SheetState): boolean =>
  !(cat.optional && cat.expansion && !s.expansions.includes(cat.expansion));

export const isOutcomeDriven = (t: ScoreTemplate, cat: ScoreCategory): boolean =>
  isCoop(t) && cat.key === 'won' && cat.scope === 'team';

export const visibleCategories = (t: ScoreTemplate, s: SheetState): ScoreCategory[] =>
  t.categories.filter((c) => isEnabled(c, s) && !isOutcomeDriven(t, c));

export function buildInput(t: ScoreTemplate, s: SheetState): ScoreInput {
  const active = t.categories.filter((c) => isEnabled(c, s));
  const team: Values = {};
  for (const c of active) {
    if (c.scope !== 'team') continue;
    const v = s.teamValues[c.key];
    if (v !== undefined) team[c.key] = v;
  }
  if (isCoop(t) && s.outcome && t.categories.some((c) => isOutcomeDriven(t, c))) {
    team.won = s.outcome === 'win' ? 1 : 0;
  }
  return {
    players: s.players.map((p) => {
      const own: Values = {};
      for (const c of active) {
        const v = s.values[p.id]?.[c.key];
        if (c.scope === 'player' && v !== undefined) own[c.key] = v;
      }
      return { id: p.id, values: { ...team, ...own } };
    }),
    playerCount: s.players.length,
    ...(s.outcome ? { outcome: s.outcome } : {}),
  };
}

export const isRoundsGame = (t: ScoreTemplate): boolean =>
  isRankable(t) &&
  (t.scoringStyle === 'rounds' ||
    t.categories.some((c) => c.input === 'perRound') ||
    (t.endCondition?.type === 'target-score' && !!t.rounds));

export function roundsConfig(t: ScoreTemplate): {
  target: number | null;
  aggregate: 'sum' | 'best' | 'rounds-won';
  roundLimit: number | null;
} {
  const fromText = /(\d+)\s*(?:points|bullheads|điểm|VP)\b/i.exec(
    t.rounds?.endCondition ?? t.endCondition?.description ?? '',
  );
  return {
    target: t.endCondition?.target ?? (fromText ? Number(fromText[1]) : null),
    aggregate: t.rounds?.aggregate ?? 'sum',
    roundLimit: t.rounds?.count ?? null,
  };
}

export const roundScore = (s: SheetState, playerId: string, round: number): number =>
  s.rounds[playerId]?.[round] ?? 0;

export function roundTotal(t: ScoreTemplate, s: SheetState, playerId: string): number {
  const { aggregate } = roundsConfig(t);
  const lowest = t.winRule === 'lowest';
  const own = Array.from({ length: s.roundCount }, (_, r) => roundScore(s, playerId, r));
  if (aggregate === 'best') return own.length ? (lowest ? Math.min(...own) : Math.max(...own)) : 0;
  if (aggregate === 'rounds-won') {
    return own.filter((v, r) => {
      const col = s.players.map((p) => roundScore(s, p.id, r));
      return v === (lowest ? Math.min(...col) : Math.max(...col));
    }).length;
  }
  return own.reduce((a, b) => a + b, 0);
}

export const targetReached = (t: ScoreTemplate, rows: SummaryRow[]): boolean => {
  const { target } = roundsConfig(t);
  return target !== null && rows.some((r) => r.total >= target);
};

export interface RuleNotes {
  vi: string[];
  en: string[];
}

export function tiebreakerNotes(t: ScoreTemplate): RuleNotes {
  const out: RuleNotes = { vi: [], en: [] };
  for (const tb of t.tiebreakers ?? []) {
    const vi = (tb as { descriptionVi?: string | null }).descriptionVi;
    if (vi) out.vi.push(vi);
    else if (tb.description) out.en.push(tb.description);
  }
  return out;
}

const cmp = (t: ScoreTemplate) => (a: number, b: number) =>
  t.winRule === 'lowest' ? a - b : b - a;

function totalsSummary(t: ScoreTemplate, s: SheetState, totalOf: (id: string) => number): Summary {
  const rows: SummaryRow[] = s.players.map((p) => ({
    id: p.id,
    name: p.name,
    total: totalOf(p.id),
    rank: null,
  }));
  if (isRankable(t)) {
    const better = cmp(t);
    for (const r of rows) r.rank = 1 + rows.filter((o) => better(o.total, r.total) < 0).length;
  }
  const winners = rows.filter((r) => r.rank === 1).map((r) => r.id);
  return { rows, winners, note: tieNote(t, s, winners), error: null, result: null };
}

function tieNote(t: ScoreTemplate, s: SheetState, leaders: string[]): string | null {
  if (leaders.length < 2) return null;
  const names = leaders.map((id) => s.players.find((p) => p.id === id)?.name ?? id).join(', ');
  return t.sharedVictoryOnTie
    ? `Hòa điểm cao nhất: ${names} cùng thắng.`
    : `Hòa điểm cao nhất: ${names}. Xem ghi chú luật bên dưới.`;
}

export function summarize(t: ScoreTemplate, s: SheetState): Summary {
  if (s.mode === 'quick' && isRankable(t))
    return totalsSummary(t, s, (id) => s.quickTotals[id] ?? 0);
  if (isRoundsGame(t)) return totalsSummary(t, s, (id) => roundTotal(t, s, id));
  const res = computeScores(t, buildInput(t, s));
  if (!res.ok) {
    const missingOutcome = res.error.path === 'outcome';
    return {
      rows: s.players.map((p) => ({ id: p.id, name: p.name, total: 0, rank: null })),
      winners: [],
      note: null,
      error: missingOutcome ? 'Chọn kết quả Thắng/Thua để tính điểm.' : res.error.message,
      result: null,
    };
  }
  const r = res.value;
  const rows = s.players.map((p) => {
    const ps = r.players.find((x) => x.id === p.id);
    return { id: p.id, name: p.name, total: ps?.total ?? 0, rank: ps?.rank ?? null };
  });
  const note = r.tieUnresolved
    ? tieNote(t, s, r.tiedIds)
    : (r.warnings[0] ?? tieNoteShared(t, s, r));
  return { rows, winners: r.winners, note, error: null, result: r };
}

function tieNoteShared(t: ScoreTemplate, s: SheetState, r: ScoreResult): string | null {
  return isRankable(t) && r.winners.length > 1 ? tieNote(t, s, r.winners) : null;
}

export function categoryApplies(
  cat: ScoreCategory,
  playerId: string,
  summary: Summary,
  playerCount: number,
): boolean {
  if (!cat.appliesWhen) return true;
  const scope: Record<string, number> = { players: playerCount };
  const cats = summary.result?.players.find((p) => p.id === playerId)?.categories ?? {};
  for (const [k, v] of Object.entries(cats)) scope[`cat_${k}`] = v;
  const r = evaluate(cat.appliesWhen, scope);
  return r.ok ? r.value !== 0 : true;
}

export function categoryAppliesToAny(
  cat: ScoreCategory,
  summary: Summary,
  players: Player[],
): boolean {
  return players.some((p) => categoryApplies(cat, p.id, summary, players.length));
}
