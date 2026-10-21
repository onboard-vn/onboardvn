import { describe, expect, it } from 'vitest';
import { applyOp, buildInput, initialState, summarize, type SheetState } from '../model';
import { scoreTemplates } from '../templates';

const template = scoreTemplates['shadow-hunters']!;
const players = ['a', 'b', 'c', 'd'].map((id) => ({ id, name: id }));
const completed = (): SheetState => ({
  ...initialState([...players]),
  values: {
    a: { character: 5, won: true },
    b: { character: 6, won: true },
    c: { character: 8, won: false },
    d: { character: 9, won: false },
  },
});

describe('Shadow Hunters end-game results', () => {
  it('records multiple winners without points or ranks', () => {
    const result = summarize(template, completed());
    expect(result.error).toBeNull();
    expect(result.winners).toEqual(['a', 'b']);
    expect(result.rows.map(({ total, rank }) => ({ total, rank }))).toEqual(
      players.map(() => ({ total: 0, rank: null })),
    );
    expect(result.note).toBeNull();
  });

  it('requires explicit characters and outcomes before finishing', () => {
    expect(summarize(template, initialState(players)).error).toContain('Chọn nhân vật');
    const state = completed();
    state.values.a = { character: 5 };
    expect(summarize(template, state).error).toContain('Chọn Thắng/Thua');
  });

  it.each([0, 11, 1.5])('rejects unknown character %s', (character) => {
    const state = completed();
    state.values.a.character = character;
    expect(summarize(template, state).error).toContain('Chọn nhân vật');
  });

  it('rejects duplicate characters and an all-loss result', () => {
    const state = completed();
    state.values.b.character = 5;
    expect(summarize(template, state).error).toContain('Mỗi nhân vật');
    state.values.b.character = 6;
    state.values.a.won = false;
    state.values.b.won = false;
    expect(summarize(template, state).error).toContain('ít nhất một người thắng');
  });

  it.each([3, 9])('rejects a roster of %s players', (count) => {
    const state = initialState(
      Array.from({ length: count }, (_, i) => ({ id: String(i), name: String(i) })),
    );
    expect(summarize(template, state).error).toContain('4 đến 8');
  });

  it('supports a neutral sharing victory and does not infer wins by faction', () => {
    const state = completed();
    state.players.push({ id: 'e', name: 'e' });
    state.values = { ...state.values, e: { character: 1, won: true } };
    state.values.b.won = false;
    expect(summarize(template, state).winners).toEqual(['a', 'e']);
    expect(summarize(template, state).error).toBeNull();
  });

  it('keeps character and result through ops and JSON draft restoration', () => {
    const state = completed();
    const next = applyOp(state, {
      opId: 'remote',
      actorId: 'b',
      identityId: 'c',
      categoryKey: 'won',
      value: true,
    });
    const restored = JSON.parse(JSON.stringify(next));
    expect(buildInput(template, restored).players[2]?.values).toEqual({ character: 8, won: true });
    expect(summarize(template, restored).winners).toEqual(['a', 'b', 'c']);
    expect(summarize(template, restored).error).toBeNull();
  });

  it('keeps results usable in a restored quick-mode draft and resets to incomplete', () => {
    const state = completed();
    state.mode = 'quick';
    expect(summarize(template, state).winners).toEqual(['a', 'b']);
    expect(summarize(template, initialState(state.players)).error).not.toBeNull();
  });
});
