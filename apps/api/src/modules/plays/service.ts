import {
  MAX_PLAY_PLAYERS,
  scoreTemplateSchema,
  type MyPlaysResponse,
  type PlayCreateInput,
  type PlayDto,
  type PlayPatchInput,
  type PlayPollResponse,
  type PlayPresenceInput,
  type PlayStreamEvent,
  type PlayValueOp,
  type PlayValuesResponse,
  type ScoreTemplate,
  type ScoreTemplateDto,
} from '@onboard/shared';
import { and, desc, eq, exists, inArray, lt, or, sql } from 'drizzle-orm';
import { db } from '../../db/client.js';
import {
  clubMembers,
  games,
  identities,
  meetupTables,
  playEvents,
  playPlayers,
  plays,
  type PlayComputed,
} from '../../db/schema/index.js';
import { ApiError } from '../../lib/errors.js';
import * as eventRepo from '../events/repo.js';
import { canViewMeetup } from '../events/service.js';
import { identityDtosByIds } from '../identities/service.js';
import * as identityRepo from '../identities/repo.js';
import { computePlay, type ComputePlayer } from './compute.js';
import * as hub from './hub.js';
import * as repo from './repo.js';
import type { PlayBundle, PlayPlayerRow, TemplateRow } from './repo.js';

type Tx = identityRepo.Tx;

const notFound = (message = 'Không tìm thấy ván chơi'): never => {
  throw new ApiError('NOT_FOUND', 404, message);
};
const forbidden = (message = 'Bạn không có quyền thực hiện thao tác này'): never => {
  throw new ApiError('FORBIDDEN', 403, message);
};
const conflict = (message: string): never => {
  throw new ApiError('CONFLICT', 409, message);
};
const invalid = (message: string): never => {
  throw new ApiError('VALIDATION_FAILED', 422, message);
};

function parseTemplate(row: TemplateRow | null): ScoreTemplate | null {
  if (!row) return null;
  const parsed = scoreTemplateSchema.safeParse(row.definition);
  if (!parsed.success) throw new ApiError('INTERNAL', 500, 'Template điểm không hợp lệ');
  return parsed.data;
}

const toComputePlayers = (players: PlayPlayerRow[]): ComputePlayer[] =>
  players.map((p) => ({
    identityId: p.identityId,
    team: p.team,
    role: p.role,
    values: p.values,
    rounds: p.rounds,
    isWinnerOverride: p.isWinnerOverride,
  }));

/** Recomputes server-side and persists per-player results; throws 422 on invalid input. */
async function recompute(tx: Tx, bundle: PlayBundle): Promise<void> {
  const result = computePlay(
    parseTemplate(bundle.template),
    toComputePlayers(bundle.players),
    bundle.play.outcome,
  );
  if (!result.ok) return invalid(result.message);
  for (const p of bundle.players) {
    const computed = result.value.byIdentity.get(p.identityId) ?? null;
    p.computed = computed;
    await tx
      .update(playPlayers)
      .set({ computed })
      .where(and(eq(playPlayers.playId, p.playId), eq(playPlayers.identityId, p.identityId)));
  }
}

async function toPlayDto(bundle: PlayBundle, viewerId: string, canEdit: boolean): Promise<PlayDto> {
  const { play, game, template, players } = bundle;
  const [dtos, outcome] = await Promise.all([
    identityDtosByIds(
      players.map((p) => p.identityId),
      viewerId,
    ),
    Promise.resolve(computePlay(parseTemplate(template), toComputePlayers(players), play.outcome)),
  ]);
  return {
    id: play.id,
    clubId: play.clubId,
    meetupTableId: play.meetupTableId,
    game,
    template: template
      ? {
          id: template.id,
          version: template.version,
          variant: template.variant,
          needsReview: template.needsReview || template.status !== 'approved',
        }
      : null,
    status: play.status,
    outcome: play.outcome,
    rev: play.rev,
    editedAfterFinal: play.editedAfterFinal,
    startedAt: play.startedAt.toISOString(),
    endedAt: play.endedAt ? play.endedAt.toISOString() : null,
    createdBy: play.createdBy,
    players: players.map((p) => ({
      identity: dtos.get(p.identityId)!,
      seat: p.seat,
      team: p.team,
      role: p.role,
      values: p.values,
      rounds: p.rounds,
      isWinnerOverride: p.isWinnerOverride,
      computed: p.computed,
    })),
    tieUnresolved: outcome.ok ? outcome.value.tieUnresolved : false,
    warnings: outcome.ok ? outcome.value.warnings : [],
    canEdit,
  };
}

