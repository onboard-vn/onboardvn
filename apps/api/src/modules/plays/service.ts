import { resolveCanonicalId } from '../games/repo.js';
import {
  CRITTER_KITCHEN_MEAL_CATEGORY_KEY,
  MAX_PLAY_PLAYERS,
  computeCritterKitchen,
  critterKitchenMealInputKeySchema,
  critterKitchenMealSchema,
  critterKitchenSetupSchema,
  playSetupSchema,
  scoreTemplateSchema,
  type MyPlaysResponse,
  type MyPlayHistoryStatus,
  type PlayCreateInput,
  type PlayDto,
  type PlayPatchInput,
  type PlayPollResponse,
  type PlayPresenceInput,
  type PlayStreamEvent,
  type PlayValueOp,
  type PlayValuesResponse,
  type PlaySetup,
  type CritterKitchenMeal,
  type TableCurrentPlayResponse,
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
import { getTableService } from '../identities/tables.js';
import * as identityRepo from '../identities/repo.js';
import { computePlay, type ComputePlayer } from './compute.js';
import * as hub from './hub.js';
import * as repo from './repo.js';
import { validateInputKey } from './value-ops.js';
import type { PlayBundle, PlayPlayerRow, TemplateRow } from './repo.js';
import type { PlayAccess } from './repo.js';

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

function validateSetupForGame(gameSlug: string, value: PlaySetup): PlaySetup {
  const parsed = playSetupSchema.safeParse(value);
  if (!parsed.success) return invalid('Thiết lập ván chơi không hợp lệ');
  if (gameSlug === 'critter-kitchen' && parsed.data !== null) {
    const critterSetup = critterKitchenSetupSchema.safeParse(parsed.data);
    if (!critterSetup.success) return invalid('Thiết lập Critter Kitchen không hợp lệ');
    return critterSetup.data;
  }
  return parsed.data;
}

function parseTemplate(row: TemplateRow | null): ScoreTemplate | null {
  if (!row) return null;
  const parsed = scoreTemplateSchema.safeParse(row.definition);
  if (!parsed.success) throw new ApiError('INTERNAL', 500, 'Template điểm không hợp lệ');
  return parsed.data;
}

function isCritterKitchenMealTemplate(row: TemplateRow | null): boolean {
  if (!row) return false;
  const parsed = scoreTemplateSchema.safeParse(row.definition);
  return Boolean(
    parsed.success && parsed.data.categories.some((category) => category.key === 'meal'),
  );
}

function usesCritterKitchenEngine(bundle: PlayBundle): boolean {
  return (
    bundle.game.slug === 'critter-kitchen' &&
    (bundle.play.setup !== null || isCritterKitchenMealTemplate(bundle.template))
  );
}

interface BundleScore {
  byIdentity: Map<string, PlayComputed | null>;
  tieUnresolved: boolean;
  warnings: string[];
  complete: boolean;
  errors: string[];
}

function scoreBundle(bundle: PlayBundle): BundleScore {
  if (usesCritterKitchenEngine(bundle)) {
    const empty = new Map(bundle.players.map((player) => [player.identityId, null]));
    const setup = critterKitchenSetupSchema.safeParse(bundle.play.setup);
    if (!setup.success) {
      const errors =
        bundle.play.setup === null
          ? ['Choose the shared Critter Kitchen setup before finalizing.']
          : ['Critter Kitchen setup is invalid.'];
      return {
        byIdentity: empty,
        tieUnresolved: false,
        warnings: [],
        complete: false,
        errors,
      };
    }
    const inputs: { identityId: string; seat: number; meal: CritterKitchenMeal }[] = [];
    for (const player of bundle.players) {
      const meal = critterKitchenMealSchema.safeParse(
        player.values[CRITTER_KITCHEN_MEAL_CATEGORY_KEY] ?? {},
      );
      if (!meal.success) {
        return {
          byIdentity: empty,
          tieUnresolved: false,
          warnings: [],
          complete: false,
          errors: ['A player meal contains invalid values.'],
        };
      }
      inputs.push({ identityId: player.identityId, seat: player.seat, meal: meal.data });
    }
    const result = computeCritterKitchen(setup.data, inputs);
    return {
      byIdentity: new Map(
        result.players.map((player) => [
          player.identityId,
          result.complete
            ? {
                categories: player.categories,
                total: player.total,
                rank: player.rank,
                isWinner: player.isWinner,
              }
            : null,
        ]),
      ),
      tieUnresolved: result.tieUnresolved,
      warnings: result.warnings,
      complete: result.complete,
      errors: result.errors.map((error) => error.message),
    };
  }

  const result = computePlay(
    parseTemplate(bundle.template),
    toComputePlayers(bundle.players),
    bundle.play.outcome,
  );
  if (!result.ok)
    return {
      byIdentity: new Map(bundle.players.map((p) => [p.identityId, null])),
      tieUnresolved: false,
      warnings: [],
      complete: false,
      errors: [result.message],
    };
  return {
    ...result.value,
    complete: true,
    errors: [],
  };
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
async function recompute(tx: Tx, bundle: PlayBundle, requireComplete = false): Promise<void> {
  const result = scoreBundle(bundle);
  if ((requireComplete || bundle.play.status === 'final') && !result.complete)
    return invalid(result.errors.join(' ') || 'Incomplete score.');
  for (const p of bundle.players) {
    const computed = result.byIdentity.get(p.identityId) ?? null;
    p.computed = computed;
    await tx
      .update(playPlayers)
      .set({ computed })
      .where(and(eq(playPlayers.playId, p.playId), eq(playPlayers.identityId, p.identityId)));
  }
}

async function editableIdentityIds(
  bundle: PlayBundle,
  userId: string,
  canEdit: boolean,
  executor: identityRepo.Executor = db,
): Promise<string[]> {
  const ids = bundle.players.map((p) => p.identityId);
  if (!bundle.play.meetupTableId) return canEdit ? ids : [];
  if (await repo.isTableHost(bundle.play.meetupTableId, userId, executor)) return ids;
  if (ids.length === 0) return [];
  const own = await executor
    .select({ id: identities.id })
    .from(identities)
    .where(and(eq(identities.userId, userId), inArray(identities.id, ids)));
  return own.map((identity) => identity.id);
}

async function toPlayDto(
  bundle: PlayBundle,
  viewerId: string,
  access: PlayAccess,
): Promise<PlayDto> {
  const { play, game, template, players } = bundle;
  const [dtos, outcome, editableIds] = await Promise.all([
    identityDtosByIds(
      players.map((p) => p.identityId),
      viewerId,
    ),
    Promise.resolve(scoreBundle(bundle)),
    editableIdentityIds(bundle, viewerId, access.canEdit),
  ]);
  const canManage = play.meetupTableId
    ? await repo.isTableHost(play.meetupTableId, viewerId)
    : access.canEdit;
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
          definition: template.definition,
        }
      : null,
    setup: play.setup,
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
    tieUnresolved: outcome.tieUnresolved,
    warnings: outcome.complete ? outcome.warnings : [...outcome.warnings, ...outcome.errors],
    canEdit: access.canEdit,
    canManage,
    editableIdentityIds: editableIds,
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
    if (existing.play.meetupTableId) {
      if (
        (input.meetupTableId && input.meetupTableId !== existing.play.meetupTableId) ||
        !(await repo.isTableHost(existing.play.meetupTableId, userId))
      ) {
        return forbidden();
      }
    } else if (existing.play.createdBy !== userId) {
      return conflict('Mã ván chơi đã tồn tại');
    }
    const access = await repo.resolveAccess(existing.play, existing.players, userId);
    if (!access.canView) return notFound();
    return toPlayDto(existing, userId, access);
  }

  let clubId = input.clubId ?? null;
  let tableGame: string | null = null;
  if (input.meetupTableId) {
    const table = await identityRepo.findTableContext(input.meetupTableId);
    const meetup = table ? await eventRepo.findMeetupById(table.meetupId) : undefined;
    if (!table || !meetup || !(await canViewMeetup(meetup, userId)))
      return notFound('Không tìm thấy bàn');
    if (!(await repo.isTableHost(input.meetupTableId, userId))) return forbidden();
    if (input.clubId !== undefined && input.clubId !== table.clubId) {
      return invalid('Club không khớp với Kèo');
    }
    clubId = table.clubId;
    tableGame = await tableGameId(input.meetupTableId);
  }
  if (!input.meetupTableId && clubId && !(await isMember(clubId, userId)))
    return forbidden('Bạn không phải thành viên của club này');

  const submittedGameId = input.gameId ?? tableGame;
  const gameId = submittedGameId ? await resolveCanonicalId(submittedGameId) : null;
  if (!gameId) return invalid('Cần chọn game');
  if (!(await repo.gameExists(gameId))) return invalid('Game không tồn tại');
  const [gameRow] = await db
    .select({ slug: games.slug })
    .from(games)
    .where(eq(games.id, gameId))
    .limit(1);
  const template =
    input.meetupTableId && gameRow?.slug === 'critter-kitchen'
      ? await repo.pickCritterKitchenMealTemplate(gameId)
      : await resolveTemplate(gameId, input.scoreTemplateId);
  if (input.meetupTableId && gameRow?.slug === 'critter-kitchen' && !template) {
    return invalid('Chưa có template nhập bữa ăn Critter Kitchen');
  }

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

  const result = await db.transaction(async (tx) => {
    if (input.meetupTableId) {
      if (!(await repo.lockTable(input.meetupTableId, tx))) return notFound('Không tìm thấy bàn');
      if (!(await repo.isTableHost(input.meetupTableId, userId, tx))) return forbidden();
      const current = await repo.loadCurrentTableDraft(input.meetupTableId, tx);
      if (current) return { id: current.play.id, created: false };
    }

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
    if (!row) return { id: null, created: false };
    await tx
      .insert(playPlayers)
      .values(identityIds.map((identityId, i) => ({ playId: input.id, identityId, seat: i + 1 })));
    await tx
      .insert(playEvents)
      .values({ playId: input.id, rev: 1, actorUserId: userId, action: 'create' });
    const bundle = await repo.loadBundle(input.id, tx);
    if (bundle) await recompute(tx, bundle);
    return { id: input.id, created: true };
  });
  if (!result.id) return conflict('Mã ván chơi đã tồn tại');
  const bundle = await repo.loadBundle(result.id);
  if (!bundle) return notFound();
  const access = await repo.resolveAccess(bundle.play, bundle.players, userId);
  if (!access.canView) return notFound();
  return toPlayDto(bundle, userId, access);
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
  return toPlayDto(bundle, userId, access);
}

