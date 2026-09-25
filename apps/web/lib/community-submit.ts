export interface CommunityTotals {
  added: number;
  skipped: number;
  skippedRemoved: number;
}

export type CommunityBatchResult =
  | { kind: 'ok'; added: number; skipped: number; skippedRemoved: number }
  /** All games in the batch were previously removed by staff/owner (server 409) — they count as
   * needing re-confirmation, not as a fatal error, so later batches still get submitted. */
  | { kind: 'conflict'; size: number }
  | { kind: 'error'; message: string };

/** Folds one batch outcome into running totals. Only a non-conflict error stops the caller's
 * loop — it's returned as `error` alongside whatever totals accumulated before it. */
export function applyCommunityBatchResult(
  totals: CommunityTotals,
  result: CommunityBatchResult,
): { totals: CommunityTotals; error?: string } {
  if (result.kind === 'ok') {
    return {
      totals: {
        added: totals.added + result.added,
        skipped: totals.skipped + result.skipped,
        skippedRemoved: totals.skippedRemoved + result.skippedRemoved,
      },
    };
  }
  if (result.kind === 'conflict') {
    return { totals: { ...totals, skippedRemoved: totals.skippedRemoved + result.size } };
  }
  return { totals, error: result.message };
}

/** Applies each result in order, stopping (without discarding prior totals) at the first
 * non-conflict error — mirrors how the real submit loop breaks out early on a hard failure. */
export function aggregateCommunityBatches(results: CommunityBatchResult[]): {
  totals: CommunityTotals;
  error?: string;
} {
  let totals: CommunityTotals = { added: 0, skipped: 0, skippedRemoved: 0 };
  for (const result of results) {
    const step = applyCommunityBatchResult(totals, result);
    totals = step.totals;
    if (step.error) return { totals, error: step.error };
  }
  return { totals };
}
