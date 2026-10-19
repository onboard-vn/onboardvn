import { describe, expect, it } from 'vitest';
import {
  critterKitchenMealInputKeySchema,
  critterKitchenMealSchema,
  critterKitchenSetupSchema,
  playPatchSchema,
  playSetupSchema,
} from '@onboard/shared';

const setup = {
  criticId: 'the-mouse',
  rumorIds: ['bread-fanatic', 'carrot-fanatic', 'cheese-fanatic'],
  cartIds: [],
  sixSevenPlayerMode: false,
};

describe('shared setup request boundaries', () => {
  it('accepts clearing setup and a complete supported shared Critter setup', () => {
    expect(playPatchSchema.safeParse({ setup: null }).success).toBe(true);
    expect(playPatchSchema.safeParse({ setup }).success).toBe(true);
    expect(critterKitchenSetupSchema.safeParse(setup).success).toBe(true);
  });
  it('limits shared setup by encoded bytes, including multibyte characters', () => {
    expect(playSetupSchema.safeParse({ label: 'a'.repeat(64000) }).success).toBe(true);
    expect(playSetupSchema.safeParse({ label: '漢'.repeat(22000) }).success).toBe(false);
  });
  it('rejects unknown critics, duplicate rumors, and incomplete setup', () => {
    for (const invalid of [
      { ...setup, criticId: 'unknown-critic' },
      { ...setup, rumorIds: ['bread-fanatic', 'bread-fanatic', 'cheese-fanatic'] },
      { ...setup, rumorIds: [] },
    ])
      expect(critterKitchenSetupSchema.safeParse(invalid).success).toBe(false);
  });
  it('permits independent meal scalars while rejecting unknown or negative meal fields', () => {
    expect(critterKitchenMealInputKeySchema.safeParse('previousStars').success).toBe(true);
    expect(critterKitchenMealSchema.safeParse({ previousStars: 2, soupCount: 1 }).success).toBe(
      true,
    );
    expect(critterKitchenMealInputKeySchema.safeParse('unknownInput').success).toBe(false);
    expect(critterKitchenMealSchema.safeParse({ previousStars: -1 }).success).toBe(false);
    expect(critterKitchenMealSchema.safeParse({ unknownInput: 1 }).success).toBe(false);
  });
});
