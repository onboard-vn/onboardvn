import { and, desc, eq, or, sql } from 'drizzle-orm';
import { db } from '../../db/client.js';
import {
  clubMembers,
  games,
  identities,
  meetupTables,
  playPlayers,
  plays,
  scoreTemplates,
} from '../../db/schema/index.js';
import { isSeatedUser, type Executor } from '../identities/repo.js';

export type PlayRow = typeof plays.$inferSelect;
export type PlayPlayerRow = typeof playPlayers.$inferSelect;
export type TemplateRow = typeof scoreTemplates.$inferSelect;

export const gameName = sql<string>`coalesce(${games.nameVi}, ${games.nameEn})`;

export interface PlayBundle {
  play: PlayRow;
  game: { id: string; slug: string; name: string };
  template: TemplateRow | null;
  players: PlayPlayerRow[];
}

export async function loadBundle(
  id: string,
  executor: Executor = db,
  lock = false,
): Promise<PlayBundle | undefined> {
  if (lock)
    await executor.select({ id: plays.id }).from(plays).where(eq(plays.id, id)).for('update');
  const [row] = await executor
    .select({
      play: plays,
      gameId: games.id,
      gameSlug: games.slug,
      gameName,
      template: scoreTemplates,
    })
    .from(plays)
    .innerJoin(games, eq(games.id, plays.gameId))
    .leftJoin(scoreTemplates, eq(scoreTemplates.id, plays.scoreTemplateId))
    .where(eq(plays.id, id))
    .limit(1);
  if (!row) return undefined;
  const players = await executor
    .select()
    .from(playPlayers)
    .where(eq(playPlayers.playId, id))
    .orderBy(playPlayers.seat);
  return {
    play: row.play,
    game: { id: row.gameId, slug: row.gameSlug, name: row.gameName },
    template: row.template,
    players,
  };
}

export interface PlayAccess {
  canEdit: boolean;
  canView: boolean;
}

/** Editors: creator, any identity in the play linked to the user, table host / seated user, and
 * club owner/admin. Other club members can only view. */
export async function resolveAccess(
  play: PlayRow,
  players: PlayPlayerRow[],
  userId: string,
  executor: Executor = db,
): Promise<PlayAccess> {
  let canEdit = play.createdBy === userId;
  if (!canEdit && players.length) {
    const [mine] = await executor
      .select({ id: identities.id })
      .from(identities)
      .where(
        and(
          eq(identities.userId, userId),
          or(...players.map((p) => eq(identities.id, p.identityId))),
        ),
      )
      .limit(1);
    canEdit = Boolean(mine);
  }
  if (!canEdit && play.meetupTableId) {
    const [table] = await executor
      .select({ hostUserId: meetupTables.hostUserId })
      .from(meetupTables)
      .where(eq(meetupTables.id, play.meetupTableId))
      .limit(1);
    canEdit =
      table?.hostUserId === userId || (await isSeatedUser(play.meetupTableId, userId, executor));
  }
  let member: { role: 'owner' | 'admin' | 'member' } | undefined;
  if (play.clubId) {
    [member] = await executor
      .select({ role: clubMembers.role })
      .from(clubMembers)
      .where(and(eq(clubMembers.clubId, play.clubId), eq(clubMembers.userId, userId)))
      .limit(1);
  }
  if (member && member.role !== 'member') canEdit = true;
  return { canEdit, canView: canEdit || Boolean(member) };
}

export async function gameExists(id: string): Promise<boolean> {
  const [row] = await db.select({ id: games.id }).from(games).where(eq(games.id, id)).limit(1);
  return Boolean(row);
}

export async function findTemplate(id: string, executor: Executor = db) {
  const [row] = await executor
    .select()
    .from(scoreTemplates)
    .where(eq(scoreTemplates.id, id))
    .limit(1);
  return row;
}

/** Latest approved version, else latest pending; `variant` (default `base`) wins over others. */
export async function pickTemplate(
  gameId: string,
  variant = 'base',
  executor: Executor = db,
): Promise<TemplateRow | undefined> {
  const rows = await executor
    .select()
    .from(scoreTemplates)
    .where(eq(scoreTemplates.gameId, gameId));
  const rank = (r: TemplateRow) => [
    r.variant === variant ? 0 : 1,
    r.status === 'approved' ? 0 : 1,
    -r.version,
  ];
  return rows
    .filter((r) => r.status === 'approved' || r.status === 'pending')
    .sort((a, b) => {
      const [ra, rb] = [rank(a), rank(b)];
      for (let i = 0; i < ra.length; i++) if (ra[i] !== rb[i]) return ra[i]! - rb[i]!;
      return 0;
    })[0];
}

export async function latestPlayIdForTable(tableId: string): Promise<string | null> {
  const [row] = await db
    .select({ id: plays.id })
    .from(plays)
    .where(eq(plays.meetupTableId, tableId))
    .orderBy(desc(plays.createdAt))
    .limit(1);
  return row?.id ?? null;
}
