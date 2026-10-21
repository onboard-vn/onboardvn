import { describe, expect, it } from 'vitest';
import { canSubmitClubJoin } from './club-join-state';

describe('canSubmitClubJoin', () => {
  it('allows joining without a club ID when there has been no failed link attempt', () => {
    expect(canSubmitClubJoin('', false)).toBe(true);
  });

  it('requires the user to re-enter an ID after a failed link attempt', () => {
    expect(canSubmitClubJoin('', true)).toBe(false);
    expect(canSubmitClubJoin('  club-id  ', true)).toBe(true);
  });
});
