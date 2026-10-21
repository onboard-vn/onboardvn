import type { ClubPlaysResponse } from '@onboard/shared';
import { and, desc, eq, inArray, lt, or } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../../db/client.js';
import { games, meetupTables, meetups, playPlayers, plays } from '../../db/schema/index.js';
import { ApiError } from '../../lib/errors.js';
import { visibleMeetupsWhere } from '../events/repo.js';
import { identityDtosByIds } from '../identities/service.js';
import * as repo from './repo.js';

const invalid = (message: string): never => {
  throw new ApiError('BAD_REQUEST', 400, message);
};

function decodeCursor(cursor: string): { at: Date; id: string } {
  if (!/^[A-Za-z0-9_-]+$/.test(cursor)) return invalid('Cursor không hợp lệ');
  const decoded = Buffer.from(cursor, 'base64url').toString('utf8');
  const separator = decoded.indexOf('|');
  const timestamp = separator >= 0 ? decoded.slice(0, separator) : '';
  const at = new Date(timestamp);
  const id = separator >= 0 ? decoded.slice(separator + 1) : '';
  if (
    Number.isNaN(at.getTime()) ||
    at.toISOString() !== timestamp ||
    !z.uuid().safeParse(id).success ||
    Buffer.from(decoded).toString('base64url') !== cursor
  )
    return invalid('Cursor không hợp lệ');
  return { at, id };
}

export async function listClubPlaysService(
  clubId: string,
  userId: string,
  cursor: string | undefined,
  limit: number,
): Promise<ClubPlaysResponse> {
  const clauses = [
    eq(plays.clubId, clubId),
    eq(plays.status, 'final'),
    eq(meetups.clubId, clubId),
    visibleMeetupsWhere(userId),
  ];
  if (cursor) {
    const { at, id } = decodeCursor(cursor);
    clauses.push(or(lt(plays.startedAt, at), and(eq(plays.startedAt, at), lt(plays.id, id)))!);
  }

  const rows = await db
    .select({ play: plays, gameId: games.id, gameSlug: games.slug, gameName: repo.gameName })
    .from(plays)
    .innerJoin(meetupTables, eq(meetupTables.id, plays.meetupTableId))
    .innerJoin(meetups, eq(meetups.id, meetupTables.meetupId))
    .innerJoin(games, eq(games.id, plays.gameId))
    .where(and(...clauses))
    .orderBy(desc(plays.startedAt), desc(plays.id))
    .limit(limit + 1);
  const page = rows.slice(0, limit);
  const ids = page.map((row) => row.play.id);
  const players = ids.length
    ? await db
        .select({
          playId: playPlayers.playId,
          identityId: playPlayers.identityId,
          seat: playPlayers.seat,
          computed: playPlayers.computed,
        })
        .from(playPlayers)
        .where(inArray(playPlayers.playId, ids))
        .orderBy(playPlayers.seat)
    : [];
  const winnerIds = players.filter((player) => player.computed?.isWinner).map((player) => player.identityId);
  const winnerDtos = winnerIds.length ? await identityDtosByIds(winnerIds, userId) : new Map();
  const last = page.at(-1);

  return {
    items: page.map((row) => {
      const all = players.filter((player) => player.playId === row.play.id);
      return {
        id: row.play.id,
        game: { id: row.gameId, slug: row.gameSlug, name: row.gameName },
        clubId: row.play.clubId,
        status: 'final',
        startedAt: row.play.startedAt.toISOString(),
        playerCount: all.length,
        winners: all.flatMap((player) => {
          const winner = player.computed?.isWinner ? winnerDtos.get(player.identityId) : undefined;
          return winner
            ? [
                {
                  identityId: winner.id,
                  displayName: winner.displayName,
                  isGuest: winner.kind === 'guest',
                },
              ]
            : [];
        }),
      };
    }),
    nextCursor:
      rows.length > limit && last
        ? Buffer.from(`${last.play.startedAt.toISOString()}|${last.play.id}`).toString('base64url')
        : null,
  };
}
