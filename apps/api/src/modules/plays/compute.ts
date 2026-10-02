import { computeScores, FREE_TOTAL_KEY, type ScoreTemplate } from '@onboard/shared';
import type { PlayComputed } from '../../db/schema/plays.js';

export interface ComputePlayer {
  identityId: string;
  team: string | null;
  role: string | null;
  values: Record<string, unknown>;
  rounds: Record<string, number[]> | null;
  isWinnerOverride: boolean | null;
}

export interface ComputeOutcome {
  byIdentity: Map<string, PlayComputed | null>;
  tieUnresolved: boolean;
  warnings: string[];
}

export type ComputeResult = { ok: true; value: ComputeOutcome } | { ok: false; message: string };

const isNumber = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

function computeFree(players: ComputePlayer[], outcome: 'win' | 'loss' | null): ComputeOutcome {
  const totals = players.map((p) => p.values[FREE_TOTAL_KEY]);
  const byIdentity = new Map<string, PlayComputed | null>();
  if (!totals.some(isNumber)) {
    for (const p of players) byIdentity.set(p.identityId, null);
    return { byIdentity, tieUnresolved: false, warnings: [] };
  }
  const value = (p: ComputePlayer) =>
    isNumber(p.values[FREE_TOTAL_KEY]) ? p.values[FREE_TOTAL_KEY] : 0;
  const overrides = players.filter((p) => p.isWinnerOverride === true);
  for (const p of players) {
    const total = value(p);
    const rank = 1 + players.filter((o) => value(o) > total).length;
    const isWinner =
      outcome === 'loss'
        ? false
        : outcome === 'win'
          ? true
          : overrides.length
            ? p.isWinnerOverride === true
            : rank === 1;
    byIdentity.set(p.identityId, {
      categories: { [FREE_TOTAL_KEY]: total },
      total,
      rank,
      isWinner,
    });
  }
  return { byIdentity, tieUnresolved: false, warnings: [] };
}

/** Server-side source of truth for totals, ranks and winners. Manual winner overrides only apply
 * when the template cannot decide (`objective`/`none`) or a tie is unresolved. */
export function computePlay(
  template: ScoreTemplate | null,
  players: ComputePlayer[],
  outcome: 'win' | 'loss' | null,
): ComputeResult {
  if (players.length === 0) {
    return { ok: true, value: { byIdentity: new Map(), tieUnresolved: false, warnings: [] } };
  }
  if (!template) return { ok: true, value: computeFree(players, outcome) };

  const overrideWinners = players
    .filter((p) => p.isWinnerOverride === true)
    .map((p) => p.identityId);
  const result = computeScores(template, {
    players: players.map((p) => ({
      id: p.identityId,
      ...(p.team ? { team: p.team } : {}),
      ...(p.role ? { role: p.role } : {}),
      values: { ...p.values, ...(p.rounds ?? {}) } as Record<string, never>,
    })),
    playerCount: players.length,
    ...(outcome ? { outcome } : {}),
    ...(template.winRule === 'objective' && overrideWinners.length
      ? { winners: overrideWinners }
      : {}),
  });
  if (!result.ok) return { ok: false, message: result.error.message };

  const r = result.value;
  let winnerIds = new Set(r.winners);
  if (template.winRule === 'none') winnerIds = new Set(overrideWinners);
  else if (r.tieUnresolved) {
    winnerIds = new Set(r.tiedIds.filter((id) => overrideWinners.includes(id)));
  }
  const winnerTeams = new Set(r.winnerTeams);
  const teams = new Map(r.teams.map((t) => [t.id, t]));
  const byIdentity = new Map<string, PlayComputed | null>();
  for (const p of r.players) {
    const team = p.team ? teams.get(p.team) : undefined;
    byIdentity.set(
      p.id,
      team
        ? {
            categories: { ...p.categories, ...team.categories },
            total: team.total,
            rank: team.rank,
            isWinner: winnerTeams.has(team.id),
          }
        : { categories: p.categories, total: p.total, rank: p.rank, isWinner: winnerIds.has(p.id) },
    );
  }
  return { ok: true, value: { byIdentity, tieUnresolved: r.tieUnresolved, warnings: r.warnings } };
}
