import type { BarcodeLookupResult, GameUpcCandidate } from '@onboard/shared';
import { displayName, type ResolvedGame } from './game-name';

export interface ScanEntry {
  code: string;
  status: 'loading' | 'local' | 'candidates' | 'unknown' | 'linked' | 'error';
  game?: ResolvedGame;
  candidates?: GameUpcCandidate[];
  providerError?: boolean;
  error?: string;
}

export function applyLookup(entry: ScanEntry, body: BarcodeLookupResult): ScanEntry {
  if (body.kind === 'local') {
    return { ...entry, status: 'local', game: { id: body.game.id, name: displayName(body.game) } };
  }
  if (body.kind === 'candidates') return { ...entry, status: 'candidates', candidates: body.items };
  return { ...entry, status: 'unknown', providerError: body.providerError };
}

export function readyGames(entries: ScanEntry[]): ResolvedGame[] {
  const byId = new Map<string, ResolvedGame>();
  for (const e of entries) {
    if ((e.status === 'local' || e.status === 'linked') && e.game) byId.set(e.game.id, e.game);
  }
  return [...byId.values()];
}
