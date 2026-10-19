import { describe, expect, it } from 'vitest';
import type { PlayValueOp } from '@onboard/shared';
import { scoreTemplateFixture } from '../../test/score-template-fixture.js';
import { applyInputValue, validateInputKey } from './value-ops.js';

const template = scoreTemplateFixture({
  categories: [
    {
      key: 'holdings',
      label: 'Holdings',
      scope: 'player',
      input: 'counts',
      inputs: ['tower', 'luxor'],
      formula: { type: 'sum' },
      countsToTotal: true,
    },
  ],
});
const op = (over: Partial<PlayValueOp> = {}): PlayValueOp => ({
  opId: 'op',
  identityId: 'player',
  categoryKey: 'holdings',
  inputKey: 'tower',
  value: 3,
  ...over,
});

describe('partial numeric record operations', () => {
  it('rejects undeclared keys, nonnumeric values, negative counts and round indices', () => {
    expect(validateInputKey(op(), template)).toBeNull();
    for (const invalid of [
      op({ inputKey: 'missing' }),
      op({ value: true }),
      op({ value: -1 }),
      op({ value: Number.NaN }),
      op({ roundIndex: 0 }),
    ]) {
      expect(validateInputKey(invalid, template)).not.toBeNull();
    }
    expect(validateInputKey(op(), null)).not.toBeNull();
  });
  it('merges sibling edits and clears only one key without changing the source', () => {
    const source = { holdings: { tower: 1, luxor: 5 }, total: 8 };
    const updated = applyInputValue(source, op());
    expect(updated).toEqual({
      oldValue: 1,
      values: { holdings: { tower: 3, luxor: 5 }, total: 8 },
    });
    const cleared = applyInputValue(updated.values, op({ value: null }));
    expect(cleared.values).toEqual({ holdings: { luxor: 5 }, total: 8 });
    expect(applyInputValue(cleared.values, op({ inputKey: 'luxor', value: null })).values).toEqual({
      total: 8,
    });
    expect(source.holdings.tower).toBe(1);
  });
  it('allows only the released Zoo Tycoon building adjustment fields to be signed', () => {
    const zoo = scoreTemplateFixture({
      slug: 'zoo-tycoon',
      templateVersion: 3,
      categories: [
        {
          ...template.categories[0]!,
          key: 'endQuantities',
          inputs: ['buildingPopularity', 'animals'],
        },
      ],
    });
    expect(
      validateInputKey(
        op({ categoryKey: 'endQuantities', inputKey: 'buildingPopularity', value: -2 }),
        zoo,
      ),
    ).toBeNull();
    expect(
      validateInputKey(op({ categoryKey: 'endQuantities', inputKey: 'animals', value: -2 }), zoo),
    ).not.toBeNull();
  });
});