function emit(bundle: PlayBundle, ops: PlayValueOp[]): void {
  const event: PlayStreamEvent = {
    rev: bundle.play.rev,
    ops,
    computed: Object.fromEntries(bundle.players.map((p) => [p.identityId, p.computed])),
    presence: hub.getPresence(bundle.play.id),
  };
  hub.publish(bundle.play.id, event);
}

async function bump(tx: Tx, bundle: PlayBundle, set: Partial<typeof plays.$inferInsert> = {}) {
  const [row] = await tx
    .update(plays)
    .set({
      ...set,
      rev: sql`${plays.rev} + 1`,
      ...(bundle.play.status === 'final' ? { editedAfterFinal: true } : {}),
    })
    .where(eq(plays.id, bundle.play.id))
    .returning();
  bundle.play = row!;
  return row!.rev;
}

type EventInput = Omit<typeof playEvents.$inferInsert, 'playId' | 'rev' | 'actorUserId'>;
const logEvents = (tx: Tx, bundle: PlayBundle, actorUserId: string, events: EventInput[]) =>
  events.length
    ? tx
        .insert(playEvents)
        .values(
          events.map((e) => ({ ...e, playId: bundle.play.id, rev: bundle.play.rev, actorUserId })),
        )
    : Promise.resolve();

// ---------------------------------------------------------------------------
// Players the actor may put on a sheet
// ---------------------------------------------------------------------------

async function assertUsableIdentities(
  actorId: string,
  ids: string[],
  ctx: { clubId: string | null; tableId: string | null },
): Promise<void> {
  if (ids.length === 0) return;
  const [rows, actor, seatMap] = await Promise.all([
    identityRepo.findIdentityViews(ids),
    identityRepo.getOrCreateMemberIdentity(actorId),
    ctx.tableId ? identityRepo.seatedIdentityIdsByTable([ctx.tableId]) : Promise.resolve(new Map()),
  ]);
  const seated = new Set<string>(ctx.tableId ? (seatMap.get(ctx.tableId) ?? []) : []);
  const userIds = rows.flatMap((r) => (r.userId && r.kind === 'member' ? [r.userId] : []));
  const relations = await eventRepo.batchRelations(actorId, userIds);
  const clubUsers = new Set<string>(
    ctx.clubId && userIds.length
      ? (
          await db
            .select({ userId: clubMembers.userId })
            .from(clubMembers)
            .where(and(eq(clubMembers.clubId, ctx.clubId), inArray(clubMembers.userId, userIds)))
        ).map((r) => r.userId)
      : [],
  );
  const found = new Map(rows.map((r) => [r.id, r]));
  for (const id of ids) {
    const row = found.get(id);
    const memberUser = row?.kind === 'member' ? row.userId : null;
    const relation = memberUser ? relations.get(memberUser) : undefined;
    const ok =
      row &&
      !row.claimedAt &&
      !relation?.blocked &&
      (row.id === actor.id ||
        seated.has(row.id) ||
        (row.kind === 'guest' && row.invitedByIdentityId === actor.id) ||
        (ctx.clubId !== null &&
          (row.clubId === ctx.clubId || (memberUser !== null && clubUsers.has(memberUser)))) ||
        Boolean(relation?.isFriend));
    if (!ok) invalid('Người chơi không hợp lệ');
  }
}

// ---------------------------------------------------------------------------
// Create / read
// ---------------------------------------------------------------------------

async function resolveTemplate(
  gameId: string,
  requested: string | null | undefined,
): Promise<TemplateRow | null> {
  if (requested === null) return null;
  if (requested === undefined) return (await repo.pickTemplate(gameId)) ?? null;
  const row = await repo.findTemplate(requested);
  if (!row || row.gameId !== gameId || !['approved', 'pending'].includes(row.status)) {
    return invalid('Template điểm không hợp lệ');
  }
  return row;
}

