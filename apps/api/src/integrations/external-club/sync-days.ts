import { createHash, randomBytes } from 'node:crypto';
import { and, eq, inArray } from 'drizzle-orm';
import {
  externalRefs,
  gameExternalMetadata,
  games,
  identities,
  meetupParticipants,
  meetups,
  meetupTableIdentities,
  meetupTables,
} from '../../db/schema/index.js';
import { slugify } from '../../modules/games/slug.js';
import { chunked, dedupe, type SyncContext } from './context.js';
import type { ExternalDay, ExternalTable } from './types.js';

type RefKind = 'meetup' | 'meetup_table';
const refKey = (kind: RefKind, externalId: string) => `${kind}|${externalId}`;
const sameSet = (a: Set<string>, b: Set<string>) =>
  a.size === b.size && [...a].every((x) => b.has(x));
const sameTime = (a: Date | null, b: Date | null) =>
  (a?.getTime() ?? null) === (b?.getTime() ?? null);

async function resolveTableGames(ctx: SyncContext, days: ExternalDay[]): Promise<void> {
  const { tx, source } = ctx;
  const tables = days.flatMap((d) => d.tables);
  const missingIds = [
    ...new Set(
      tables.flatMap((t) =>
        t.gameExternalId && !ctx.gameIds.has(t.gameExternalId) ? [t.gameExternalId] : [],
      ),
    ),
  ];
  if (missingIds.length > 0) {
    const rows = await tx
      .select({ externalId: gameExternalMetadata.externalId, gameId: gameExternalMetadata.gameId })
      .from(gameExternalMetadata)
      .where(
        and(
          eq(gameExternalMetadata.source, source),
          inArray(gameExternalMetadata.externalId, missingIds),
        ),
      );
    for (const row of rows) ctx.gameIds.set(row.externalId, row.gameId);
  }
}

async function gameIdsByName(ctx: SyncContext, days: ExternalDay[]): Promise<Map<string, string>> {
  const names = [
    ...new Set(
      days
        .flatMap((d) => d.tables)
        .filter(
          (t) =>
            t.status === 'confirmed' && !(t.gameExternalId && ctx.gameIds.has(t.gameExternalId)),
        )
        .map((t) => slugify(t.gameName))
        .filter(Boolean),
    ),
  ];
  if (names.length === 0) return new Map();
  const rows = await ctx.tx
    .select({ id: games.id, slug: games.slug })
    .from(games)
    .where(inArray(games.slug, names));
  return new Map(rows.map((r) => [r.slug, r.id]));
}

function tableValues(
  ctx: SyncContext,
  t: ExternalTable,
  position: number,
  byName: Map<string, string>,
) {
  const gameId =
    (t.gameExternalId ? ctx.gameIds.get(t.gameExternalId) : undefined) ??
    (t.status === 'confirmed' ? byName.get(slugify(t.gameName)) : undefined) ??
    null;
  const max = t.maxPlayers ?? null;
  return {
    gameId,
    seats: max !== null && max >= 2 && max <= 20 ? max : null,
    note: [gameId ? null : t.gameName, t.note].filter(Boolean).join(' - ') || null,
    position,
  };
}

async function syncGuests(
  ctx: SyncContext,
  days: ExternalDay[],
): Promise<{ seated: Map<string, string>; managed: string[] }> {
  const { tx, club, source, report } = ctx;
  const wanted = dedupe(
    days.flatMap((d) => d.tables.flatMap((t) => t.guests ?? [])),
    (g) => g.externalId,
  );
  const existing = await tx
    .select()
    .from(identities)
    .where(
      and(
        eq(identities.clubId, club.id),
        eq(identities.kind, 'guest'),
        eq(identities.externalSource, source),
      ),
    );
  const byExternalId = new Map(existing.map((r) => [r.externalId!, r]));
  const inviterIds = [
    ...new Set(
      wanted.flatMap((g) => {
        const inviter = ctx.members.get(g.invitedByExternalMemberId);
        return inviter ? [inviter.identityId] : [];
      }),
    ),
  ];
  const inviterNames = new Map<string, string>();
  for (const part of chunked(inviterIds)) {
    const rows = await tx
      .select({ id: identities.id, displayName: identities.displayName })
      .from(identities)
      .where(inArray(identities.id, part));
    for (const row of rows) inviterNames.set(row.id, row.displayName);
  }
  const result = new Map<string, string>();
  for (const guest of wanted) {
    const inviter = ctx.members.get(guest.invitedByExternalMemberId);
    if (!inviter) {
      report.unknownMemberRefs++;
      continue;
    }
    const displayName = `Bạn của ${inviterNames.get(inviter.identityId) ?? ''}`.trim();
    const current = byExternalId.get(guest.externalId);
    if (!current) {
      const [created] = await tx
        .insert(identities)
        .values({
          kind: 'guest',
          clubId: club.id,
          displayName,
          invitedByIdentityId: inviter.identityId,
          externalSource: source,
          externalId: guest.externalId,
        })
        .returning({ id: identities.id });
      result.set(guest.externalId, created!.id);
      report.guests.created++;
    } else {
      result.set(guest.externalId, current.id);
      if (
        !current.claimedAt &&
        (current.displayName !== displayName || current.invitedByIdentityId !== inviter.identityId)
      ) {
        await tx
          .update(identities)
          .set({ displayName, invitedByIdentityId: inviter.identityId })
          .where(eq(identities.id, current.id));
        report.guests.updated++;
      } else {
        report.guests.unchanged++;
      }
    }
  }
  return { seated: result, managed: existing.map((r) => r.id) };
}

