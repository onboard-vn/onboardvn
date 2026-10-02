export interface CommunityTotals {
  added: number;
  skipped: number;
  skippedRemoved: number;
}

export type CommunityBatchResult =
  | { kind: 'ok'; added: number; skipped: number; skippedRemoved: number }
  | { kind: 'conflict'; size: number }
  | { kind: 'error'; message: string };
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