export async function createPlayService(userId: string, input: PlayCreateInput): Promise<PlayDto> {
  const existing = await repo.loadBundle(input.id);
  if (existing) {
    if (existing.play.createdBy !== userId) return conflict('Mã ván chơi đã tồn tại');
    const access = await repo.resolveAccess(existing.play, existing.players, userId);
    return toPlayDto(existing, userId, access.canEdit);
  }

  let clubId = input.clubId ?? null;
  let tableGame: string | null = null;
  if (input.meetupTableId) {
    const table = await identityRepo.findTableContext(input.meetupTableId);
    const meetup = table ? await eventRepo.findMeetupById(table.meetupId) : undefined;
    if (!table || !meetup || !(await canViewMeetup(meetup, userId)))
      return notFound('Không tìm thấy bàn');
    if (input.clubId !== undefined && input.clubId !== table.clubId) {
      return invalid('Club không khớp với Kèo');
    }
    clubId = table.clubId;
    tableGame = await tableGameId(input.meetupTableId);
  }
  if (clubId && !(await isMember(clubId, userId)))
    return forbidden('Bạn không phải thành viên của club này');

  const gameId = input.gameId ?? tableGame;
  if (!gameId) return invalid('Cần chọn game');
  if (!(await repo.gameExists(gameId))) return invalid('Game không tồn tại');
  const template = await resolveTemplate(gameId, input.scoreTemplateId);

  let identityIds = input.playerIdentityIds;
  if (!identityIds && input.meetupTableId) {
    identityIds = (await identityRepo.seatedIdentityIdsByTable([input.meetupTableId])).get(
      input.meetupTableId,
    );
  }
  identityIds = [...new Set(identityIds ?? [])];
  if (identityIds.length === 0)
    identityIds = [(await identityRepo.getOrCreateMemberIdentity(userId)).id];
  if (identityIds.length > MAX_PLAY_PLAYERS) return invalid('Tối đa 20 người chơi');
  await assertUsableIdentities(userId, identityIds, {
    clubId,
    tableId: input.meetupTableId ?? null,
  });

  const created = await db.transaction(async (tx) => {
    const [row] = await tx
      .insert(plays)
      .values({
        id: input.id,
        clubId,
        meetupTableId: input.meetupTableId ?? null,
        gameId,
        scoreTemplateId: template?.id ?? null,
        templateVersion: template?.version ?? null,
        startedAt: input.startedAt ? new Date(input.startedAt) : new Date(),
        createdBy: userId,
        rev: 1,
      })
      .onConflictDoNothing()
      .returning({ id: plays.id });
    if (!row) return false;
    await tx
      .insert(playPlayers)
      .values(identityIds.map((identityId, i) => ({ playId: input.id, identityId, seat: i + 1 })));
    await tx
      .insert(playEvents)
      .values({ playId: input.id, rev: 1, actorUserId: userId, action: 'create' });
    return true;
  });
  const bundle = (await repo.loadBundle(input.id))!;
  if (!created && bundle.play.createdBy !== userId) return conflict('Mã ván chơi đã tồn tại');
  if (created) await db.transaction((tx) => recompute(tx, bundle));
  return toPlayDto(bundle, userId, true);
}

async function tableGameId(tableId: string): Promise<string | null> {
  const [row] = await db
    .select({ gameId: meetupTables.gameId })
    .from(meetupTables)
    .where(eq(meetupTables.id, tableId))
    .limit(1);
  return row?.gameId ?? null;
}

const isMember = async (clubId: string, userId: string) =>
  Boolean(
    (
      await db
        .select({ u: clubMembers.userId })
        .from(clubMembers)
        .where(and(eq(clubMembers.clubId, clubId), eq(clubMembers.userId, userId)))
        .limit(1)
    )[0],
  );

async function requireView(playId: string, userId: string, executor: Tx | typeof db = db) {
  const bundle = await repo.loadBundle(playId, executor);
  if (!bundle) return notFound();
  const access = await repo.resolveAccess(bundle.play, bundle.players, userId, executor);
  if (!access.canView) return notFound();
  return { bundle, access };
}

export async function getPlayService(playId: string, userId: string): Promise<PlayDto> {
  const { bundle, access } = await requireView(playId, userId);
  return toPlayDto(bundle, userId, access.canEdit);
}

export async function getTablePlayService(tableId: string, userId: string): Promise<PlayDto> {
  const playId = await repo.latestPlayIdForTable(tableId);
  if (!playId) return notFound('Bàn chưa có ván chơi');
  return getPlayService(playId, userId);
}

export async function pollPlayService(
  playId: string,
  userId: string,
  sinceRev: number,
): Promise<PlayPollResponse> {
  const { bundle, access } = await requireView(playId, userId);
  const presence = hub.getPresence(playId);
  if (sinceRev >= bundle.play.rev) return { rev: bundle.play.rev, presence };
  return { rev: bundle.play.rev, play: await toPlayDto(bundle, userId, access.canEdit), presence };
}

