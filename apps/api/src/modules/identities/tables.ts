import type { ClubMeetupsResponse, TableDetailDto } from '@onboard/shared';
import { and, asc, desc, eq, gte, inArray, lte, sql } from 'drizzle-orm';
import { db } from '../../db/client.js';
import { games, meetups, meetupTables } from '../../db/schema/index.js';
import { ApiError } from '../../lib/errors.js';
import * as eventRepo from '../events/repo.js';
import { canViewMeetup } from '../events/service.js';
import { identityDtosByIds } from './service.js';
import * as repo from './repo.js';

const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_MEETUPS = 100;

async function buildTableDtos(tableIds: string[], viewerId: string): Promise<TableDetailDto[]> {
  if (tableIds.length === 0) return [];
  const rows = await db
    .select({
      id: meetupTables.id,
      meetupId: meetupTables.meetupId,
      meetupTitle: meetups.title,
      startsAt: meetups.startsAt,
      clubId: meetups.clubId,
      hostUserId: meetupTables.hostUserId,
      seats: meetupTables.seats,
      note: meetupTables.note,
      position: meetupTables.position,
      gameId: games.id,
      gameSlug: games.slug,
      gameName: sql<string>`coalesce(${games.nameVi}, ${games.nameEn})`,
    })
    .from(meetupTables)
    .innerJoin(meetups, eq(meetups.id, meetupTables.meetupId))
    .leftJoin(games, eq(games.id, meetupTables.gameId))
    .where(inArray(meetupTables.id, tableIds))
    .orderBy(asc(meetups.startsAt), asc(meetupTables.position));
  const seated = await repo.seatedIdentityIdsByTable(tableIds);
  const hostIds = await repo.ensureMemberIdentities(rows.map((r) => r.hostUserId));
  const dtos = await identityDtosByIds([...seated.values(), ...hostIds.values()].flat(), viewerId);
  return rows.map((r) => ({
    id: r.id,
    meetupId: r.meetupId,
    meetupTitle: r.meetupTitle,
    startsAt: r.startsAt.toISOString(),
    clubId: r.clubId,
    game: r.gameId ? { id: r.gameId, slug: r.gameSlug!, name: r.gameName! } : null,
    seats: r.seats,
    note: r.note,
    position: r.position,
    host: dtos.get(hostIds.get(r.hostUserId)!) ?? null,
    seated: seated.get(r.id)!.flatMap((id) => dtos.get(id) ?? []),
  }));
}

export async function getTableService(tableId: string, viewerId: string): Promise<TableDetailDto> {
  const table = await repo.findTableContext(tableId);
  const meetup = table ? await eventRepo.findMeetupById(table.meetupId) : undefined;
  if (!table || !meetup || !(await canViewMeetup(meetup, viewerId))) {
    throw new ApiError('NOT_FOUND', 404, 'Không tìm thấy bàn');
  }
  return (await buildTableDtos([tableId], viewerId))[0]!;
}

export async function listClubMeetupsService(
  clubId: string,
  viewerId: string,
  range: { from?: string; to?: string },
): Promise<ClubMeetupsResponse> {
  const from = range.from ? new Date(range.from) : new Date(Date.now() - 30 * DAY_MS);
  const to = range.to ? new Date(range.to) : new Date(Date.now() + 60 * DAY_MS);
  const rows = await db
    .select()
    .from(meetups)
    .where(
      and(
        eq(meetups.clubId, clubId),
        eq(meetups.status, 'scheduled'),
        gte(meetups.startsAt, from),
        lte(meetups.startsAt, to),
      ),
    )
    .orderBy(desc(meetups.startsAt))
    .limit(MAX_MEETUPS);
  const tables = rows.length
    ? await db
        .select({ id: meetupTables.id, meetupId: meetupTables.meetupId })
        .from(meetupTables)
        .where(
          inArray(
            meetupTables.meetupId,
            rows.map((m) => m.id),
          ),
        )
    : [];
  const dtos = await buildTableDtos(
    tables.map((t) => t.id),
    viewerId,
  );
  return {
    items: rows.map((m) => ({
      id: m.id,
      slug: m.slug,
      title: m.title,
      startsAt: m.startsAt.toISOString(),
      endsAt: m.endsAt ? m.endsAt.toISOString() : null,
      status: m.status,
      tables: dtos.filter((t) => t.meetupId === m.id).sort((a, b) => a.position - b.position),
    })),
  };
}
