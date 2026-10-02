import { z } from 'zod';
import { evaluateExpr, type CompiledExpr, type ExprValue } from './expr.js';
import { err, ok, type Result, type ScoreError } from './result.js';
import type {
  RankAwardSpec,
  ScoreCategory,
  ScoreFormula,
  ScoreTemplate,
} from './template-schema.js';
import { compileTemplate } from './validate.js';

const rawValueSchema = z.union([
  z.number(),
  z.boolean(),
  z.array(z.number()),
  z.record(z.string(), z.number()),
]);

export const scoreInputSchema = z.object({
  players: z
    .array(
      z.object({
        id: z.string().min(1),
        team: z.string().min(1).optional(),
        role: z.string().min(1).optional(),
        values: z.record(z.string(), rawValueSchema),
      }),
    )
    .min(1),
  playerCount: z.number().int().min(1),
  outcome: z.enum(['win', 'loss']).optional(),
  winners: z.array(z.string()).optional(),
});

export type RawValue = z.infer<typeof rawValueSchema>;
export type ScoreInput = z.input<typeof scoreInputSchema>;

export interface PlayerScore {
  id: string;
  team: string | null;
  categories: Record<string, number>;
  total: number;
  rank: number | null;
}

export interface TeamScore {
  id: string;
  memberIds: string[];
  categories: Record<string, number>;
  total: number;
  rank: number | null;
}

export interface ScoreResult {
  players: PlayerScore[];
  teams: TeamScore[];
  winners: string[];
  winnerTeams: string[];
  tieUnresolved: boolean;
  tiedIds: string[];
  outcome: 'win' | 'loss' | null;
  ended: boolean | null;
  warnings: string[];
}

type Scope = 'player' | 'team';

interface Entity {
  id: string;
  scope: Scope;
  memberIds: string[];
  role?: string;
  rawValue(key: string): RawValue | undefined;
}

interface Norm {
  value: number;
  list: number[] | null;
  named: ReadonlyMap<string, number>;
}

class InputFailure {
  constructor(readonly error: ScoreError) {}
}

const bad = (message: string, path?: string): never => {
  throw new InputFailure({
    code: 'INPUT_INVALID',
    message,
    ...(path === undefined ? {} : { path }),
  });
};

const clean = (n: number): number => Math.round(n * 1e9) / 1e9;
const sumOf = (xs: readonly number[]): number => xs.reduce((a, b) => a + b, 0);

function toNumber(x: unknown, path: string): number {
  if (typeof x === 'boolean') return x ? 1 : 0;
  if (typeof x === 'number' && Number.isFinite(x)) return x;
  return bad('expected a finite number or boolean', path);
}

function resolveFormula(f: ScoreFormula, playerCount: number): ScoreFormula {
  const overrides = f.byPlayerCount;
  if (!overrides) return f;
  let key: string | undefined = Object.hasOwn(overrides, String(playerCount))
    ? String(playerCount)
    : undefined;
  if (key === undefined) {
    let best = -Infinity;
    for (const k of Object.keys(overrides)) {
      const m = /^(\d+)\+$/.exec(k);
      const n = m ? Number(m[1]) : NaN;
      if (n <= playerCount && n > best) {
        best = n;
        key = k;
      }
    }
  }
  const o = key === undefined ? undefined : overrides[key];
  return o ? { ...f, ...o } : f;
}

function lookupTable(table: Readonly<Record<string, number>>, v: number): number | null {
  if (Object.hasOwn(table, String(v))) return table[String(v)] as number;
  let best = -Infinity;
  let pts: number | null = null;
  for (const [k, p] of Object.entries(table)) {
    const m = /^(-?\d+(?:\.\d+)?)\+$/.exec(k);
    const n = m ? Number(m[1]) : NaN;
    if (n <= v && n > best) {
      best = n;
      pts = p;
    }
  }
  return pts;
}

