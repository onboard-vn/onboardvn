import { and, eq, or, sql } from 'drizzle-orm';
import { db } from '../../db/client.js';
import {
  clubMembers,
  games,
  identities,
  meetups,
  meetupTables,
  playPlayers,
  plays,
  scoreTemplates,
} from '../../db/schema/index.js';
import { isClubMember } from '../clubs/repo.js';
import { canViewMeetup } from '../events/service.js';
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

export async function lockTable(tableId: string, executor: Executor): Promise<boolean> {
  const [row] = await executor
    .select({ id: meetupTables.id })
    .from(meetupTables)
    .where(eq(meetupTables.id, tableId))
    .for('update');
  return Boolean(row);
}

export async function loadCurrentTablePlay(
  tableId: string,
  executor: Executor = db,
): Promise<PlayBundle | undefined> {
  const [row] = await executor
    .select({ id: plays.id })
    .from(plays)
    .where(eq(plays.meetupTableId, tableId))
    .orderBy(
      sql`case when ${plays.status} = 'draft' then 0 else 1 end`,
      sql`${plays.startedAt} desc`,
      sql`${plays.createdAt} desc`,
      sql`${plays.id} desc`,
    )
    .limit(1);
  return row ? loadBundle(row.id, executor) : undefined;
}

export async function loadCurrentTableDraft(
  tableId: string,
  executor: Executor,
): Promise<PlayBundle | undefined> {
  const [row] = await executor
    .select({ id: plays.id })
    .from(plays)
    .where(and(eq(plays.meetupTableId, tableId), eq(plays.status, 'draft')))
    .orderBy(sql`${plays.startedAt} desc`, sql`${plays.createdAt} desc`, sql`${plays.id} desc`)
    .limit(1);
  return row ? loadBundle(row.id, executor) : undefined;
}

export async function isTableHost(
  tableId: string,
  userId: string,
  executor: Executor = db,
): Promise<boolean> {
  const [row] = await executor
    .select({ id: meetupTables.id })
    .from(meetupTables)
    .where(and(eq(meetupTables.id, tableId), eq(meetupTables.hostUserId, userId)))
    .limit(1);
  return Boolean(row);
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
  if (play.meetupTableId) {
    const [meetup] = await executor
      .select({
        id: meetups.id,
        createdBy: meetups.createdBy,
        visibility: meetups.visibility,
        inviteCodeHash: meetups.inviteCodeHash,
        clubId: meetups.clubId,
      })
      .from(meetupTables)
      .innerJoin(meetups, eq(meetups.id, meetupTables.meetupId))
      .where(eq(meetupTables.id, play.meetupTableId))
      .limit(1);
    const [host] = await executor
      .select({ id: meetupTables.id })
      .from(meetupTables)
      .where(and(eq(meetupTables.id, play.meetupTableId), eq(meetupTables.hostUserId, userId)))
      .limit(1);
    const own = players.length
      ? await executor
          .select({ id: identities.id })
          .from(identities)
          .where(
            and(
              eq(identities.userId, userId),
              or(...players.map((p) => eq(identities.id, p.identityId))),
            ),
          )
          .limit(1)
      : [];
    const seated = await isSeatedUser(play.meetupTableId, userId, executor);
    const canManage = Boolean(host);
    const canEdit = canManage || own.length > 0;
    if (meetup?.clubId) {
      const [isCurrentMember, canViewMeetupAccess] = await Promise.all([
        isClubMember(meetup.clubId, userId),
        canViewMeetup(meetup, userId),
      ]);
      return { canEdit, canView: isCurrentMember && canViewMeetupAccess };
    }
    return { canEdit, canView: canEdit || seated };
  }

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
  const canonical = await executor.execute<{ id: string }>(
    sql`select resolve_canonical_game_id(${gameId}::uuid) as id`,
  );
  const rows = await executor
    .select()
    .from(scoreTemplates)
    .where(eq(scoreTemplates.gameId, canonical.rows[0]!.id));
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

/** Latest available shared Critter Kitchen input template, while preserving pinned legacy templates. */
export async function pickCritterKitchenMealTemplate(
  gameId: string,
  executor: Executor = db,
): Promise<TemplateRow | undefined> {
  const canonical = await executor.execute<{ id: string }>(
    sql`select resolve_canonical_game_id(${gameId}::uuid) as id`,
  );
  const rows = await executor
    .select()
    .from(scoreTemplates)
    .where(eq(scoreTemplates.gameId, canonical.rows[0]!.id));
  return rows
    .filter((row) => {
      if (!['approved', 'pending'].includes(row.status)) return false;
      const definition = row.definition as { categories?: { key?: unknown }[] } | null;
      return (
        Array.isArray(definition?.categories) &&
        definition.categories.some((category) => category?.key === 'meal')
      );
    })
    .sort((a, b) => {
      const approved = Number(a.status !== 'approved') - Number(b.status !== 'approved');
      return approved || b.version - a.version;
    })[0];
}
