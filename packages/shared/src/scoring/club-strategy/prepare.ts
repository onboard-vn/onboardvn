import type { RawValue, ScoreInput } from '../compute.js';
import { cloneScoringValue, type GameScorePreparation } from '../game-score-types.js';
import type { ScoreTemplate } from '../template-schema.js';

const SETI = 'seti-search-for-extraterrestrial-intelligence-2024';
const GOLD_PAIRS = [
  ['techTriples', 'techPairs'],
  ['missionSingles', 'missionPairs'],
  ['incomeTriples', 'incomeMajority'],
  ['traceTriples', 'sectorPairs'],
] as const;
const MILESTONES = Array.from({ length: 6 }, (_, i) => `milestone${i + 1}`);
const NEUTRAL_KEYS = ['area', 'discOne', 'discTwo', 'discThree', 'discFour'] as const;
const CONTRACTS: Record<string, string[]> = {
  [SETI]: [...GOLD_PAIRS.flat(), 'organizations'],
  'nucleum-2023': [...MILESTONES, 'ordinaryBuildings', 'governmentBuildings'],
  'agricola-2007': ['buildingResources'],
  'agricola-15-2022': ['buildingResources'],
  amsterdam: ['leftovers', 'amstelPosition'],
  'great-western-trail': ['dollars', 'workers'],
  'dune-imperium-uprising-2023': [
    'vpTrack',
    'endgameIntrigueVp',
    'spice',
    'solari',
    'water',
    'troops',
  ],
  'terra-mystica': ['alchemists'],
  'age-of-innovation': ['neutralFaction', ...NEUTRAL_KEYS],
};

