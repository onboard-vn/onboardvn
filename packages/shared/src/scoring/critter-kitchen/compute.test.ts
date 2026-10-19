import { describe, expect, it } from 'vitest';
import { computeCritterKitchen } from './compute.js';
import {
  critterKitchenDefaultSetup,
  critterKitchenLeftoverSpiceKey,
  critterKitchenMealInputKeySchema,
  critterKitchenMealSchema,
  type CritterKitchenMeal,
  type CritterKitchenPlayerInput,
  type CritterKitchenSetup,
} from './schema.js';

function setup(overrides: Partial<CritterKitchenSetup> = {}): CritterKitchenSetup {
  return {
    criticId: 'the-mouse',
    rumorIds: ['bread-fanatic', 'carrot-fanatic', 'cheese-fanatic'],
    additionalRumorIds: [],
    cartIds: [],
    sixSevenPlayerMode: false,
    ...overrides,
  };
}

function player(
  identityId: string,
  seat: number,
  priorityPosition: number,
  extra: Record<string, number> = {},
): CritterKitchenPlayerInput {
  const meal: CritterKitchenMeal = {
    previousStars: 0,
    priorityPosition,
    soupCount: 0,
    bisqueCount: 0,
    'restaurateur.none': 1,
    ...extra,
  };
  return { identityId, seat, meal };
}

