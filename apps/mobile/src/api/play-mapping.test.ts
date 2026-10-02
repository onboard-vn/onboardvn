import type { PlayDto, ScoreTemplate } from '@onboard/shared';
import { describe, expect, it } from 'vitest';
import { cellMapFor, diffPlays, fromServerCell, sheetFromPlay, toServerOp } from './play-mapping';
import { QUICK_KEY, ROUND_KEY, TEAM_ID } from './plays-types';

const template = {
  slug: 't',
  categories: [
    { key: 'gold', input: 'number', scope: 'player' },
    { key: 'rounds', input: 'perRound', scope: 'player' },
    { key: 'won', input: 'boolean', scope: 'team' },
  ],
} as unknown as ScoreTemplate;

const player = (
  id: string,
  values: Record<string, unknown> = {},
  rounds: Record<string, number[]> | null = null,
) => ({
  identity: {
    id,
    kind: 'member' as const,
    displayName: id.toUpperCase(),
    userId: null,
    username: null,
    image: null,
    clubId: null,
    invitedByIdentityId: null,
  },
  seat: 1,
  team: null,
  role: null,
  values,
  rounds,
  isWinnerOverride: null,
  computed: null,
});

const play = (players: ReturnType<typeof player>[], withTemplate = true): PlayDto =>
  ({
    id: 'p',
    template: withTemplate ? { id: 'tpl', version: 1, variant: 'base', needsReview: false } : null,
    outcome: null,
    rev: 1,
    players,
  }) as unknown as PlayDto;

describe('play mapping', () => {
  const base = play([player('a'), player('b')]);
  const map = cellMapFor(template, base);

  it('maps team, round and quick cells to server keys and back', () => {
    const op = { opId: 'o', actorId: 'a', value: 1 };
    expect(toServerOp({ ...op, identityId: TEAM_ID, categoryKey: 'won' }, map)).toMatchObject({
      identityId: 'a',
      categoryKey: 'won',
    });
    expect(
      toServerOp({ ...op, identityId: 'b', categoryKey: ROUND_KEY, roundIndex: 2 }, map),
    ).toMatchObject({ identityId: 'b', categoryKey: 'rounds', roundIndex: 2 });
    expect(toServerOp({ ...op, identityId: 'b', categoryKey: QUICK_KEY }, map)).toMatchObject({
      categoryKey: 'total',
    });

    expect(fromServerCell({ identityId: 'b', categoryKey: 'won' }, map)).toEqual({
      identityId: TEAM_ID,
      categoryKey: 'won',
    });
    expect(fromServerCell({ identityId: 'b', categoryKey: 'rounds', roundIndex: 1 }, map)).toEqual({
      identityId: 'b',
      categoryKey: ROUND_KEY,
      roundIndex: 1,
    });
    expect(fromServerCell({ identityId: 'b', categoryKey: 'total' }, map).categoryKey).toBe(
      QUICK_KEY,
    );
  });

  it('drops round ops when the template has no per-round category', () => {
    const noRounds = cellMapFor(null, base);
    expect(
      toServerOp(
        {
          opId: 'o',
          actorId: 'a',
          identityId: 'a',
          categoryKey: ROUND_KEY,
          roundIndex: 0,
          value: 3,
        },
        noRounds,
      ),
    ).toBeNull();
  });

  it('diffs only changed cells', () => {
    const before = play([player('a', { gold: 1 }), player('b', {}, { rounds: [5] })]);
    const after = play([player('a', { gold: 1 }), player('b', { gold: 4 }, { rounds: [5, 7] })]);
    expect(diffPlays(before, after)).toEqual([
      { identityId: 'b', categoryKey: 'gold', value: 4 },
      { identityId: 'b', categoryKey: 'rounds', roundIndex: 1, value: 7 },
    ]);
  });

  it('rebuilds sheet state from a server play', () => {
    const s = sheetFromPlay(
      play([player('a', { gold: 3, won: true }, { rounds: [2, 4] }), player('b')]),
      template,
    );
    expect(s.players.map((p) => p.id)).toEqual(['a', 'b']);
    expect(s.values.a?.gold).toBe(3);
    expect(s.teamValues.won).toBe(true);
    expect(s.rounds.a).toEqual([2, 4]);
    expect(s.mode).toBe('detailed');

    const quick = sheetFromPlay(play([player('a', { total: 9 })], false), null);
    expect(quick.mode).toBe('quick');
    expect(quick.quickTotals.a).toBe(9);
  });
});