function toScoreTemplateDto(row: TemplateRow | undefined | null): ScoreTemplateDto | null {
  return row
    ? {
        id: row.id,
        gameId: row.gameId,
        variant: row.variant,
        version: row.version,
        status: row.status,
        needsReview: row.needsReview || row.status !== 'approved',
        definition: row.definition,
      }
    : null;
}

export async function getTablePlayService(tableId: string, userId: string): Promise<PlayDto> {
  const bundle = await repo.loadCurrentTablePlay(tableId);
  if (!bundle) return notFound('Bàn chưa có ván chơi');
  return getPlayService(bundle.play.id, userId);
}

export async function getCurrentTablePlayService(
  tableId: string,
  userId: string,
): Promise<TableCurrentPlayResponse> {
  const [table, bundle, canManage, seated] = await Promise.all([
    getTableService(tableId, userId),
    repo.loadCurrentTablePlay(tableId),
    repo.isTableHost(tableId, userId),
    identityRepo.isSeatedUser(tableId, userId),
  ]);
  let play: PlayDto | null = null;
  if (bundle) {
    const access = await repo.resolveAccess(bundle.play, bundle.players, userId);
    if (!access.canView) return notFound('Không tìm thấy bàn');
    play = await toPlayDto(bundle, userId, access);
  } else if (table.clubId) {
    if (!(await isMember(table.clubId, userId))) return notFound('Không tìm thấy bàn');
  } else if (!canManage && !seated) {
    return notFound('Không tìm thấy bàn');
  }

  const editableIds =
    play?.editableIdentityIds ??
    (canManage
      ? [
          ...new Set([
            ...table.seated.map((identity) => identity.id),
            ...(table.host ? [table.host.id] : []),
          ]),
        ]
      : table.seated
          .filter((identity) => identity.userId === userId)
          .map((identity) => identity.id));
  const template = bundle
    ? bundle.template
    : table.game
      ? table.game.slug === 'critter-kitchen'
        ? await repo.pickCritterKitchenMealTemplate(table.game.id)
        : await repo.pickTemplate(table.game.id)
      : undefined;
  return {
    table,
    play,
    canManage,
    editableIdentityIds: editableIds,
    template: toScoreTemplateDto(template),
  };
}

