import { asc, eq } from 'drizzle-orm';
import { db } from '../../db/client.js';
import { clubMembers, clubs } from '../../db/schema/index.js';
import { emptyReport, type SyncContext, type SyncReport } from './context.js';
import { syncDays } from './sync-days.js';
import { syncGames, syncMembers } from './sync-catalog.js';
import type { ExternalClubSource } from './types.js';

export type { SyncReport } from './context.js';

export interface SyncOptions {
  clubSlug: string;
  from?: string;
  to?: string;
  dryRun?: boolean;
}

class DryRunRollback extends Error {}

export async function syncExternalClub(
  source: ExternalClubSource,
  options: SyncOptions,
): Promise<SyncReport> {
  const { from, to } = options;
  const members = await source.listMembers();
  const games = await source.listGames();
  const rawDays = await source.listDays({ from, to });
  const days = rawDays.filter((d) => (!from || d.date >= from) && (!to || d.date <= to));
  const loginIds = new Map<string, string>();
  for (const player of days.flatMap((d) => d.tables.flatMap((t) => t.players))) {
    if (player.loginId) loginIds.set(player.externalMemberId, player.loginId);
  }

  const report = emptyReport(Boolean(options.dryRun));
  try {
    await db.transaction(async (tx) => {
      const [club] = await tx.select().from(clubs).where(eq(clubs.slug, options.clubSlug)).limit(1);
      if (!club) throw new Error(`Club not found: ${options.clubSlug}`);
      const actorUserId = club.createdBy ?? (await findOwnerId(tx, club.id));
      if (!actorUserId) throw new Error('Club has no owner to attribute imported tables to');

      const ctx: SyncContext = {
        tx,
        source: source.source,
        club,
        actorUserId,
        report,
        members: new Map(),
        gameIds: new Map(),
      };
      await syncMembers(ctx, members, loginIds);
      await syncGames(ctx, games);
      await syncDays(ctx, days);
      if (options.dryRun) throw new DryRunRollback();
    });
  } catch (error) {
    if (!(error instanceof DryRunRollback)) throw error;
  }
  return report;
}

async function findOwnerId(tx: SyncContext['tx'], clubId: string): Promise<string | undefined> {
  const [row] = await tx
    .select({ userId: clubMembers.userId })
    .from(clubMembers)
    .where(eq(clubMembers.clubId, clubId))
    .orderBy(asc(clubMembers.joinedAt))
    .limit(1);
  return row?.userId;
}
