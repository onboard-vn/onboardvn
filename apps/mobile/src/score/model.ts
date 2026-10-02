import {
  computeScores,
  evaluate,
  type RawValue,
  type ScoreCategory,
  type ScoreInput,
  type ScoreResult,
  type ScoreTemplate,
} from '@onboard/shared';

export type SheetMode = 'quick' | 'detailed';
export type Values = Record<string, RawValue>;

export interface Player {
  id: string;
  name: string;
}

export interface SheetState {
  players: Player[];
  nextId: number;
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

export const playerBounds = (t: ScoreTemplate) => {
  const min = Math.max(1, t.playerCount?.min ?? 1);
  return { min, max: Math.max(min, t.playerCount?.max ?? 8) };
};

export const isCoop = (t: ScoreTemplate) => t.mode === 'coop';
export const isRankable = (t: ScoreTemplate) =>
  !isCoop(t) && (t.winRule === 'highest' || t.winRule === 'lowest');
export const needsOutcome = (t: ScoreTemplate) => isCoop(t) || !!t.outcome;

export function initialState(t: ScoreTemplate): SheetState {
  const { min } = playerBounds(t);
  return {
    players: Array.from({ length: min }, (_, i) => ({
      id: `p${i + 1}`,
      name: `Người chơi ${i + 1}`,
    })),
    nextId: min + 1,
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

const cmp = (t: ScoreTemplate) => (a: number, b: number) =>
  t.winRule === 'lowest' ? a - b : b - a;

function quickSummary(t: ScoreTemplate, s: SheetState): Summary {
  const rows: SummaryRow[] = s.players.map((p) => ({
    id: p.id,
    name: p.name,
    total: s.quickTotals[p.id] ?? 0,
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
  if (t.sharedVictoryOnTie) return `Hòa điểm cao nhất: ${names} cùng thắng.`;
  const rules = (t.tiebreakers ?? []).map((x) => x.description).join(' ');
  return `Hòa điểm cao nhất: ${names}. ${rules}`.trim();
}

export function summarize(t: ScoreTemplate, s: SheetState): Summary {
  if (s.mode === 'quick' && isRankable(t)) return quickSummary(t, s);
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