export async function pollPlayService(
  playId: string,
  userId: string,
  sinceRev: number,
): Promise<PlayPollResponse> {
  const { bundle, access } = await requireView(playId, userId);
  const presence = hub.getPresence(playId);
  if (sinceRev === bundle.play.rev) return { rev: bundle.play.rev, presence };
  return { rev: bundle.play.rev, play: await toPlayDto(bundle, userId, access), presence };
}

export async function openStreamService(playId: string, userId: string) {
  const { bundle, access } = await requireView(playId, userId);
  const state = await toPlayDto(bundle, userId, access);
  const initial: PlayStreamEvent = {
    rev: bundle.play.rev,
    ops: [],
    computed: bundle.play.meetupTableId
      ? {}
      : Object.fromEntries(bundle.players.map((p) => [p.identityId, p.computed])),
    presence: hub.getPresence(playId),
    state,
  };
  return {
    initial,
    subscribe: (fn: (e: PlayStreamEvent) => void) => {
      let lastRev = initial.rev;
      const deliver = async (event: PlayStreamEvent) => {
        try {
          const latest = await getPlayService(playId, userId);
          if (latest.rev < lastRev) return;
          lastRev = latest.rev;
          fn({
            ...event,
            rev: latest.rev,
            ops: latest.meetupTableId || event.rev !== latest.rev ? [] : event.ops,
            computed: latest.meetupTableId
              ? {}
              : Object.fromEntries(
                  latest.players.map((player) => [player.identity.id, player.computed]),
                ),
            presence: hub.getPresence(playId),
            state: latest,
          });
        } catch {
          // Access can change after a stream opens; do not send play data without rechecking it.
        }
      };
      const unsubscribe = hub.subscribe(playId, (event) => void deliver(event));
      void getPlayService(playId, userId)
        .then((latest) => {
          if (latest.rev > lastRev) {
            lastRev = latest.rev;
            fn({
              rev: latest.rev,
              ops: [],
              computed: Object.fromEntries(
                latest.players.map((player) => [player.identity.id, player.computed]),
              ),
              presence: hub.getPresence(playId),
              state: latest,
            });
          }
        })
        .catch(() => undefined);
      return unsubscribe;
    },
  };
}

