import type { BarcodeLookupResult } from '@onboard/shared';
import { describe, expect, it } from 'vitest';
import { applyLookup, readyGames, type ScanEntry } from './scan-entries';

const base: ScanEntry = { code: '123', status: 'loading' };
const game = { id: 'g1', nameVi: null, nameEn: 'Catan' } as never;

describe('applyLookup', () => {
  it('maps local, candidates and unknown results', () => {
    const local = applyLookup(base, { kind: 'local', code: '123', game } as BarcodeLookupResult);
    expect(local).toMatchObject({ status: 'local', game: { id: 'g1', name: 'Catan' } });
    const cands = applyLookup(base, { kind: 'candidates', code: '123', items: [] });
    expect(cands.status).toBe('candidates');
    const unknown = applyLookup(base, { kind: 'unknown', code: '123', providerError: true });
    expect(unknown).toMatchObject({ status: 'unknown', providerError: true });
  });
});

describe('readyGames', () => {
  it('dedupes linked/local games by id', () => {
    const g = { id: 'g1', name: 'Catan' };
    const list: ScanEntry[] = [
      { code: '1', status: 'local', game: g },
      { code: '2', status: 'linked', game: g },
      { code: '3', status: 'unknown' },
    ];
    expect(readyGames(list)).toEqual([g]);
  });
});