describe('computeCritterKitchen', () => {
  it('scores seven players and resolves equal totals by actual priority order', () => {
    const result = computeCritterKitchen(
      setup({
        rumorIds: ['spice-lover', 'tender', 'varied-servings'],
        sixSevenPlayerMode: true,
      }),
      Array.from({ length: 7 }, (_, index) =>
        player(`p${index + 1}`, index, index + 1, { 'served.bread.bread.2': 1 }),
      ),
    );

    expect(result.complete).toBe(true);
    expect(result.tieUnresolved).toBe(false);
    expect(
      result.players.filter((scored) => scored.isWinner).map((scored) => scored.identityId),
    ).toEqual(['p1']);
    expect(result.players.map((scored) => scored.rank)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    for (const scored of result.players) {
      expect(Object.values(scored.categories).reduce((sum, value) => sum + value, 0)).toBe(
        scored.total,
      );
    }
  });

  it('doubles fanatic course quality after best-of-course awards are determined', () => {
    const result = computeCritterKitchen(
      setup({
        rumorIds: ['bread-fanatic', 'cheese-fanatic', 'tender'],
      }),
      [
        player('lower-bread', 0, 2, { 'served.bread.bread.2': 1, 'served.cheese.cheese.2': 1 }),
        player('higher-bread', 1, 1, { 'served.bread.bread.3': 1, 'served.cheese.cheese.2': 1 }),
      ],
    );

    expect(result.complete).toBe(true);
    const lower = result.players.find((scored) => scored.identityId === 'lower-bread')!;
    const higher = result.players.find((scored) => scored.identityId === 'higher-bread')!;
    expect(lower.courseQuality.bread).toBe(4);
    expect(higher.courseQuality.bread).toBe(6);
    expect(lower.rumorScores['bread-fanatic']).toBe(0);
    expect(lower.categories.bestOfCourse).toBe(2); // Cheese earns two Mouse stars; lower bread loses that course.
    expect(higher.categories.bestOfCourse).toBe(3); // Cheese plus bread, before fanatic doubling.
  });

  it('counts Allspice toward Tree Shrew quality and Spice Lover thresholds', () => {
    const result = computeCritterKitchen(
      setup({
        criticId: 'the-tree-shrew',
        rumorIds: ['spice-lover', 'nocturnal', 'tender'],
      }),
      [
        player('three-allspice', 0, 1, {
          'served.bread.bread.3': 1,
          'served.carrot.carrot.3': 1,
          'served.cheese.cheese.3': 1,
          'allspice.bread.bread.3': 1,
          'allspice.carrot.carrot.3': 1,
          'allspice.cheese.cheese.3': 1,
        }),
        player('plain-meal', 1, 2, {
          'served.bread.bread.2': 1,
          'served.carrot.carrot.2': 1,
          'served.cheese.cheese.2': 1,
        }),
      ],
    );

    expect(result.complete).toBe(true);
    const allspiceMeal = result.players.find((scored) => scored.identityId === 'three-allspice')!;
    const plainMeal = result.players.find((scored) => scored.identityId === 'plain-meal')!;
    expect(allspiceMeal.courseQuality.bread).toBe(9);
    expect(allspiceMeal.rumorScores['spice-lover']).toBe(2);
    expect(plainMeal.rumorScores['spice-lover']).toBe(0);
  });

  it('applies spice only to the counted ingredients that actually received it', () => {
    const result = computeCritterKitchen(
      setup({
        rumorIds: ['spice-lover', 'tender', 'hibernator'],
      }),
      [
        player('one-spiced', 0, 1, {
          'served.cheese.cheese.4': 2,
          'spice.cheese.cheese.4.cheese': 1,
        }),
        player('none-spiced', 1, 2, { 'served.cheese.cheese.4': 2 }),
      ],
    );

    expect(result.complete).toBe(true);
    expect(
      result.players.find((scored) => scored.identityId === 'one-spiced')!.courseQuality.cheese,
    ).toBe(12);
    expect(
      result.players.find((scored) => scored.identityId === 'none-spiced')!.courseQuality.cheese,
    ).toBe(8);
  });

  it('scores To Go and Wine Cellar leftovers and uses total served ingredients for Varied Servings ties', () => {
    const result = computeCritterKitchen(
      setup({
        rumorIds: ['to-go', 'wine-cellar', 'varied-servings'],
      }),
      [
        player('two-values', 0, 1, {
          'served.bread.bread.2': 1,
          'served.cheese.cheese.3': 1,
          'leftover.wine.2': 2,
          'leftover.carrot.3': 1,
        }),
        player('three-same-value', 1, 2, {
          'served.bread.bread.2': 1,
          'served.cheese.cheese.2': 2,
          'leftover.wine.3': 1,
          [critterKitchenLeftoverSpiceKey('allspice')]: 1,
        }),
      ],
    );

    expect(result.complete).toBe(true);
    const twoValues = result.players.find((scored) => scored.identityId === 'two-values')!;
    const threeSameValue = result.players.find(
      (scored) => scored.identityId === 'three-same-value',
    )!;
    expect(twoValues.rumorScores['wine-cellar']).toBe(2);
    expect(twoValues.rumorScores['to-go']).toBe(2);
    expect(threeSameValue.rumorScores['wine-cellar']).toBe(1);
    expect(threeSameValue.rumorScores['to-go']).toBe(1);
    expect(threeSameValue.rumorScores['varied-servings']).toBe(2);
  });

  it('uses normalized score-track position before priority as the first tiebreaker', () => {
    const result = computeCritterKitchen(setup(), [
      player('farther-track', 0, 2, { 'served.bread.bread.6': 1 }),
      player('ahead-on-priority', 1, 1, { 'served.bread.bread.4': 1, previousStars: 1 }),
    ]);

    expect(result.complete).toBe(true);
    const farther = result.players.find((scored) => scored.identityId === 'farther-track')!;
    const priority = result.players.find((scored) => scored.identityId === 'ahead-on-priority')!;
    expect(farther.total).toBe(priority.total);
    expect(farther.trackPosition).toBe(12);
    expect(priority.trackPosition).toBe(8);
    expect(farther.isWinner).toBe(true);
    expect(priority.isWinner).toBe(false);
  });

  it('normalizes quality 70 and 71 to positions 70 and 1 after a loop', () => {
    const result = computeCritterKitchen(
      setup({
        rumorIds: ['spice-lover', 'tender', 'simple-palate'],
      }),
      [
        player('quality-70', 0, 1, { 'served.cheese.cheese.7': 10 }),
        player('quality-71', 1, 2, { 'served.cheese.cheese.6': 11, 'served.cheese.cheese.5': 1 }),
      ],
    );

    expect(result.complete).toBe(true);
    const quality70 = result.players.find((scored) => scored.identityId === 'quality-70')!;
    const quality71 = result.players.find((scored) => scored.identityId === 'quality-71')!;
    expect([quality70.trackLoops, quality70.trackPosition]).toEqual([0, 70]);
    expect([quality71.trackLoops, quality71.trackPosition]).toEqual([1, 1]);
    expect(quality70.categories.criticTrackLoopStars).toBe(0);
    expect(quality70.categories.criticTrackRowStars).toBe(10);
    expect(quality71.categories.criticTrackLoopStars).toBe(10);
    expect(quality71.categories.criticTrackRowStars).toBe(1);
  });

  it('rejects critic meal shapes and unknown catalog inputs rather than finalizing partial scores', () => {
    const invalidMeal = computeCritterKitchen(critterKitchenDefaultSetup, [
      player('too-many-bread', 0, 1, { 'served.bread.bread.2': 2 }),
      player('valid', 1, 2, { 'served.bread.bread.2': 1 }),
    ]);
    const unsupportedRumor = computeCritterKitchen(
      setup({
        rumorIds: ['bread-fanatic', 'psychedelic-flavor', 'tender'],
      }),
      [
        player('p1', 0, 1, { 'served.bread.bread.2': 1 }),
        player('p2', 1, 2, { 'served.bread.bread.2': 1 }),
      ],
    );

    expect(invalidMeal.complete).toBe(false);
    expect(
      invalidMeal.errors.some((entry) =>
        entry.message.includes('only allows multiple ingredients'),
      ),
    ).toBe(true);
    expect(unsupportedRumor.complete).toBe(false);
    expect(critterKitchenMealInputKeySchema.safeParse('restaurateur.not-a-card').success).toBe(
      false,
    );
    expect(critterKitchenMealInputKeySchema.safeParse('restaurateur.none').success).toBe(true);
    expect(critterKitchenMealSchema.safeParse({ previousStars: 1000 }).success).toBe(true);
    expect(critterKitchenMealSchema.safeParse({ soupCount: 101 }).success).toBe(false);
  });
});