export async function syncDays(ctx: SyncContext, input: ExternalDay[]): Promise<void> {
  const { tx, source, club, report } = ctx;
  const days = dedupe(input, (d) => d.date);
  if (days.length === 0) return;
  if (!club.provinceCode) throw new Error('Club has no province; set one before syncing days');

  await resolveTableGames(ctx, days);
  const byName = await gameIdsByName(ctx, days);
  const { seated: guestIdentities, managed: guestIds } = await syncGuests(ctx, days);
  const managedIdentityIds = new Set([
    ...[...ctx.members.values()].map((m) => m.identityId),
    ...guestIds,
    ...guestIdentities.values(),
  ]);

  const refRows = await tx.select().from(externalRefs).where(eq(externalRefs.source, source));
  const refs = new Map(refRows.map((r) => [refKey(r.kind, r.externalId), r.internalId]));
  const tableRefByInternal = new Set(
    refRows.filter((r) => r.kind === 'meetup_table').map((r) => r.internalId),
  );

  const meetupIds = refRows.filter((r) => r.kind === 'meetup').map((r) => r.internalId);
  const meetupRows = meetupIds.length
    ? await tx.select().from(meetups).where(inArray(meetups.id, meetupIds))
    : [];
  const meetupById = new Map(meetupRows.map((m) => [m.id, m]));
  const tableRows = meetupIds.length
    ? await tx.select().from(meetupTables).where(inArray(meetupTables.meetupId, meetupIds))
    : [];
  const playerRows = tableRows.length
    ? await tx
        .select()
        .from(meetupTableIdentities)
        .where(
          inArray(
            meetupTableIdentities.tableId,
            tableRows.map((t) => t.id),
          ),
        )
    : [];
  const playersByTable = new Map<string, Set<string>>();
  for (const row of playerRows) {
    if (!managedIdentityIds.has(row.identityId)) continue;
    const set = playersByTable.get(row.tableId) ?? new Set<string>();
    set.add(row.identityId);
    playersByTable.set(row.tableId, set);
  }

  const saveRef = (kind: RefKind, externalId: string, internalId: string) =>
    tx
      .insert(externalRefs)
      .values({ source, kind, externalId, internalId })
      .onConflictDoUpdate({
        target: [externalRefs.source, externalRefs.kind, externalRefs.externalId],
        set: { internalId },
      });

  for (const day of days) {
    const starts = day.tables.flatMap((t) => (t.startsAt ? [new Date(t.startsAt)] : []));
    const ends = day.tables.flatMap((t) => (t.endsAt ? [new Date(t.endsAt)] : []));
    const desired = {
      title: `${club.name} - ${day.date}`,
      description: day.note ?? null,
      startsAt: starts.length
        ? new Date(Math.min(...starts.map(Number)))
        : new Date(`${day.date}T12:00:00Z`),
      endsAt: ends.length ? new Date(Math.max(...ends.map(Number))) : null,
      addressLine: day.venue ?? club.name,
    };

    let meetup = meetupById.get(refs.get(refKey('meetup', day.date)) ?? '');
    if (!meetup) {
      const slugBase = `${slugify(club.slug)}-${day.date}`;
      const taken = await tx
        .select({ id: meetups.id })
        .from(meetups)
        .where(eq(meetups.slug, slugBase))
        .limit(1);
      [meetup] = await tx
        .insert(meetups)
        .values({
          ...desired,
          slug: taken.length ? `${slugBase}-${randomBytes(3).toString('hex')}` : slugBase,
          provinceCode: club.provinceCode,
          visibility: 'club',
          clubId: club.id,
          inviteCodeHash: createHash('sha256').update(randomBytes(24)).digest('hex'),
          createdBy: ctx.actorUserId,
        })
        .returning();
      await saveRef('meetup', day.date, meetup!.id);
      report.meetups.created++;
    } else if (
      meetup.title !== desired.title ||
      meetup.description !== desired.description ||
      meetup.addressLine !== desired.addressLine ||
      !sameTime(meetup.startsAt, desired.startsAt) ||
      !sameTime(meetup.endsAt, desired.endsAt)
    ) {
      await tx.update(meetups).set(desired).where(eq(meetups.id, meetup.id));
      report.meetups.updated++;
    } else {
      report.meetups.unchanged++;
    }
    const meetupId = meetup!.id;

    const existingTables = new Map(
      tableRows.filter((t) => t.meetupId === meetupId).map((t) => [t.id, t]),
    );
    const keep = new Set<string>();
    const seatedUsers = new Set<string>();

    for (const [position, table] of dedupe(day.tables, (t) => t.externalId).entries()) {
      const values = tableValues(ctx, table, position, byName);
      const playerIds = new Set<string>();
      const userIds: string[] = [];
      for (const player of table.players) {
        const member = ctx.members.get(player.externalMemberId);
        if (!member) {
          report.unknownMemberRefs++;
          continue;
        }
        playerIds.add(member.identityId);
        if (member.userId && !seatedUsers.has(member.userId)) {
          seatedUsers.add(member.userId);
          userIds.push(member.userId);
        }
      }

      for (const guest of table.guests ?? []) {
        const identityId = guestIdentities.get(guest.externalId);
        if (identityId) playerIds.add(identityId);
      }

      let row = existingTables.get(refs.get(refKey('meetup_table', table.externalId)) ?? '');
      let currentPlayers = new Set<string>();
      if (!row) {
        [row] = await tx
          .insert(meetupTables)
          .values({ meetupId, hostUserId: ctx.actorUserId, ...values })
          .returning();
        await saveRef('meetup_table', table.externalId, row!.id);
        report.tables.created++;
      } else {
        currentPlayers = playersByTable.get(row.id) ?? new Set();
        const changed =
          row.gameId !== values.gameId ||
          row.seats !== values.seats ||
          row.note !== values.note ||
          row.position !== values.position ||
          !sameSet(currentPlayers, playerIds);
        if (changed) {
          await tx.update(meetupTables).set(values).where(eq(meetupTables.id, row.id));
          report.tables.updated++;
        } else {
          report.tables.unchanged++;
        }
      }
      const tableId = row!.id;
      keep.add(tableId);

      const toAdd = [...playerIds].filter((id) => !currentPlayers.has(id));
      if (toAdd.length) {
        await tx
          .insert(meetupTableIdentities)
          .values(toAdd.map((identityId) => ({ tableId, identityId })));
      }
      const toRemove = [...currentPlayers].filter((id) => !playerIds.has(id));
      if (toRemove.length) {
        await tx
          .delete(meetupTableIdentities)
          .where(
            and(
              eq(meetupTableIdentities.tableId, tableId),
              inArray(meetupTableIdentities.identityId, toRemove),
            ),
          );
      }
      if (userIds.length) {
        const added = await tx
          .insert(meetupParticipants)
          .values(
            userIds.map((userId) => ({
              meetupId,
              userId,
              status: 'going' as const,
              tableId,
              respondedAt: new Date(),
            })),
          )
          .onConflictDoNothing()
          .returning({ userId: meetupParticipants.userId });
        report.participantsAdded += added.length;
      }
    }

    for (const stale of existingTables.values()) {
      if (keep.has(stale.id) || !tableRefByInternal.has(stale.id)) continue;
      await tx.delete(meetupTables).where(eq(meetupTables.id, stale.id));
      await tx
        .delete(externalRefs)
        .where(and(eq(externalRefs.kind, 'meetup_table'), eq(externalRefs.internalId, stale.id)));
      report.tables.removed++;
    }
  }
}
