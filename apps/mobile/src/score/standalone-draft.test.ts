import { describe, expect, it } from 'vitest';
import { initialState } from './model';
import {
  createStandaloneSaver,
  loadStandaloneDraft,
  newStandaloneDraft,
  standaloneDraftKey,
  type DraftSaveStatus,
  type StandaloneStorage,
} from './standalone-draft';

const template = { slug: 'harmonies', templateVersion: 2 };
function memoryStorage() {
  const data = new Map<string, string>();
  return {
    data,
    getItem: async (key: string) => data.get(key) ?? null,
    setItem: async (key: string, value: string) => {
      data.set(key, value);
    },
  };
}

describe('standalone score draft persistence', () => {
  it('restores stable session/player IDs, shared setup and animal card edits after reload', async () => {
    const storage = memoryStorage();
    const draft = newStandaloneDraft(template, 'session-1');
    const state = initialState([{ id: 'player-1', name: 'An', kind: 'guest' }]);
    state.teamValues = { boardSide: 1 };
    state.values = { 'player-1': { animalCards: [3, 0, 8], islandsSideB: 3 } };
    state.pendingOps = [
      {
        opId: 'op-1',
        actorId: 'local',
        identityId: 'player-1',
        categoryKey: 'animalCards',
        value: [3, 0, 8],
      },
    ];
    const statuses: DraftSaveStatus[] = [];
    const saver = createStandaloneSaver(storage, draft, (s) => statuses.push(s));
    saver.save(state);
    await saver.flush();
    const restored = await loadStandaloneDraft(storage, template);
    expect(restored).toMatchObject({
      sessionId: 'session-1',
      templateSlug: 'harmonies',
      templateVersion: 2,
      state: {
        players: state.players,
        teamValues: { boardSide: 1 },
        values: state.values,
        pendingOps: [],
      },
    });
    expect(statuses).toEqual(['saving', 'saved']);
    expect(state.pendingOps).toHaveLength(1);
  });

  it('keeps games and incompatible template versions in separate storage keys', async () => {
    const storage = memoryStorage();
    const saver = createStandaloneSaver(
      storage,
      newStandaloneDraft(template, 'session-1'),
      () => {},
    );
    saver.save(initialState([]));
    await saver.flush();
    expect(await loadStandaloneDraft(storage, { ...template, templateVersion: 3 })).toBeNull();
    expect(await loadStandaloneDraft(storage, { ...template, slug: 'applejack-2022' })).toBeNull();
    expect(await loadStandaloneDraft(storage, template)).not.toBeNull();
  });

  it.each([
    '{broken',
    JSON.stringify({ ...newStandaloneDraft(template, 's'), templateSlug: 'another-game' }),
    JSON.stringify({
      ...newStandaloneDraft(template, 's'),
      state: { ...initialState([]), teamValues: null },
    }),
    JSON.stringify({
      ...newStandaloneDraft(template, 's'),
      state: {
        ...initialState([]),
        players: [
          { id: 'p', name: 'A' },
          { id: 'p', name: 'B' },
        ],
      },
    }),
    JSON.stringify({
      ...newStandaloneDraft(template, 's'),
      state: { ...initialState([]), values: { p: { animalCards: ['wrong'] } } },
    }),
  ])('rejects damaged or mismatched drafts without modifying stored content', async (raw) => {
    const storage = memoryStorage();
    storage.data.set(standaloneDraftKey(template), raw);
    await expect(loadStandaloneDraft(storage, template)).rejects.toThrow();
    expect(storage.data.get(standaloneDraftKey(template))).toBe(raw);
  });

  it('serializes delayed writes and only reports the latest revision saved', async () => {
    const storage = memoryStorage();
    let release!: () => void;
    const first = new Promise<void>((resolve) => {
      release = resolve;
    });
    let count = 0;
    const delayed: StandaloneStorage = {
      getItem: storage.getItem,
      setItem: async (key, value) => {
        if (++count === 1) await first;
        await storage.setItem(key, value);
      },
    };
    const statuses: DraftSaveStatus[] = [];
    const saver = createStandaloneSaver(delayed, newStandaloneDraft(template, 's'), (s) =>
      statuses.push(s),
    );
    const state = initialState([{ id: 'p', name: 'An' }]);
    saver.save({ ...state, values: { p: { animalCards: [3] } } });
    saver.save({ ...state, values: { p: { animalCards: [8, 0] } } });
    release();
    await saver.flush();
    expect((await loadStandaloneDraft(storage, template))?.state.values.p).toEqual({
      animalCards: [8, 0],
    });
    expect(statuses).toEqual(['saving', 'saving', 'saved']);
  });

  it('reports storage failures and saves the current scores on retry', async () => {
    const storage = memoryStorage();
    let failing = true;
    const quota: StandaloneStorage = {
      getItem: storage.getItem,
      setItem: (key, value) =>
        failing ? Promise.reject(new Error('Quota exceeded')) : storage.setItem(key, value),
    };
    const statuses: DraftSaveStatus[] = [];
    const saver = createStandaloneSaver(quota, newStandaloneDraft(template, 's'), (s) =>
      statuses.push(s),
    );
    const state = {
      ...initialState([{ id: 'p', name: 'An' }]),
      values: { p: { islandsSideB: 3 } },
    };
    saver.save(state);
    await expect(saver.flush()).rejects.toThrow('Quota exceeded');
    expect(statuses.at(-1)).toBe('error');
    expect(storage.data.size).toBe(0);
    failing = false;
    saver.save(state);
    await saver.flush();
    expect((await loadStandaloneDraft(storage, template))?.state.values).toEqual(state.values);
    expect(statuses.at(-1)).toBe('saved');
  });
});
