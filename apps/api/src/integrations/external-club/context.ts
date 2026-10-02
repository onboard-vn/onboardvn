import type { db } from '../../db/client.js';
import type { clubs } from '../../db/schema/index.js';

export type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export interface Counts {
  created: number;
  updated: number;
  unchanged: number;
}

export interface SyncReport {
  dryRun: boolean;
  members: Counts;
  games: { created: number; linked: number; unchanged: number };
  ownerships: { added: number; removed: number };
  meetups: Counts;
  tables: Counts & { removed: number };
  participantsAdded: number;
  unknownMemberRefs: number;
}

export interface SyncContext {
  tx: Tx;
  source: string;
  club: typeof clubs.$inferSelect;
  actorUserId: string;
  report: SyncReport;
  members: Map<string, { id: string; userId: string | null }>;
  gameIds: Map<string, string>;
}

export const emptyReport = (dryRun: boolean): SyncReport => ({
  dryRun,
  members: { created: 0, updated: 0, unchanged: 0 },
  games: { created: 0, linked: 0, unchanged: 0 },
  ownerships: { added: 0, removed: 0 },
  meetups: { created: 0, updated: 0, unchanged: 0 },
  tables: { created: 0, updated: 0, unchanged: 0, removed: 0 },
  participantsAdded: 0,
  unknownMemberRefs: 0,
});

export function stableJson(value: unknown): string {
  return JSON.stringify(value, (_key, v: unknown) =>
    v && typeof v === 'object' && !Array.isArray(v)
      ? Object.fromEntries(Object.entries(v).sort(([a], [b]) => a.localeCompare(b)))
      : v,
  );
}

export function dedupe<T>(items: T[], key: (item: T) => string): T[] {
  return [...new Map(items.map((item) => [key(item), item])).values()];
}

export function chunked<T>(items: T[], size = 1000): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}
