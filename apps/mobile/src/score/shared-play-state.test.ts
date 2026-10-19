import { describe, expect, it } from 'vitest';
import { applyOp, initialState, readCell } from './model';
import { mergePendingEdits, sheetStateFromPlay, sharedTeamIdentity } from './shared-play-state';
import type { PlayDto } from '@onboard/shared';
import { scoreTemplates } from './templates';
import type { PlayOp } from '../api/plays-types';

const player = { id: 'player-1', name: 'Mai', kind: 'member' as const };
const mealOp = (inputKey: string, value: number | null): PlayOp => ({
  opId: `op-${inputKey}`,
  actorId: 'user-1',
  identityId: player.id,
  categoryKey: 'meal',
  inputKey,
  value,
});

describe('shared numeric-record cells', () => {
  const acquirePlay = (): PlayDto => ({
    id: 'play',
    clubId: null,
    meetupTableId: null,
    game: { id: 'game', slug: 'acquire-1963', name: 'Acquire' },
    template: null,
    setup: null,
    status: 'draft',
    outcome: null,
    rev: 1,
    editedAfterFinal: false,
    startedAt: '2026-10-16T00:00:00Z',
    endedAt: null,
    createdBy: 'user',
    tieUnresolved: false,
    warnings: [],
    canEdit: true,
    canManage: true,
    editableIdentityIds: ['first', 'second'],
    // Deliberately reverse array order: the team write owner is chosen by seat.
    players: [2, 1].map((seat) => ({
      identity: {
        id: seat === 1 ? 'first' : 'second',
        kind: 'guest',
        displayName: `Seat ${seat}`,
        userId: null,
        username: null,
        image: null,
        clubId: null,
        invitedByIdentityId: null,
      },
      seat,
      team: null,
      role: null,
      rounds: null,
      isWinnerOverride: null,
      computed: null,
      values:
        seat === 1
          ? {
              cash: 6000,
              chainShares: { tower: 5, luxor: 2 },
              chainPrices: { tower: 400 },
              marketShares: { tower: 9 },
            }
          : { cash: 6000, chainShares: { tower: 3 } },
    })),
  });

  it('hydrates Acquire holdings and shared setup from a serialized server snapshot', () => {
    const play: PlayDto = JSON.parse(JSON.stringify(acquirePlay()));
    const state = sheetStateFromPlay(scoreTemplates['acquire-1963']!, play);
    expect(sharedTeamIdentity(play)).toBe('first');
    expect(state.players.map((p) => p.id)).toEqual(['first', 'second']);
    expect(state.values.first?.chainShares).toEqual({ tower: 5, luxor: 2 });
    expect(state.values.second?.chainShares).toEqual({ tower: 3 });
    expect(state.teamValues.chainPrices).toEqual({ tower: 400 });
    expect(state.teamValues.marketShares).toEqual({ tower: 9 });
  });

  it('keeps another holding and refreshed shared setup while replaying an offline quantity edit', () => {
    const template = scoreTemplates['acquire-1963']!;
    const current = sheetStateFromPlay(template, acquirePlay());
    const pending: PlayOp = {
      opId: 'holding-edit',
      actorId: 'user',
      identityId: 'first',
      categoryKey: 'chainShares',
      inputKey: 'tower',
      value: 7,
    };
    const local = applyOp(current, pending);
    local.pendingOps = [pending];
    const refreshed = acquirePlay();
    refreshed.players.find((p) => p.seat === 1)!.values.chainPrices = { tower: 500 };
    const merged = mergePendingEdits(sheetStateFromPlay(template, refreshed), local);
    expect(merged.values.first?.chainShares).toEqual({ tower: 7, luxor: 2 });
    expect(merged.teamValues.chainPrices).toEqual({ tower: 500 });
    expect(merged.pendingOps).toEqual([pending]);
    expect(merged.extras).not.toHaveProperty('chainShares');
  });

  it('keeps concurrent edits to different meal inputs when operations are applied', () => {
    const state = initialState([player]);
    const withSoup = applyOp(state, mealOp('soupCount', 2));
    const withBoth = applyOp(withSoup, mealOp('previousStars', 7));

    expect(readCell(withBoth, mealOp('soupCount', 0))).toBe(2);
    expect(readCell(withBoth, mealOp('previousStars', 0))).toBe(7);
  });

  it('reconciles a server snapshot without replacing another pending meal input', () => {
    const server = applyOp(initialState([player]), mealOp('soupCount', 1));
    const local = applyOp(server, mealOp('previousStars', 4));
    local.pendingOps = [mealOp('previousStars', 4)];

    const reconciled = mergePendingEdits(server, local);

    expect(readCell(reconciled, mealOp('soupCount', 0))).toBe(1);
    expect(readCell(reconciled, mealOp('previousStars', 0))).toBe(4);
    expect(reconciled.pendingOps).toHaveLength(1);
  });

  it('clears one input without deleting the rest of the meal record', () => {
    const populated = applyOp(
      applyOp(initialState([player]), mealOp('soupCount', 3)),
      mealOp('previousStars', 5),
    );

    const cleared = applyOp(populated, mealOp('soupCount', null));

    expect(readCell(cleared, mealOp('soupCount', 0))).toBeUndefined();
    expect(readCell(cleared, mealOp('previousStars', 0))).toBe(5);
  });
});