export async function presenceService(
  playId: string,
  userId: string,
  input: PlayPresenceInput,
): Promise<{ presence: ReturnType<typeof hub.getPresence> }> {
  const { bundle, access } = await requireView(playId, userId);
  if (!access.canEdit) return forbidden();
  const editable = await editableIdentityIds(bundle, userId, access.canEdit);
  if (!editable.includes(input.identityId)) {
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
  tableDraftOnly = false,
): Promise<{ bundle: PlayBundle; result: T }> {
  return db.transaction(async (tx) => {
    const bundle = await repo.loadBundle(playId, tx, true);
    if (!bundle) return notFound();
    const access = await repo.resolveAccess(bundle.play, bundle.players, userId, tx);
    if (!access.canView) return notFound();
    if (!access.canEdit) return forbidden();
    if (tableDraftOnly && bundle.play.meetupTableId && bundle.play.status === 'final') {
      return conflict('Ván trên bàn đã kết thúc');
    }
    const result = await fn(tx, bundle);
    return { bundle, result };
  });
}

function validateOp(
  op: PlayValueOp,
  template: ScoreTemplate | null,
  critterKitchenEngine: boolean,
  identityIds: Set<string>,
): void {
  if (!identityIds.has(op.identityId)) invalid('Người chơi không có trong ván');
  if (critterKitchenEngine) {
    if (op.categoryKey !== CRITTER_KITCHEN_MEAL_CATEGORY_KEY || op.roundIndex !== undefined)
      invalid('Hạng mục không hợp lệ');
    if (
      op.inputKey !== undefined &&
      !critterKitchenMealInputKeySchema.safeParse(op.inputKey).success
    ) {
      invalid('Hạng mục bữa ăn không hợp lệ');
    }
    if (
      op.inputKey !== undefined &&
      op.value !== null &&
      (typeof op.value !== 'number' || !Number.isInteger(op.value) || op.value < 0)
    ) {
      invalid('Giá trị bữa ăn không hợp lệ');
    }
    if (
      op.inputKey === undefined &&
      op.value !== null &&
      !critterKitchenMealSchema.safeParse(op.value).success
    ) {
      invalid('Dữ liệu bữa ăn không hợp lệ');
    }
    return;
  }
  if (!template) {
    if (op.inputKey !== undefined) invalid('Hạng mục không hợp lệ');
    if (op.categoryKey !== 'total' || op.roundIndex !== undefined) invalid('Hạng mục không hợp lệ');
    if (op.value !== null && typeof op.value !== 'number') invalid('Giá trị không hợp lệ');
    return;
  }
  const category = template.categories.find((c) => c.key === op.categoryKey);
  if (!category) return invalid('Hạng mục không hợp lệ');
  if (op.inputKey !== undefined) {
    const inputError = validateInputKey(op, template);
    if (inputError) invalid(inputError);
    return;
  }
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
  const { bundle } = await mutate(
    playId,
    userId,
    async (tx, b) => {
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
      const critterKitchenEngine = usesCritterKitchenEngine(b);
      const ids = new Set(b.players.map((p) => p.identityId));
      const editableIds = new Set(await editableIdentityIds(b, userId, true, tx));
      const canManageTable = b.play.meetupTableId
        ? await repo.isTableHost(b.play.meetupTableId, userId, tx)
        : b.play.createdBy === userId;
      const sharedIdentity = [...b.players].sort((a, b) => a.seat - b.seat)[0]?.identityId;
      const byIdentity = new Map(b.players.map((p) => [p.identityId, p]));
      const events: EventInput[] = [];
      const seen = new Set<string>();
      const applied: PlayValueOp[] = [];
      for (const op of fresh) {
        if (seen.has(op.opId)) continue;
        seen.add(op.opId);
        validateOp(op, template, critterKitchenEngine, ids);
        const sharedCategory =
          template?.categories.find((c) => c.key === op.categoryKey)?.scope === 'team';
        if (sharedCategory && (!canManageTable || op.identityId !== sharedIdentity)) forbidden();
        if (b.play.meetupTableId && !editableIds.has(op.identityId)) forbidden();
        const player = byIdentity.get(op.identityId)!;
        let oldValue: unknown;
        if (op.inputKey !== undefined) {
          const values = { ...player.values };
          const meal = {
            ...((values[op.categoryKey] as Record<string, number> | undefined) ?? {}),
          };
          oldValue = meal[op.inputKey] ?? null;
          if (op.value === null) delete meal[op.inputKey];
          else meal[op.inputKey] = op.value as number;
          if (Object.keys(meal).length) values[op.categoryKey] = meal;
          else delete values[op.categoryKey];
          player.values = values;
        } else if (op.roundIndex !== undefined) {
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
          oldValue:
            op.inputKey === undefined ? oldValue : { inputKey: op.inputKey, value: oldValue },
          newValue:
            op.inputKey === undefined ? op.value : { inputKey: op.inputKey, value: op.value },
          clientOpId: op.opId,
        });
      }
      await recompute(tx, b, critterKitchenEngine && b.play.status === 'final');
      for (const p of b.players) {
        await tx
          .update(playPlayers)
          .set({ values: p.values, rounds: p.rounds })
          .where(and(eq(playPlayers.playId, playId), eq(playPlayers.identityId, p.identityId)));
      }
      await bump(tx, b);
      await logEvents(tx, b, userId, events);
      return applied;
    },
    true,
  ).then(async (r) => {
    if (r.result.length) emit(r.bundle, r.result);
    return r;
  });
  const access = await repo.resolveAccess(bundle.play, bundle.players, userId);
  return {
    rev: bundle.play.rev,
    applied: ops.map((o) => o.opId),
    play: await toPlayDto(bundle, userId, access),
  };
}

