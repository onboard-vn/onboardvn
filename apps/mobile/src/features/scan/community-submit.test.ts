import { describe, expect, it } from 'vitest';
import { aggregateCommunityBatches, applyCommunityBatchResult } from './community-submit';

describe('applyCommunityBatchResult', () => {
  it('adds an ok batch into totals', () => {
    const { totals, error } = applyCommunityBatchResult(
      { added: 1, skipped: 0, skippedRemoved: 0 },
      { kind: 'ok', added: 2, skipped: 1, skippedRemoved: 0 },
    );
    expect(totals).toEqual({ added: 3, skipped: 1, skippedRemoved: 0 });
    expect(error).toBeUndefined();
  });

  it('folds a 409 conflict into skippedRemoved without an error', () => {
    const { totals, error } = applyCommunityBatchResult(
      { added: 1, skipped: 0, skippedRemoved: 0 },
      { kind: 'conflict', size: 5 },
    );
    expect(totals).toEqual({ added: 1, skipped: 0, skippedRemoved: 5 });
    expect(error).toBeUndefined();
  });

  it('returns the error message while keeping prior totals untouched', () => {
    const prior = { added: 4, skipped: 2, skippedRemoved: 1 };
    const { totals, error } = applyCommunityBatchResult(prior, {
      kind: 'error',
      message: 'Quá nhiều yêu cầu',
    });
    expect(totals).toEqual(prior);
    expect(error).toBe('Quá nhiều yêu cầu');
  });
});

describe('aggregateCommunityBatches', () => {
  it('continues past a 409 conflict batch and keeps aggregating', () => {
    const { totals, error } = aggregateCommunityBatches([
      { kind: 'ok', added: 2, skipped: 0, skippedRemoved: 0 },
      { kind: 'conflict', size: 3 },
      { kind: 'ok', added: 1, skipped: 1, skippedRemoved: 0 },
    ]);
    expect(totals).toEqual({ added: 3, skipped: 1, skippedRemoved: 3 });
    expect(error).toBeUndefined();
  });

  it('stops at a mid-way error but keeps totals from earlier batches', () => {
    const { totals, error } = aggregateCommunityBatches([
      { kind: 'ok', added: 5, skipped: 2, skippedRemoved: 0 },
      { kind: 'error', message: 'Mất kết nối, thử lại sau' },
      { kind: 'ok', added: 100, skipped: 0, skippedRemoved: 0 },
    ]);
    expect(totals).toEqual({ added: 5, skipped: 2, skippedRemoved: 0 });
    expect(error).toBe('Mất kết nối, thử lại sau');
  });

  it('returns zeroed totals for an empty batch list', () => {
    expect(aggregateCommunityBatches([])).toEqual({
      totals: { added: 0, skipped: 0, skippedRemoved: 0 },
    });
  });
});