function rankAwardPoints(
  spec: RankAwardSpec,
  values: ReadonlyMap<string, number>,
): Map<string, number> {
  const out = new Map<string, number>();
  const table = spec.points ?? [];
  const tieMode = spec.tieMode ?? 'split-floor';
  const dir = spec.compare === 'lowest' ? 1 : -1;
  const ranked = [...values.entries()]
    .filter(
      ([, v]) =>
        !(spec.excludeZero && v === 0) &&
        !(spec.minValueToScore != null && v < spec.minValueToScore),
    )
    .sort((a, b) => dir * (a[1] - b[1]));
  const at = (i: number): number => table[i] ?? 0;
  let i = 0;
  while (i < ranked.length) {
    let j = i;
    while (
      j + 1 < ranked.length &&
      (ranked[j + 1] as [string, number])[1] === (ranked[i] as [string, number])[1]
    )
      j++;
    const size = j - i + 1;
    let pts: number;
    if (size === 1) pts = at(i);
    else if (tieMode === 'split-floor')
      pts = Math.floor(sumOf(Array.from({ length: size }, (_, k) => at(i + k))) / size);
    else if (tieMode === 'split-exact')
      pts = sumOf(Array.from({ length: size }, (_, k) => at(i + k))) / size;
    else if (tieMode === 'all-full') pts = at(i);
    else if (tieMode === 'all-next-lower') pts = at(i + 1);
    else pts = 0;
    for (let k = i; k <= j; k++) out.set((ranked[k] as [string, number])[0], pts);
    i = j + 1;
  }
  return out;
}