export async function patchPlayService(
  playId: string,
  userId: string,
  input: PlayPatchInput,
): Promise<PlayDto> {
  const { bundle } = await mutate(
    playId,
    userId,
    async (tx, b) => {
      if (b.play.meetupTableId && !(await repo.isTableHost(b.play.meetupTableId, userId, tx)))
        forbidden();
      const events: EventInput[] = [];
      const set: Partial<typeof plays.$inferInsert> = {};

      if (input.setup !== undefined) {
        const setup = validateSetupForGame(b.game.slug, input.setup);
        set.setup = setup;
        events.push({ action: 'set_setup', oldValue: b.play.setup, newValue: setup });
      }

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

      const oldAnchor = [...b.players].sort((a, b) => a.seat - b.seat)[0];
      const sharedKeys =
        parseTemplate(b.template)
          ?.categories.filter((category) => category.scope === 'team')
          .map((category) => category.key) ?? [];
      const transferSharedValues = async (successor: PlayPlayerRow | undefined) => {
        if (!oldAnchor || !successor || !remove.has(oldAnchor.identityId)) return;
        const values = { ...successor.values };
        const rounds = { ...(successor.rounds ?? {}) };
        for (const key of sharedKeys) {
          if (Object.hasOwn(oldAnchor.values, key)) values[key] = oldAnchor.values[key];
          if (oldAnchor.rounds && Object.hasOwn(oldAnchor.rounds, key))
            rounds[key] = oldAnchor.rounds[key]!;
        }
        successor.values = values;
        successor.rounds = Object.keys(rounds).length ? rounds : null;
        await tx
          .update(playPlayers)
          .set({ values, rounds: successor.rounds })
          .where(
            and(eq(playPlayers.playId, playId), eq(playPlayers.identityId, successor.identityId)),
          );
      };
      const survivingAnchor = [...b.players]
        .filter((player) => !remove.has(player.identityId))
        .sort((a, b) => a.seat - b.seat)[0];
      await transferSharedValues(survivingAnchor);

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
        if (!survivingAnchor)
          await transferSharedValues([...inserted].sort((a, b) => a.seat - b.seat)[0]);
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
      await recompute(tx, b, usesCritterKitchenEngine(b) && b.play.status === 'final');
      await bump(tx, b, set);
      await logEvents(tx, b, userId, events);
    },
    true,
  );
  emit(bundle, []);
  const access = await repo.resolveAccess(bundle.play, bundle.players, userId);
  return toPlayDto(bundle, userId, access);
}