export async function openStreamService(playId: string, userId: string) {
  const { bundle } = await requireView(playId, userId);
  const initial: PlayStreamEvent = {
    rev: bundle.play.rev,
    ops: [],
    computed: Object.fromEntries(bundle.players.map((p) => [p.identityId, p.computed])),
    presence: hub.getPresence(playId),
  };
  return { initial, subscribe: (fn: (e: PlayStreamEvent) => void) => hub.subscribe(playId, fn) };
}

export async function presenceService(
  playId: string,
  userId: string,
  input: PlayPresenceInput,
): Promise<{ presence: ReturnType<typeof hub.getPresence> }> {
  const { bundle, access } = await requireView(playId, userId);
  if (!access.canEdit) return forbidden();
  if (!bundle.players.some((p) => p.identityId === input.identityId)) {
    return invalid('Người chơi không có trong ván');
  }
  const presence = hub.setPresence(playId, {
    userId,
    identityId: input.identityId,
    categoryKey: input.categoryKey ?? null,
  });
  emit(bundle, []);
  return { presence };
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

async function mutate<T>(
  playId: string,
  userId: string,
  fn: (tx: Tx, bundle: PlayBundle) => Promise<T>,
): Promise<{ bundle: PlayBundle; result: T }> {
  return db.transaction(async (tx) => {
    const bundle = await repo.loadBundle(playId, tx, true);
    if (!bundle) return notFound();
    const access = await repo.resolveAccess(bundle.play, bundle.players, userId, tx);
    if (!access.canView) return notFound();
    if (!access.canEdit) return forbidden();
    const result = await fn(tx, bundle);
    return { bundle, result };
  });
}

function validateOp(
  op: PlayValueOp,
  template: ScoreTemplate | null,
  identityIds: Set<string>,
): void {
  if (!identityIds.has(op.identityId)) invalid('Người chơi không có trong ván');
  if (!template) {
    if (op.categoryKey !== 'total' || op.roundIndex !== undefined) invalid('Hạng mục không hợp lệ');
    if (op.value !== null && typeof op.value !== 'number') invalid('Giá trị không hợp lệ');
    return;
  }
  const category = template.categories.find((c) => c.key === op.categoryKey);
  if (!category) return invalid('Hạng mục không hợp lệ');
  if (op.roundIndex !== undefined) {
    if (category.input !== 'perRound') invalid('Hạng mục không có vòng');
    if (op.value !== null && typeof op.value !== 'number') invalid('Giá trị không hợp lệ');
  }
}

export async function patchValuesService(
  playId: string,
  userId: string,
  ops: PlayValueOp[],
): Promise<PlayValuesResponse> {
  const { bundle } = await mutate(playId, userId, async (tx, b) => {
    const known = new Set(
      (
        await tx
          .select({ id: playEvents.clientOpId })
          .from(playEvents)
          .where(
            and(
              eq(playEvents.playId, playId),
              inArray(
                playEvents.clientOpId,
                ops.map((o) => o.opId),
              ),
            ),
          )
      ).map((r) => r.id),
    );
    const fresh = ops.filter((o) => !known.has(o.opId));
    if (fresh.length === 0) return [];

    const template = parseTemplate(b.template);
    const ids = new Set(b.players.map((p) => p.identityId));
    const byIdentity = new Map(b.players.map((p) => [p.identityId, p]));
    const events: EventInput[] = [];
    const seen = new Set<string>();
    const applied: PlayValueOp[] = [];
    for (const op of fresh) {
      if (seen.has(op.opId)) continue;
      seen.add(op.opId);
      validateOp(op, template, ids);
      const player = byIdentity.get(op.identityId)!;
      let oldValue: unknown;
      if (op.roundIndex !== undefined) {
        const rounds = { ...(player.rounds ?? {}) };
        const list = [...(rounds[op.categoryKey] ?? [])];
        oldValue = list[op.roundIndex] ?? null;
        if (op.value === null) {
          if (op.roundIndex === list.length - 1) list.pop();
          else if (op.roundIndex < list.length) list[op.roundIndex] = 0;
        } else {
          while (list.length < op.roundIndex) list.push(0);
          list[op.roundIndex] = op.value as number;
        }
        if (list.length) rounds[op.categoryKey] = list;
        else delete rounds[op.categoryKey];
        player.rounds = Object.keys(rounds).length ? rounds : null;
      } else {
        const values = { ...player.values };
        oldValue = values[op.categoryKey] ?? null;
        if (op.value === null) delete values[op.categoryKey];
        else values[op.categoryKey] = op.value;
        player.values = values;
      }
      applied.push(op);
      events.push({
        identityId: op.identityId,
        action: 'set_value',
        categoryKey: op.categoryKey,
        roundIndex: op.roundIndex ?? null,
        oldValue: oldValue,
        newValue: op.value,
        clientOpId: op.opId,
      });
    }
    await recompute(tx, b);
    for (const p of b.players) {
      await tx
        .update(playPlayers)
        .set({ values: p.values, rounds: p.rounds })
        .where(and(eq(playPlayers.playId, playId), eq(playPlayers.identityId, p.identityId)));
    }
    await bump(tx, b);
    await logEvents(tx, b, userId, events);
    return applied;
  }).then(async (r) => {
    if (r.result.length) emit(r.bundle, r.result);
    return r;
  });
  const access = await repo.resolveAccess(bundle.play, bundle.players, userId);
  return {
    rev: bundle.play.rev,
    applied: ops.map((o) => o.opId),
    play: await toPlayDto(bundle, userId, access.canEdit),
  };
}

export async function patchPlayService(
  playId: string,
  userId: string,
  input: PlayPatchInput,
): Promise<PlayDto> {
  const { bundle } = await mutate(playId, userId, async (tx, b) => {
    const events: EventInput[] = [];
    const set: Partial<typeof plays.$inferInsert> = {};

    if (input.scoreTemplateId !== undefined) {
      const template = await resolveTemplate(b.play.gameId, input.scoreTemplateId);
      set.scoreTemplateId = template?.id ?? null;
      set.templateVersion = template?.version ?? null;
      b.template = template;
      events.push({
        action: 'set_template',
        oldValue: b.play.scoreTemplateId,
        newValue: template?.id ?? null,
      });
    }
    if (input.outcome !== undefined) {
      set.outcome = input.outcome;
      events.push({ action: 'set_outcome', oldValue: b.play.outcome, newValue: input.outcome });
    }
    if (input.startedAt !== undefined) set.startedAt = new Date(input.startedAt);
    if (input.endedAt !== undefined) set.endedAt = input.endedAt ? new Date(input.endedAt) : null;
    if (input.startedAt !== undefined || input.endedAt !== undefined) {
      events.push({
        action: 'set_time',
        newValue: { startedAt: input.startedAt, endedAt: input.endedAt },
      });
    }

    const remove = new Set(input.removePlayers ?? []);
    const current = new Set(b.players.map((p) => p.identityId));
    for (const id of remove) if (!current.has(id)) invalid('Người chơi không có trong ván');
    const add = [...new Set(input.addPlayers ?? [])].filter((id) => !current.has(id));
    if (b.players.length - remove.size + add.length > MAX_PLAY_PLAYERS)
      invalid('Tối đa 20 người chơi');
    if (b.play.status === 'final' && b.players.length - remove.size + add.length === 0) {
      invalid('Ván đã kết thúc cần ít nhất một người chơi');
    }
    await assertUsableIdentities(userId, add, {
      clubId: b.play.clubId,
      tableId: b.play.meetupTableId,
    });

    if (remove.size) {
      await tx
        .delete(playPlayers)
        .where(and(eq(playPlayers.playId, playId), inArray(playPlayers.identityId, [...remove])));
      b.players = b.players.filter((p) => !remove.has(p.identityId));
      events.push(...[...remove].map((id) => ({ identityId: id, action: 'remove_player' })));
    }
    if (add.length) {
      const base = Math.max(0, ...b.players.map((p) => p.seat));
      const inserted = await tx
        .insert(playPlayers)
        .values(add.map((identityId, i) => ({ playId, identityId, seat: base + i + 1 })))
        .returning();
      b.players = [...b.players, ...inserted];
      events.push(...add.map((id) => ({ identityId: id, action: 'add_player' })));
    }
    for (const meta of input.players ?? []) {
      const player = b.players.find((p) => p.identityId === meta.identityId);
      if (!player) return invalid('Người chơi không có trong ván');
      if (meta.team !== undefined) player.team = meta.team;
      if (meta.role !== undefined) player.role = meta.role;
      if (meta.isWinnerOverride !== undefined) player.isWinnerOverride = meta.isWinnerOverride;
      await tx
        .update(playPlayers)
        .set({ team: player.team, role: player.role, isWinnerOverride: player.isWinnerOverride })
        .where(and(eq(playPlayers.playId, playId), eq(playPlayers.identityId, meta.identityId)));
      events.push({ identityId: meta.identityId, action: 'set_player', newValue: meta });
    }
    if (events.length === 0) return;

    b.play = { ...b.play, ...set } as typeof b.play;
    await recompute(tx, b);
    await bump(tx, b, set);
    await logEvents(tx, b, userId, events);
  });
  emit(bundle, []);
  const access = await repo.resolveAccess(bundle.play, bundle.players, userId);
  return toPlayDto(bundle, userId, access.canEdit);
}

export async function finalizePlayService(playId: string, userId: string): Promise<PlayDto> {
  const { bundle, result } = await mutate(playId, userId, async (tx, b) => {
    if (b.play.status === 'final') return false;
    if (b.players.length === 0) invalid('Cần ít nhất một người chơi');
    await recompute(tx, b);
    await bump(tx, b, { status: 'final', endedAt: b.play.endedAt ?? new Date() });
    await logEvents(tx, b, userId, [{ action: 'finalize' }]);
    return true;
  });
  if (result) emit(bundle, []);
  const access = await repo.resolveAccess(bundle.play, bundle.players, userId);
  return toPlayDto(bundle, userId, access.canEdit);
}

// ---------------------------------------------------------------------------
// History / templates
// ---------------------------------------------------------------------------

export async function listMyPlaysService(
  userId: string,
  cursor: string | undefined,
  limit: number,
): Promise<MyPlaysResponse> {
  const mine = db
    .select({ id: identities.id })
    .from(identities)
    .where(eq(identities.userId, userId));
  const involved = or(
    eq(plays.createdBy, userId),
    exists(
      db
        .select({ x: sql`1` })
        .from(playPlayers)
        .where(and(eq(playPlayers.playId, plays.id), inArray(playPlayers.identityId, mine))),
    ),
  );
  const clauses = [involved];
  if (cursor) {
    const [iso, id] = Buffer.from(cursor, 'base64url').toString().split('|');
    const at = new Date(iso ?? '');
    if (!id || Number.isNaN(at.getTime())) return invalid('Cursor không hợp lệ');
    clauses.push(or(lt(plays.startedAt, at), and(eq(plays.startedAt, at), lt(plays.id, id))));
  }
  const rows = await db
    .select({ play: plays, gameId: games.id, gameSlug: games.slug, gameName: repo.gameName })
    .from(plays)
    .innerJoin(games, eq(games.id, plays.gameId))
    .where(and(...clauses))
    .orderBy(desc(plays.startedAt), desc(plays.id))
    .limit(limit + 1);
  const page = rows.slice(0, limit);
  const ids = page.map((r) => r.play.id);
  const players = ids.length
    ? await db
        .select({
          playId: playPlayers.playId,
          identityId: playPlayers.identityId,
          computed: playPlayers.computed,
          userId: identities.userId,
        })
        .from(playPlayers)
        .innerJoin(identities, eq(identities.id, playPlayers.identityId))
        .where(inArray(playPlayers.playId, ids))
    : [];
  const last = page.at(-1);
  return {
    items: page.map((r) => {
      const all = players.filter((p) => p.playId === r.play.id);
      return {
        id: r.play.id,
        game: { id: r.gameId, slug: r.gameSlug, name: r.gameName },
        clubId: r.play.clubId,
        status: r.play.status,
        startedAt: r.play.startedAt.toISOString(),
        playerCount: all.length,
        myComputed: (all.find((p) => p.userId === userId)?.computed as PlayComputed | null) ?? null,
      };
    }),
    nextCursor:
      rows.length > limit && last
        ? Buffer.from(`${last.play.startedAt.toISOString()}|${last.play.id}`).toString('base64url')
        : null,
  };
}

export async function getScoreTemplateService(
  gameId: string,
  variant: string | undefined,
): Promise<ScoreTemplateDto> {
  const row = await repo.pickTemplate(gameId, variant);
  if (!row) return notFound('Game chưa có template điểm');
  return {
    id: row.id,
    gameId: row.gameId,
    variant: row.variant,
    version: row.version,
    status: row.status,
    needsReview: row.needsReview || row.status !== 'approved',
    definition: row.definition,
  };
}