function compute(template: ScoreTemplate, rawInput: unknown): ScoreResult {
  const parsed = scoreInputSchema.safeParse(rawInput);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return bad(issue?.message ?? 'invalid input', issue?.path.join('.'));
  }
  const input = parsed.data;
  const compiled = compileTemplate(template);
  if (!compiled.ok) throw new InputFailure(compiled.error);
  const { order, exprs } = compiled.value;
  const byKey = new Map(template.categories.map((c) => [c.key, c]));
  const warnings: string[] = [];
  const playerCount = input.playerCount;

  const playerIds = new Set<string>();
  for (const p of input.players) {
    if (playerIds.has(p.id)) bad(`duplicate player id '${p.id}'`, 'players');
    playerIds.add(p.id);
  }

  const wantsTeams =
    template.mode === 'team' ||
    template.mode === 'coop' ||
    template.categories.some((c) => c.scope === 'team') ||
    input.players.some((p) => p.team !== undefined);
  const teamOf = (p: (typeof input.players)[number]): string => {
    if (p.team !== undefined) return p.team;
    if (template.mode === 'team') return bad(`player '${p.id}' needs a team`, 'players');
    return 'all';
  };

  const players: Entity[] = input.players.map((p) => ({
    id: p.id,
    scope: 'player',
    memberIds: [p.id],
    ...(p.role === undefined ? {} : { role: p.role }),
    rawValue: (key) => (Object.hasOwn(p.values, key) ? p.values[key] : undefined),
  }));
  const playerTeam = new Map<string, string>();
  const teamMembers = new Map<string, string[]>();
  if (wantsTeams) {
    for (const p of input.players) {
      const t = teamOf(p);
      playerTeam.set(p.id, t);
      teamMembers.set(t, [...(teamMembers.get(t) ?? []), p.id]);
    }
  }
  const playerById = new Map(players.map((p) => [p.id, p]));
  const teams: Entity[] = [...teamMembers.entries()].map(([id, memberIds]) => ({
    id,
    scope: 'team',
    memberIds,
    rawValue: (key) => {
      for (const m of memberIds) {
        const v = (playerById.get(m) as Entity).rawValue(key);
        if (v !== undefined) return v;
      }
      return undefined;
    },
  }));
  const teamIds = new Set(teams.map((t) => t.id));
  for (const w of input.winners ?? []) {
    if (!playerIds.has(w) && !teamIds.has(w)) bad(`unknown winner id '${w}'`, 'winners');
  }

  const points = {
    player: new Map<string, Map<string, number>>(),
    team: new Map<string, Map<string, number>>(),
  };
  const norms = new Map<string, Map<string, Norm>>();

  const catPoint = (e: Entity, key: string): number => {
    const cat = byKey.get(key) as ScoreCategory;
    if (cat.scope === e.scope) return points[e.scope].get(e.id)?.get(key) ?? 0;
    if (e.scope === 'player') {
      return points.team.get(playerTeam.get(e.id) ?? '')?.get(key) ?? 0;
    }
    return sumOf(e.memberIds.map((m) => points.player.get(m)?.get(key) ?? 0));
  };

  const catRef = (e: Entity, key: string): ExprValue => {
    const cat = byKey.get(key) as ScoreCategory;
    if (cat.input !== 'perRound' || cat.roundInput === undefined) return catPoint(e, key);
    const n = norms.get(key) as Map<string, Norm>;
    if (cat.scope === e.scope) return n.get(e.id)?.list ?? [];
    if (e.scope === 'player') return n.get(playerTeam.get(e.id) ?? '')?.list ?? [];
    return e.memberIds.flatMap((m) => n.get(m)?.list ?? []);
  };

  const normalize = (cat: ScoreCategory, entities: Entity[]): Map<string, Norm> => {
    const out = new Map<string, Norm>();
    const aggregate = template.rounds?.aggregate ?? 'sum';
    for (const e of entities) {
      const raw = e.rawValue(cat.key);
      const path = `players.${e.id}.values.${cat.key}`;
      const named = new Map<string, number>();
      let list: number[] | null = null;
      let value = 0;
      if (cat.input === 'derived') {
        // value is computed by the category formula
      } else if (cat.input === 'repeating' || cat.input === 'perRound') {
        if (raw === undefined) list = [];
        else if (Array.isArray(raw)) list = raw.map((x) => toNumber(x, path));
        else if (typeof raw === 'object') list = bad('expected a list of numbers', path);
        else list = [toNumber(raw, path)];
        if (cat.roundInput === 'bool' || cat.roundInput === 'exclusive') {
          if (list.some((x) => x !== 0 && x !== 1)) bad('expected 0/1 per round', path);
        }
        value = sumOf(list);
      } else if (cat.input === 'counts') {
        if (raw !== undefined && (typeof raw !== 'object' || Array.isArray(raw)))
          bad('expected an object of counts', path);
        const rec = (raw ?? {}) as Record<string, number>;
        for (const name of cat.inputs ?? []) {
          named.set(name, Object.hasOwn(rec, name) ? toNumber(rec[name], `${path}.${name}`) : 0);
        }
        value = sumOf([...named.values()]);
      } else if (raw !== undefined) {
        if (typeof raw === 'object') bad('expected a number or boolean', path);
        value = toNumber(raw, path);
        if (cat.min != null && value < cat.min) bad(`below minimum ${cat.min}`, path);
        if (cat.max != null && value > cat.max) bad(`above maximum ${cat.max}`, path);
      }
      out.set(e.id, { value, list, named });
    }
    if (cat.input === 'perRound' && cat.roundInput === 'exclusive') {
      const lists = [...out.values()].map((n) => n.list as number[]);
      for (let r = 0; r < Math.max(0, ...lists.map((l) => l.length)); r++) {
        if (sumOf(lists.map((l) => l[r] ?? 0)) > 1)
          bad(`more than one entity selected in round ${r + 1}`, `categories.${cat.key}`);
      }
    }
    if (cat.input === 'perRound' && (cat.roundInput ?? 'number') === 'number') {
      const lists = [...out.values()].map((n) => n.list as number[]);
      const rounds = Math.max(0, ...lists.map((l) => l.length));
      const lowest = template.winRule === 'lowest';
      for (const n of out.values()) {
        const l = n.list as number[];
        if (aggregate === 'best')
          n.value = l.length ? (lowest ? Math.min(...l) : Math.max(...l)) : 0;
        else if (aggregate === 'rounds-won') {
          let won = 0;
          for (let r = 0; r < rounds; r++) {
            const col = lists.map((x) => x[r] ?? 0);
            const top = lowest ? Math.min(...col) : Math.max(...col);
            if ((l[r] ?? 0) === top) won++;
          }
          n.value = won;
        }
      }
    }
    return out;
  };

  for (const cat of order) {
    const entities = cat.scope === 'team' ? teams : players;
    const norm = normalize(cat, entities);
    norms.set(cat.key, norm);
    const formula = resolveFormula(cat.formula, playerCount);

    const evalFor = (src: string, e: Entity): number => {
      const n = norm.get(e.id) as Norm;
      const r = evaluateExpr(exprs.get(src) as CompiledExpr, {
        warnings,
        lookup: (name): ExprValue | undefined => {
          if (name === 'value') return cat.input === 'repeating' ? (n.list as number[]) : n.value;
          if (name === 'players') return playerCount;
          if (n.named.has(name)) return n.named.get(name);
          if (name.startsWith('cat_') && byKey.has(name.slice(4))) return catRef(e, name.slice(4));
          return undefined;
        },
      });
      if (!r.ok) throw new InputFailure({ ...r.error, path: `categories.${cat.key}` });
      return r.value;
    };

    const active = entities.filter((e) => {
      if (cat.scope === 'player' && cat.roleKey && e.role !== cat.roleKey) return false;
      return !cat.appliesWhen || evalFor(cat.appliesWhen, e) !== 0;
    });
    const result = new Map<string, number>();
    const valueOf = (e: Entity): number => (norm.get(e.id) as Norm).value;

    switch (formula.type) {
      case 'sum':
        for (const e of active) result.set(e.id, valueOf(e));
        break;
      case 'multiply':
        for (const e of active) result.set(e.id, valueOf(e) * (formula.points ?? 0));
        break;
      case 'table':
        for (const e of active) {
          const p = lookupTable(formula.table ?? {}, valueOf(e));
          if (p === null) warnings.push(`${cat.key}: no table entry for ${valueOf(e)}`);
          result.set(e.id, p ?? 0);
        }
        break;
      case 'expr':
      case 'setCollection':
        for (const e of active) {
          if (formula.expr !== undefined) result.set(e.id, evalFor(formula.expr, e));
          else {
            const p = lookupTable(formula.table ?? {}, valueOf(e));
            result.set(e.id, p ?? 0);
          }
        }
        break;
      case 'exclusiveBonus': {
        const top = Math.max(0, ...active.map(valueOf));
        for (const e of active)
          result.set(e.id, top > 0 && valueOf(e) === top ? (formula.points ?? 0) : 0);
        break;
      }
      case 'rankAward': {
        const spec = formula.rankAward ?? {};
        const over = spec.over ?? 'value';
        const values = new Map(
          active.map((e) => {
            const n = norm.get(e.id) as Norm;
            return [
              e.id,
              over === 'count'
                ? n.list
                  ? n.list.length
                  : n.value
                : over === 'bool'
                  ? n.value !== 0
                    ? 1
                    : 0
                  : n.value,
            ] as const;
          }),
        );
        for (const [id, p] of rankAwardPoints(spec, values)) result.set(id, p);
        break;
      }
    }

    const multipliers = template.categories.filter((c) => c.multiplierOf?.includes(cat.key));
    for (const e of entities) {
      let p = result.get(e.id) ?? 0;
      for (const m of multipliers) p *= catPoint(e, m.key);
      const store = points[cat.scope];
      const row = store.get(e.id) ?? new Map<string, number>();
      row.set(cat.key, clean(p));
      store.set(e.id, row);
    }
  }

  const tableEntity = (teams[0] ?? players[0]) as Entity;
  const evalTable = (src: string | null | undefined): number | null => {
    if (!src) return null;
    const r = evaluateExpr(exprs.get(src) as CompiledExpr, {
      warnings,
      lookup: (name): ExprValue | undefined => {
        if (name === 'players') return playerCount;
        if (name.startsWith('cat_') && byKey.has(name.slice(4)))
          return catRef(tableEntity, name.slice(4));
        return undefined;
      },
    });
    if (!r.ok) throw new InputFailure({ ...r.error, path: 'expr' });
    return r.value;
  };
  const derivedOutcome: 'win' | 'loss' | null = evalTable(template.outcome?.winWhen)
    ? 'win'
    : evalTable(template.outcome?.loseWhen)
      ? 'loss'
      : null;
  const outcome = input.outcome ?? derivedOutcome;
  const ended = template.endCondition?.when ? evalTable(template.endCondition.when) !== 0 : null;

  const counted = template.categories.filter((c) => c.countsToTotal && !c.multiplierOf?.length);
  const outcomeRule = template.outcome;
  const gated =
    (outcomeRule?.scoreOnlyIfWin && outcome !== 'win') ||
    (outcomeRule?.scoreOnlyIfLose && outcome !== 'loss');
  if ((outcomeRule?.scoreOnlyIfWin || outcomeRule?.scoreOnlyIfLose) && outcome === null) {
    bad('outcome is required by this template', 'outcome');
  }
  const playerTotal = new Map<string, number>();
  for (const p of players) {
    playerTotal.set(
      p.id,
      gated
        ? 0
        : clean(sumOf(counted.filter((c) => c.scope === 'player').map((c) => catPoint(p, c.key)))),
    );
  }
  const teamTotal = new Map<string, number>();
  for (const t of teams) {
    const own = sumOf(counted.filter((c) => c.scope === 'team').map((c) => catPoint(t, c.key)));
    const members = sumOf(t.memberIds.map((m) => playerTotal.get(m) as number));
    teamTotal.set(t.id, gated ? 0 : clean(own + members));
  }

  const rankable =
    template.mode !== 'coop' && (template.winRule === 'highest' || template.winRule === 'lowest');
  const rankTeams = template.mode === 'team';
  const rankSet = rankTeams ? teams : players;
  const totalOf = (e: Entity): number => (rankTeams ? teamTotal : playerTotal).get(e.id) as number;
  const tiebreakers = (template.tiebreakers ?? []).filter((t) => t.categoryKey);
  const compare = (a: Entity, b: Entity): number => {
    const d = totalOf(a) - totalOf(b);
    if (d !== 0) return template.winRule === 'lowest' ? d : -d;
    for (const tb of tiebreakers) {
      const x = catPoint(a, tb.categoryKey as string) - catPoint(b, tb.categoryKey as string);
      if (x !== 0) return tb.dir === 'lowest' ? x : -x;
    }
    return 0;
  };
  const rankOf = new Map<string, number>();
  if (rankable) {
    for (const e of rankSet) rankOf.set(e.id, 1 + rankSet.filter((o) => compare(o, e) < 0).length);
  }

  let winnerEntities: Entity[] = [];
  let tieUnresolved = false;
  let tiedIds: string[] = [];
  if (input.winners) {
    winnerEntities = input.winners.map(
      (id) => (playerById.get(id) ?? teams.find((t) => t.id === id)) as Entity,
    );
  } else if (template.mode === 'coop') {
    winnerEntities = outcome === 'win' ? players : [];
  } else if (rankable) {
    const leaders = rankSet.filter((e) => rankOf.get(e.id) === 1);
    if (leaders.length > 1 && !template.sharedVictoryOnTie) {
      tieUnresolved = true;
      tiedIds = leaders.map((e) => e.id);
    } else winnerEntities = leaders;
  } else if (template.winRule === 'objective') {
    const won = byKey.get('won');
    if (won) {
      const n = norms.get('won') as Map<string, Norm>;
      winnerEntities = (won.scope === 'team' ? teams : players).filter(
        (e) => (n.get(e.id) as Norm).value !== 0,
      );
    }
  }

  const winnerPlayers = new Set<string>();
  const winnerTeams: string[] = [];
  for (const e of winnerEntities) {
    if (e.scope === 'team') winnerTeams.push(e.id);
    for (const m of e.memberIds) winnerPlayers.add(m);
  }

  const rowOf = (e: Entity): Record<string, number> =>
    Object.fromEntries(template.categories.map((c) => [c.key, catPoint(e, c.key)]));

  return {
    players: players.map((p) => ({
      id: p.id,
      team: playerTeam.get(p.id) ?? null,
      categories: rowOf(p),
      total: playerTotal.get(p.id) as number,
      rank: rankable
        ? ((rankTeams ? rankOf.get(playerTeam.get(p.id) as string) : rankOf.get(p.id)) ?? null)
        : null,
    })),
    teams: teams.map((t) => ({
      id: t.id,
      memberIds: t.memberIds,
      categories: rowOf(t),
      total: teamTotal.get(t.id) as number,
      rank: rankTeams ? (rankOf.get(t.id) ?? null) : null,
    })),
    winners: players.filter((p) => winnerPlayers.has(p.id)).map((p) => p.id),
    winnerTeams,
    tieUnresolved,
    tiedIds,
    outcome,
    ended,
    warnings,
  };
}

export function computeScores(template: ScoreTemplate, input: ScoreInput): Result<ScoreResult> {
  try {
    return ok(compute(template, input));
  } catch (e) {
    if (e instanceof InputFailure) return { ok: false, error: e.error };
    return err('INTERNAL', e instanceof Error ? e.message : 'unexpected error');
  }
}
