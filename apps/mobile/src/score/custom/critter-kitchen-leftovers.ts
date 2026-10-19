import {
  CRITTER_KITCHEN_BASE_COURSE_IDS,
  CRITTER_KITCHEN_COURSE_IDS,
  type CritterKitchenIngredientType,
} from '@onboard/shared';

/** A wine-only rumor must not hide ingredients needed by another selected rumor. */
export function leftoverIngredientTypes(
  hints: ReadonlySet<string>,
  gelatoEnabled: boolean,
): CritterKitchenIngredientType[] {
  if (hints.has('leftover-ingredients'))
    return [...(gelatoEnabled ? CRITTER_KITCHEN_COURSE_IDS : CRITTER_KITCHEN_BASE_COURSE_IDS)];
  return hints.has('leftover-wine') ? ['wine'] : [];
}
