import type { PlayPresenceEntry, PlayStreamEvent } from '@onboard/shared';

const PRESENCE_TTL_MS = 30_000;

type Listener = (event: PlayStreamEvent) => void;

/** In-memory pub/sub and presence. Single API node only: with several nodes, subscribers on
 * other nodes would not see events, so SSE clients must fall back to `?sinceRev=` polling. */
const listeners = new Map<string, Set<Listener>>();
const presence = new Map<string, Map<string, PlayPresenceEntry>>();

export function subscribe(playId: string, listener: Listener): () => void {
  const set = listeners.get(playId) ?? new Set<Listener>();
  set.add(listener);
  listeners.set(playId, set);
  return () => {
    set.delete(listener);
    if (set.size === 0) listeners.delete(playId);
  };
}

export function publish(playId: string, event: PlayStreamEvent): void {
  for (const listener of listeners.get(playId) ?? []) {
    try {
      listener(event);
    } catch {
      // a broken subscriber must not block the others
    }
  }
}

export function getPresence(playId: string, now = Date.now()): PlayPresenceEntry[] {
  const entries = presence.get(playId);
  if (!entries) return [];
  for (const [key, entry] of entries) {
    if (now - Date.parse(entry.at) > PRESENCE_TTL_MS) entries.delete(key);
  }
  if (entries.size === 0) presence.delete(playId);
  return [...entries.values()];
}

export function setPresence(
  playId: string,
  entry: Omit<PlayPresenceEntry, 'at'>,
  now = Date.now(),
): PlayPresenceEntry[] {
  const entries = presence.get(playId) ?? new Map<string, PlayPresenceEntry>();
  entries.set(entry.userId, { ...entry, at: new Date(now).toISOString() });
  presence.set(playId, entries);
  return getPresence(playId, now);
}
