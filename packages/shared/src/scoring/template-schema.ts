import { z } from 'zod';

export const scoreModeEnum = z.enum([
  'competitive',
  'coop',
  'team',
  'solo',
  'hidden-traitor',
  'asymmetric',
]);
export const scoreWinRuleEnum = z.enum(['highest', 'lowest', 'none', 'objective']);
export const scoringStyleEnum = z.enum([
  'end-game-categories',
  'running-track',
  'rounds',
  'elimination',
  'objective-only',
]);
export const categoryScopeEnum = z.enum(['player', 'team']);
export const categoryInputEnum = z.enum([
  'number',
  'count',
  'repeating',
  'exclusive',
  'bool',
  'counts',
  'track',
  'perRound',
]);
export const formulaTypeEnum = z.enum([
  'sum',
  'multiply',
  'table',
  'setCollection',
  'expr',
  'exclusiveBonus',
  'rankAward',
]);
export const rankTieModeEnum = z.enum([
  'split-floor',
  'split-exact',
  'all-full',
  'all-next-lower',
  'none',
]);

const nullableInt = z.number().int().nullish();

const rankAwardSchema = z.object({
  compare: z.enum(['highest', 'lowest']).optional(),
  points: z.array(z.number()).optional(),
  tieMode: rankTieModeEnum.optional(),
  minValueToScore: z.number().nullish(),
  excludeZero: z.boolean().optional(),
  over: z.enum(['value', 'count', 'bool']).optional(),
});

const formulaFields = {
  points: z.number().optional(),
  table: z.record(z.string(), z.number()).optional(),
  expr: z.string().optional(),
  rankAward: rankAwardSchema.optional(),
};

const formulaSchema = z.object({
  type: formulaTypeEnum,
  ...formulaFields,
  byPlayerCount: z.record(z.string(), z.object(formulaFields)).optional(),
});

const categorySchema = z.strictObject({
  key: z.string().regex(/^[a-z][a-zA-Z0-9]*$/),
  label: z.string(),
  labelVi: z.string().nullish(),
  hint: z.string().nullish(),
  scope: categoryScopeEnum,
  input: categoryInputEnum,
  inputs: z.array(z.string()).optional(),
  min: z.number().nullish(),
  max: z.number().nullish(),
  formula: formulaSchema,
  countsToTotal: z.boolean(),
  optional: z.boolean().optional(),
  expansion: z.string().nullish(),
  track: z.object({ min: z.number().optional(), max: z.number().optional() }).nullish(),
  appliesWhen: z.string().nullish(),
  multiplierOf: z.array(z.string()).nullish(),
  roleKey: z.string().nullish(),
});

const tiebreakerSchema = z.object({
  categoryKey: z.string().nullish(),
  dir: z.enum(['highest', 'lowest']).nullish(),
  description: z.string(),
});

const sourceSchema = z.object({
  url: z.string(),
  title: z.string(),
  type: z.enum([
    'official-rulebook',
    'publisher-page',
    'bgg-file',
    'bgg-forum',
    'wiki',
    'video',
    'other',
  ]),
  section: z.string().nullish(),
});

const roleSchema = z.object({
  key: z.string(),
  label: z.string(),
  labelVi: z.string().nullish(),
  winCondition: z.string().nullish(),
  categoryKeys: z.array(z.string()).optional(),
});

export const scoreTemplateSchema = z.strictObject({
  slug: z.string(),
  name: z.string(),
  year: nullableInt,
  bggId: nullableInt,
  templateVersion: z.number().int().min(1),
  variant: z.string().nullish(),
  playerCount: z.object({ min: z.number().int().optional(), max: z.number().int().optional() }).optional(),
  mode: scoreModeEnum,
  winRule: scoreWinRuleEnum,
  scoringStyle: scoringStyleEnum.optional(),
  rounds: z
    .object({
      count: nullableInt,
      aggregate: z.enum(['sum', 'best', 'rounds-won']).optional(),
      endCondition: z.string().nullish(),
    })
    .nullish(),
  categories: z.array(categorySchema),
  tiebreakers: z.array(tiebreakerSchema).optional(),
  sharedVictoryOnTie: z.boolean().optional(),
  notes: z.string().nullish(),
  sources: z.array(sourceSchema).min(1),
  confidence: z.enum(['high', 'medium', 'low']),
  needsReview: z.boolean().optional(),
  winCondition: z.string().nullish(),
  roles: z.array(roleSchema).optional(),
  endCondition: z
    .object({
      type: z
        .enum([
          'rounds',
          'target-score',
          'elimination',
          'last-standing',
          'objective',
          'deck-out',
          'time',
        ])
        .optional(),
      target: z.number().nullish(),
      description: z.string().nullish(),
    })
    .nullish(),
  outcome: z
    .object({
      winLose: z.boolean().optional(),
      scoreOnlyIfWin: z.boolean().optional(),
      scoreOnlyIfLose: z.boolean().optional(),
    })
    .nullish(),
  eliminationTracking: z
    .object({
      resource: z.string().optional(),
      start: z.number().nullish(),
      eliminatedCannotWin: z.boolean().optional(),
    })
    .nullish(),
});

export type ScoreTemplate = z.infer<typeof scoreTemplateSchema>;
export type ScoreCategory = ScoreTemplate['categories'][number];
export type ScoreFormula = ScoreCategory['formula'];
export type RankAwardSpec = NonNullable<ScoreFormula['rankAward']>;
