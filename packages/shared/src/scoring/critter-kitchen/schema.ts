import { z } from 'zod';
import { CRITTER_KITCHEN_CATALOG } from './catalog.js';

export const CRITTER_KITCHEN_MEAL_CATEGORY_KEY = 'meal';
export const CRITTER_KITCHEN_NO_RESTAURATEUR_ID = 'none';

export const CRITTER_KITCHEN_COURSE_IDS = [
  'bread',
  'carrot',
  'cheese',
  'fish',
  'meat',
  'mushroom',
  'wine',
  'gelato',
] as const;

export const CRITTER_KITCHEN_BASE_COURSE_IDS = CRITTER_KITCHEN_COURSE_IDS.slice(0, 7);

export type CritterKitchenCourseId = (typeof CRITTER_KITCHEN_COURSE_IDS)[number];
export type CritterKitchenIngredientType = CritterKitchenCourseId;
export type CritterKitchenSpiceType = Exclude<CritterKitchenCourseId, 'gelato'>;
export type CritterKitchenSpiceTokenType = CritterKitchenSpiceType | 'allspice';

const cardIdSchema = z.string().trim().min(1).max(60);

const supportedCriticIds = new Set(
  CRITTER_KITCHEN_CATALOG.critics.filter((card) => card.supported).map((card) => card.id),
);
const supportedRumorIds = new Set(
  CRITTER_KITCHEN_CATALOG.rumors.filter((card) => card.supported).map((card) => card.id),
);
const supportedCartIds = new Set<string>(
  CRITTER_KITCHEN_CATALOG.carts.filter((card) => card.supported).map((card) => card.id),
);
const supportedRestaurateurIds = new Set<string>(
  CRITTER_KITCHEN_CATALOG.restaurateurs.filter((card) => card.supported).map((card) => card.id),
);

function addUnsupportedCardIssue(
  ctx: z.RefinementCtx,
  id: string,
  group: 'criticId' | 'rumorIds' | 'additionalRumorIds' | 'cartIds',
  index?: number,
): void {
  const catalog =
    group === 'criticId'
      ? CRITTER_KITCHEN_CATALOG.critics
      : group === 'cartIds'
        ? CRITTER_KITCHEN_CATALOG.carts
        : CRITTER_KITCHEN_CATALOG.rumors;
  const item = catalog.find((card) => card.id === id) as
    { label: string; reason?: string } | undefined;
  const path = index === undefined ? [group] : [group, index];
  ctx.addIssue({
    code: 'custom',
    message:
      item?.reason ??
      (item
        ? `${item.label} is not supported by automatic scoring.`
        : `Unknown Critter Kitchen ${group === 'criticId' ? 'critic' : group === 'cartIds' ? 'cart' : 'rumor'} id: ${id}.`),
    path,
  });
}

export const critterKitchenSetupSchema = z
  .strictObject({
    criticId: cardIdSchema,
    rumorIds: z.tuple([cardIdSchema, cardIdSchema, cardIdSchema]),
    /** Extra cards revealed by Jamie Owliver; each applies to all players. */
    additionalRumorIds: z.array(cardIdSchema).max(7).optional(),
    cartIds: z.array(cardIdSchema).max(20),
    sixSevenPlayerMode: z.boolean(),
  })
  .superRefine((setup, ctx) => {
    if (!supportedCriticIds.has(setup.criticId))
      addUnsupportedCardIssue(ctx, setup.criticId, 'criticId');
    setup.rumorIds.forEach((id, index) => {
      if (!supportedRumorIds.has(id)) addUnsupportedCardIssue(ctx, id, 'rumorIds', index);
    });
    setup.additionalRumorIds?.forEach((id, index) => {
      if (!supportedRumorIds.has(id)) addUnsupportedCardIssue(ctx, id, 'additionalRumorIds', index);
    });
    setup.cartIds.forEach((id, index) => {
      if (!supportedCartIds.has(id)) addUnsupportedCardIssue(ctx, id, 'cartIds', index);
    });
    if (new Set(setup.rumorIds).size !== setup.rumorIds.length) {
      ctx.addIssue({
        code: 'custom',
        message: 'Rumor cards must be distinct.',
        path: ['rumorIds'],
      });
    }
    const allRumorIds = [...setup.rumorIds, ...(setup.additionalRumorIds ?? [])];
    if (new Set(allRumorIds).size !== allRumorIds.length) {
      ctx.addIssue({
        code: 'custom',
        message: 'Rumor cards must be distinct, including Jamie Owliver’s additional rumor.',
        path: ['additionalRumorIds'],
      });
    }
    if (new Set(setup.cartIds).size !== setup.cartIds.length) {
      ctx.addIssue({
        code: 'custom',
        message: 'A cart component can only be selected once.',
        path: ['cartIds'],
      });
    }
  });

export type CritterKitchenSetup = z.infer<typeof critterKitchenSetupSchema>;