export async function finalizePlayService(playId: string, userId: string): Promise<PlayDto> {
  const { bundle, result } = await mutate(playId, userId, async (tx, b) => {
    if (b.play.meetupTableId && !(await repo.isTableHost(b.play.meetupTableId, userId, tx)))
      forbidden();
    if (b.play.status === 'final') return false;
    if (b.players.length === 0) invalid('Cần ít nhất một người chơi');
    await recompute(tx, b, true);
    await bump(tx, b, { status: 'final', endedAt: b.play.endedAt ?? new Date() });
    await logEvents(tx, b, userId, [{ action: 'finalize' }]);
    return true;
  });
  if (result) emit(bundle, []);
  const access = await repo.resolveAccess(bundle.play, bundle.players, userId);
  return toPlayDto(bundle, userId, access);
}

// ---------------------------------------------------------------------------
// History / templates
// ---------------------------------------------------------------------------

export async function listMyPlaysService(
  userId: string,
  cursor: string | undefined,
  limit: number,
  status?: MyPlayHistoryStatus,
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
  if (status === 'finished') clauses.push(eq(plays.status, 'final'));
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
          seat: playPlayers.seat,
          computed: playPlayers.computed,
          userId: identities.userId,
        })
        .from(playPlayers)
        .innerJoin(identities, eq(identities.id, playPlayers.identityId))
        .where(inArray(playPlayers.playId, ids))
        .orderBy(playPlayers.seat)
    : [];
  const winnerIds = players.filter((p) => p.computed?.isWinner).map((p) => p.identityId);
  const winnerDtos = winnerIds.length ? await identityDtosByIds(winnerIds, userId) : new Map();
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
        winners: all.flatMap((p) => {
          const winner = p.computed?.isWinner ? winnerDtos.get(p.identityId) : undefined;
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
