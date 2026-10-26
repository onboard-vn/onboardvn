import { describe, expect, it } from 'vitest';
import { TEAM_ID } from '../../api/plays-types';
import { applyOp, buildInput, initialState, summarize } from '../model';
import { scoreTemplates } from '../templates';
import {
  animalCardPoints,
  deleteAnimalCardById,
  editAnimalCardById,
  editAnimalCards,
  heightCounter,
  readyAnimalCardPoints,
  supportsApplejackCounters,
  supportsHarmoniesCounters,
  wholeCounter,
} from './applejack-harmonies-counters';

const applejack = scoreTemplates['applejack-2022']!;
const harmonies = scoreTemplates.harmonies!;
const players = [
  { id: 'a', name: 'A' },
  { id: 'b', name: 'B' },
];

describe('Applejack and Harmonies counter contracts', () => {
  it('registers both local templates with the current counter input contract', () => {
    expect(supportsApplejackCounters(applejack)).toBe(true);
    expect(supportsHarmoniesCounters(harmonies)).toBe(true);
  });

  it('keeps legacy pinned versions and incomplete definitions on the generic fallback', () => {
    expect(supportsApplejackCounters({ ...applejack, templateVersion: 1 })).toBe(false);
    expect(supportsHarmoniesCounters({ ...harmonies, templateVersion: 1 })).toBe(false);
    expect(
      supportsApplejackCounters({
        ...applejack,
        categories: applejack.categories.filter(({ key }) => key !== 'profitableVarieties'),
      }),
    ).toBe(false);
    expect(
      supportsHarmoniesCounters({
        ...harmonies,
        categories: harmonies.categories.filter(({ key }) => key !== 'boardSide'),
      }),
    ).toBe(false);
    expect(
      supportsHarmoniesCounters({
        ...harmonies,
        categories: harmonies.categories.map((category) =>
          category.key === 'trees' ? { ...category, inputs: ['height1', 'height2'] } : category,
        ),
      }),
    ).toBe(false);
    expect(
      supportsHarmoniesCounters({
        ...harmonies,
        categories: harmonies.categories.map((category) =>
          category.key === 'boardSide' ? { ...category, scope: 'player' } : category,
        ),
      }),
    ).toBe(false);
  });

  it('bounds game controls to finite nonnegative whole numbers without a river cap', () => {
    expect(
      [undefined, NaN, Infinity, -2, 0, 2.9, 15, 30].map((value) => wholeCounter(value)),
    ).toEqual([0, 0, 0, 0, 0, 2, 15, 30]);
    expect([undefined, 0, -1, 1, 2.9].map((value) => wholeCounter(value, 1))).toEqual([
      1, 1, 1, 1, 2,
    ]);
    expect(heightCounter({ height1: 3, height2: -1 }, 'height1')).toBe(3);
    expect(heightCounter({ height2: -1 }, 'height2')).toBe(0);
    expect(heightCounter([3], 'height1')).toBe(0);
  });

  it('adds zero-point animal cards and edits or removes one duplicate independently', () => {
    const original = [3, 0, 3];
    const added = editAnimalCards(original, { type: 'add', points: 0 });
    expect(added).toEqual([3, 0, 3, 0]);
    const edited = editAnimalCards(added, { type: 'edit', index: 2, points: 8 });
    expect(edited).toEqual([3, 0, 8, 0]);
    expect(editAnimalCards(edited, { type: 'delete', index: 1 })).toEqual([3, 8, 0]);
    expect(editAnimalCards(original, { type: 'edit', index: 0, points: -3 })).toEqual([0, 0, 3]);
    expect(editAnimalCards(original, { type: 'delete', index: -1 })).toEqual(original);
    expect(original).toEqual([3, 0, 3]);
    expect(animalCardPoints(0)).toEqual([0]);
    expect(animalCardPoints(undefined)).toEqual([]);
  });

  it('keeps a delayed edit attached to its card after deleting an earlier card', () => {
    const afterDelete = deleteAnimalCardById(
      { ids: ['card-1', 'card-2', 'card-3'], points: [0, 0, 0] },
      'card-1',
    );
    expect(afterDelete).toEqual({ ids: ['card-2', 'card-3'], points: [0, 0] });
    expect(editAnimalCardById(afterDelete, 'card-2', 6)).toEqual({
      ids: ['card-2', 'card-3'],
      points: [6, 0],
    });
    expect(editAnimalCardById(afterDelete, 'card-1', 9)).toBe(afterDelete);
  });

  it('shows eight ready cards for missing lists without writing sheet state', () => {
    const state = initialState(players);
    for (const player of state.players) {
      expect(readyAnimalCardPoints(state.values[player.id]?.animalCards)).toEqual(Array(8).fill(0));
    }
    const withNewPlayer = { ...state, players: [...state.players, { id: 'c', name: 'C' }] };
    expect(readyAnimalCardPoints(withNewPlayer.values.c?.animalCards)).toEqual(Array(8).fill(0));
    expect(state.values).toEqual({});
    expect(state.pendingOps).toEqual([]);
    expect(summarize(harmonies, state).rows.map(({ total }) => total)).toEqual([0, 0]);
  });

  it('preserves saved cards and explicitly empty lists instead of adding ready cards', () => {
    const saved = [3, 0, 8];
    expect(readyAnimalCardPoints(saved)).toEqual([3, 0, 8]);
    expect(readyAnimalCardPoints([])).toEqual([]);
    expect(readyAnimalCardPoints(0)).toEqual([0]);
    expect(saved).toEqual([3, 0, 8]);
  });

  it.each([
    { edit: { type: 'add', points: 5 } as const, expected: [...Array<number>(8).fill(0), 5] },
    { edit: { type: 'edit', index: 2, points: 8 } as const, expected: [0, 0, 8, 0, 0, 0, 0, 0] },
    { edit: { type: 'delete', index: 2 } as const, expected: Array<number>(7).fill(0) },
  ])('materializes ready cards on the first $edit.type operation', ({ edit, expected }) => {
    const initial = initialState(players);
    const state = applyOp(initial, {
      opId: 'animal-first-edit',
      actorId: 'a',
      identityId: 'a',
      categoryKey: 'animalCards',
      value: editAnimalCards(readyAnimalCardPoints(initial.values.a?.animalCards), edit),
    });
    expect(state.values.a?.animalCards).toEqual(expected);
    expect(state.values.b?.animalCards).toBeUndefined();
    expect(summarize(harmonies, state).rows[0]?.total).toBe(
      expected.reduce((sum, points) => sum + points, 0),
    );
  });

  it('keeps edited ready cards and deletion of all cards through sheet restoration', () => {
    let state = initialState(players);
    const edit = (change: Parameters<typeof editAnimalCards>[1]) => {
      state = applyOp(state, {
        opId: 'animal-ready-edit',
        actorId: 'a',
        identityId: 'a',
        categoryKey: 'animalCards',
        value: editAnimalCards(readyAnimalCardPoints(state.values.a?.animalCards), change),
      });
    };
    edit({ type: 'edit', index: 0, points: 3 });
    edit({ type: 'edit', index: 2, points: 8 });
    edit({ type: 'add', points: 5 });
    expect(state.values.a?.animalCards).toEqual([3, 0, 8, 0, 0, 0, 0, 0, 5]);
    expect(summarize(harmonies, state).rows[0]?.total).toBe(16);
    edit({ type: 'delete', index: 0 });
    expect(summarize(harmonies, state).rows[0]?.total).toBe(13);
    while (readyAnimalCardPoints(state.values.a?.animalCards).length)
      edit({ type: 'delete', index: 0 });
    const restored = JSON.parse(JSON.stringify(state));
    expect(readyAnimalCardPoints(restored.values.a?.animalCards)).toEqual([]);
    expect(buildInput(harmonies, restored).players[0]?.values.animalCards).toEqual([]);
    expect(summarize(harmonies, restored).rows[0]?.total).toBe(0);
  });

  it('retains editable animal-card lists through sheet ops and draft restoration', () => {
    let state = initialState(players);
    const edits = [
      { type: 'add', points: 3 },
      { type: 'add', points: 0 },
      { type: 'add', points: 8 },
      { type: 'edit', index: 0, points: 5 },
      { type: 'delete', index: 2 },
    ] as const;
    for (const edit of edits) {
      state = applyOp(state, {
        opId: 'animal-list',
        actorId: 'a',
        identityId: 'a',
        categoryKey: 'animalCards',
        value: editAnimalCards(animalCardPoints(state.values.a?.animalCards), edit),
      });
    }
    const restored = JSON.parse(JSON.stringify(state));
    expect(buildInput(harmonies, restored).players[0]?.values.animalCards).toEqual([5, 0]);
    expect(summarize(harmonies, restored).rows[0]?.total).toBe(5);
  });

  it('switches water for every player with one shared value and preserves hidden counters', () => {
    const state = {
      ...initialState(players),
      values: {
        a: { riverSideA: 8, islandsSideB: 3 },
        b: { riverSideA: 15 },
      },
    };
    expect(summarize(harmonies, state).rows.map(({ total }) => total)).toEqual([23, 51]);
    const sideB = applyOp(state, {
      opId: 'side',
      actorId: 'host',
      identityId: TEAM_ID,
      categoryKey: 'boardSide',
      value: 1,
    });
    expect(buildInput(harmonies, sideB).players.map(({ values }) => values.boardSide)).toEqual([
      1, 1,
    ]);
    expect(summarize(harmonies, sideB).rows.map(({ total }) => total)).toEqual([15, 5]);
    expect(sideB.values.a?.riverSideA).toBe(8);
    const sideA = applyOp(sideB, {
      opId: 'side-back',
      actorId: 'host',
      identityId: TEAM_ID,
      categoryKey: 'boardSide',
      value: 0,
    });
    expect(summarize(harmonies, sideA).rows.map(({ total }) => total)).toEqual([23, 51]);
  });

  it('uses placed animal cubes to break a tie without adding them to the score', () => {
    const result = summarize(harmonies, {
      ...initialState(players),
      values: {
        a: { animalCards: [5], animalCubesPlaced: 2 },
        b: { animalCards: [5], animalCubesPlaced: 3 },
      },
    });
    expect(result.rows.map(({ total }) => total)).toEqual([5, 5]);
    expect(result.winners).toEqual(['b']);
  });
});