const coursePattern = CRITTER_KITCHEN_COURSE_IDS.join('|');
const ingredientPattern = CRITTER_KITCHEN_COURSE_IDS.join('|');
const spicePattern = (CRITTER_KITCHEN_COURSE_IDS.filter((id) => id !== 'gelato') as string[]).join(
  '|',
);
const mealKeyPattern = new RegExp(
  `^(?:previousStars|priorityPosition|soupCount|bisqueCount|rumorTokenCount|` +
    `served\\.(?:${coursePattern})\\.(?:${ingredientPattern})\\.[2-7]|` +
    `spice\\.(?:${coursePattern})\\.(?:${ingredientPattern})\\.[2-7]\\.(?:${spicePattern})|` +
    `allspice\\.(?:${coursePattern})\\.(?:${ingredientPattern})\\.[2-7]|` +
    `pairedWine\\.(?:${coursePattern})\\.[2-7]|` +
    `leftover\\.(?:${ingredientPattern})\\.[2-7]|` +
    `leftoverSpice\\.(?:${spicePattern}|allspice)|` +
    `restaurateur\\.(?:none|[a-z0-9]+(?:-[a-z0-9]+)*))$`,
);

/** One supported numeric input key. Unknown card IDs are rejected before persistence. */
export const critterKitchenMealInputKeySchema = z
  .string()
  .max(60)
  .regex(mealKeyPattern, { message: 'Unknown or malformed Critter Kitchen meal input key.' })
  .superRefine((key, ctx) => {
    if (!key.startsWith('restaurateur.')) return;
    const id = key.slice('restaurateur.'.length);
    if (id !== 'none' && !supportedRestaurateurIds.has(id)) {
      ctx.addIssue({ code: 'custom', message: `Unknown or unsupported restaurateur id: ${id}.` });
    }
  });

/**
 * Raw final-meal inputs are stored in the existing numeric `meal` play-value
 * category. Keys use the explicit syntax above; catalog membership and game
 * rules are validated by the scorer.
 */
export const critterKitchenMealSchema = z
  .record(critterKitchenMealInputKeySchema, z.number().finite().int().nonnegative().max(1000))
  .superRefine((meal, ctx) => {
    for (const [key, value] of Object.entries(meal)) {
      if (key !== CRITTER_KITCHEN_SCALAR_KEYS.previousStars && value > 100) {
        ctx.addIssue({
          code: 'custom',
          message: 'Meal counts and other numeric inputs cannot exceed 100.',
          path: [key],
        });
      }
    }
  });
export type CritterKitchenMeal = z.infer<typeof critterKitchenMealSchema>;

export const critterKitchenPlayerInputSchema = z.strictObject({
  identityId: z.string().min(1),
  seat: z.number().int().min(0).max(19),
  meal: critterKitchenMealSchema,
});
export type CritterKitchenPlayerInput = z.infer<typeof critterKitchenPlayerInputSchema>;

export type CritterKitchenScoreErrorCode =
  | 'INVALID_SETUP'
  | 'INVALID_PLAYER_COUNT'
  | 'INVALID_PLAYER'
  | 'INVALID_PRIORITY'
  | 'INVALID_MEAL'
  | 'INCOMPLETE'
  | 'UNSUPPORTED_CARD';

export interface CritterKitchenScoreError {
  code: CritterKitchenScoreErrorCode;
  message: string;
  path?: string;
}

export interface CritterKitchenPlayerScore {
  identityId: string;
  seat: number;
  categories: Record<string, number>;
  total: number;
  rank: number | null;
  isWinner: boolean;
  courseQuality: Partial<Record<CritterKitchenCourseId, number>>;
  rumorScores: Record<string, number>;
  trackPosition: number;
  trackLoops: number;
}

export interface CritterKitchenScoreResult {
  complete: boolean;
  errors: CritterKitchenScoreError[];
  warnings: string[];
  tieUnresolved: boolean;
  players: CritterKitchenPlayerScore[];
}

export const CRITTER_KITCHEN_SCALAR_KEYS = {
  previousStars: 'previousStars',
  priorityPosition: 'priorityPosition',
  soupCount: 'soupCount',
  bisqueCount: 'bisqueCount',
  rumorTokenCount: 'rumorTokenCount',
} as const;

export function critterKitchenServedKey(
  course: CritterKitchenCourseId,
  ingredientType: CritterKitchenIngredientType,
  printedValue: number,
): string {
  return `served.${course}.${ingredientType}.${printedValue}`;
}

export function critterKitchenSpiceKey(
  course: CritterKitchenCourseId,
  ingredientType: CritterKitchenIngredientType,
  printedValue: number,
  spiceType: CritterKitchenSpiceType,
): string {
  return `spice.${course}.${ingredientType}.${printedValue}.${spiceType}`;
}

export function critterKitchenAllspiceKey(
  course: CritterKitchenCourseId,
  ingredientType: CritterKitchenIngredientType,
  printedValue: number,
): string {
  return `allspice.${course}.${ingredientType}.${printedValue}`;
}

export function critterKitchenPairedWineKey(
  course: CritterKitchenCourseId,
  printedValue: number,
): string {
  return `pairedWine.${course}.${printedValue}`;
}

export function critterKitchenLeftoverKey(
  ingredientType: CritterKitchenIngredientType,
  printedValue: number,
): string {
  return `leftover.${ingredientType}.${printedValue}`;
}

export function critterKitchenLeftoverSpiceKey(spiceType: CritterKitchenSpiceTokenType): string {
  return `leftoverSpice.${spiceType}`;
}

export function critterKitchenRestaurateurKey(cardId: string): string {
  return `restaurateur.${cardId}`;
}

export const critterKitchenDefaultSetup: CritterKitchenSetup = {
  criticId: 'the-mouse',
  rumorIds: ['bread-fanatic', 'carrot-fanatic', 'cheese-fanatic'],
  additionalRumorIds: [],
  cartIds: [],
  sixSevenPlayerMode: false,
};