function record(value: RawValue | undefined): Record<string, number> {
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function nonnegativeInteger(n: unknown): n is number {
  return typeof n === 'number' && Number.isSafeInteger(n) && n >= 0;
}

function hasPoints(v: RawValue | undefined): boolean {
  if (Array.isArray(v)) return v.some((n) => n !== 0);
  if (typeof v === 'object' && v !== null) return Object.values(v).some((n) => n !== 0);
  return typeof v === 'number' && v !== 0;
}

/** Pooled-place ranking, including a neutral competitor without creating a player. */
export function rankWithNeutral(
  values: number[],
  neutral: number,
  awards: readonly number[],
  excludeZero: boolean,
): number[] {
  return values.map((value) => {
    if (excludeZero && value === 0) return 0;
    const eligible = [...values, neutral].filter((n) => !excludeZero || n > 0);
    const above = eligible.filter((n) => n > value).length;
    const tied = eligible.filter((n) => n === value).length;
    let pool = 0;
    for (let i = 0; i < tied; i++) pool += awards[above + i] ?? 0;
    return Math.floor(pool / tied);
  });
}

/** Only current quantity contracts opt in; historical pinned templates remain untouched. */
export function prepareStrategyScoring(
  template: ScoreTemplate,
  input: ScoreInput,
): GameScorePreparation | null {
  const keys = CONTRACTS[template.slug];
  if (
    !keys ||
    template.templateVersion < 3 ||
    !keys.every((key) => template.categories.some((c) => c.key === key))
  )
    return null;
  const prepared: GameScorePreparation = {
    template: cloneScoringValue(template),
    input: cloneScoringValue(input),
  };
  const fail = (message: string): GameScorePreparation => ({ ...prepared, error: message });
  if (input.players.length !== input.playerCount || !input.players.length)
    return fail('Player count must match the scoring roster.');
  if (
    input.playerCount < (template.playerCount?.min ?? 1) ||
    input.playerCount > (template.playerCount?.max ?? Infinity)
  ) {
    return fail('This edition/mode does not support the supplied player count.');
  }

  for (const player of input.players) {
    for (const category of template.categories) {
      const raw = player.values[category.key];
      if (raw === undefined) continue;
      if (category.input === 'counts') {
        if (!raw || typeof raw !== 'object' || Array.isArray(raw))
          return fail(`${category.key}: expected named quantities.`);
        for (const [key, value] of Object.entries(raw)) {
          if (!category.inputs?.includes(key) || !nonnegativeInteger(value))
            return fail(`${category.key}.${key}: use a non-negative whole quantity.`);
        }
      } else if (
        category.input === 'count' &&
        (!nonnegativeInteger(raw) || (category.max != null && raw > category.max))
      ) {
        return fail(`${category.key}: use a whole quantity within the printed limit.`);
      } else if (
        category.input === 'bool' &&
        raw !== true &&
        raw !== false &&
        raw !== 0 &&
        raw !== 1
      ) {
        return fail(`${category.key}: expected yes or no.`);
      }
      if (category.formula.type === 'rankAward' && !nonnegativeInteger(raw)) {
        return fail(`${category.key}: ranking requires a non-negative whole quantity.`);
      }
    }
    if (template.slug === SETI) {
      const selected = GOLD_PAIRS.flat().filter(
        (key) => (record(player.values[key]).rate ?? 0) > 0,
      );
      if (GOLD_PAIRS.some((pair) => pair.every((key) => selected.includes(key))))
        return fail('Choose only one side of each physical gold tile.');
      const track = typeof player.values.trackScore === 'number' ? player.values.trackScore : 0;
      const available = [25, 50, 70].filter((n) => track >= n).length;
      if (selected.length > available)
        return fail('Gold selections exceed milestones reached before final scoring.');
      if (
        selected.length &&
        ['goldTile25', 'goldTile50', 'goldTile70'].some((key) => {
          const legacy = record(player.values[key]);
          return (legacy.sets ?? 0) * (legacy.valuePerSet ?? 0) !== 0;
        })
      )
        return fail('Use quantity gold scoring or the legacy manual sets, not both.');
    }
    if (template.slug === 'nucleum-2023') {
      const detailedMilestones = MILESTONES.some((key) => hasPoints(player.values[key]));
      if (detailedMilestones && hasPoints(player.values.milestones))
        return fail('Milestone VP has been entered through both scoring methods.');
      for (const key of MILESTONES) {
        const values = record(player.values[key]);
        if (
          (values.quantity ?? 0) > 0 &&
          (!((values.perSet ?? 0) > 0) || !((values.multiplier ?? 0) > 0))
        ) {
          return fail(`${key}: enter the printed set size and tier multiplier.`);
        }
      }
      if (
        hasPoints(player.values.energizedBuildings) &&
        ['ordinaryBuildings', 'governmentBuildings'].some((key) => hasPoints(player.values[key]))
      ) {
        return fail('Building VP has been entered through both scoring methods.');
      }
    }
  }

  const sharedValue = (key: string): RawValue | undefined =>
    input.players.find((p) => p.values[key] !== undefined)?.values[key];
  if (
    template.slug === SETI &&
    input.players.some(
      (p) =>
        p.values.organizations !== undefined &&
        Boolean(p.values.organizations) !== Boolean(sharedValue('organizations')),
    )
  ) {
    return fail('The organization module choice must agree for all players.');
  }
  if (template.slug === SETI && sharedValue('organizations')) {
    prepared.template.rounds = {
      count: 4,
      aggregate: 'sum',
      endCondition: 'Organizations: play rounds 2, 3, 4 and 5; final scoring after round 5.',
    };
  }

  if (template.slug === 'age-of-innovation' && input.playerCount === 2) {
    const neutralRaw = sharedValue('neutralFaction');
    const neutral = record(neutralRaw);
    if (!NEUTRAL_KEYS.every((key) => nonnegativeInteger(neutral[key])))
      return fail(
        'Two-player scoring requires the neutral area tile and all four neutral discipline levels.',
      );
    if (
      (neutral.area ?? 0) < 12 ||
      (neutral.area ?? 0) > 15 ||
      NEUTRAL_KEYS.slice(1).some((key) => (neutral[key] ?? 0) > 12)
    )
      return fail('Neutral area tile must be 12–15; discipline levels must be 0–12.');
    for (const player of input.players) {
      if (
        player.values.neutralFaction !== undefined &&
        NEUTRAL_KEYS.some((key) => record(player.values.neutralFaction)[key] !== neutral[key])
      ) {
        return fail('Neutral faction quantities must agree for all players.');
      }
    }
    for (const key of NEUTRAL_KEYS) {
      const category = prepared.template.categories.find((c) => c.key === key)!;
      const spec = category.formula.rankAward;
      if (category.formula.type !== 'rankAward' || !spec?.points)
        return fail('Neutral faction scoring requires the current ranking contract.');
      const values = input.players.map((p) => p.values[key] ?? 0);
      if (!values.every((v) => nonnegativeInteger(v) && (key === 'area' || v <= 12)))
        return fail(`${key}: enter a valid whole track level or building count.`);
      const awards = rankWithNeutral(
        values as number[],
        neutral[key]!,
        spec.points,
        spec.excludeZero ?? false,
      );
      category.formula = { type: 'sum' };
      prepared.input.players.forEach((p, index) => {
        p.values[key] = awards[index]!;
      });
    }
  }
  return prepared;
}
