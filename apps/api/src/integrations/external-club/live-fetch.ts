import { asc, and, eq, inArray } from 'drizzle-orm';
import type {
  ClubLiveDayData,
  ClubLiveGame,
  ClubLiveGamesData,
  ClubLiveHistoryDatesData,
  ClubLiveMembersData,
  ClubLiveSeat,
} from '@onboard/shared';
import { db } from '../../db/client.js';
import { logger } from '../../lib/logger.js';
import {
  clubExternalMembers,
  clubExternalOwnerships,
  clubs,
  externalRefs,
  gameExternalMetadata,
  games,
  identities,
  meetupTableIdentities,
  meetupTables,
  meetups,
  plays,
  users,
} from '../../db/schema/index.js';
import { emptyReport, type SyncContext } from './context.js';
import type { LiveReader, LiveResult } from './live-types.js';
import { buildSyncContext } from './sync.js';
import { syncGames, syncMembers } from './sync-catalog.js';
import { syncDays } from './sync-days.js';
import type { ExternalClubSource, ExternalDay, ExternalGame } from './types.js';

const DEFAULT_TIMEOUT_MS = 8_000;
const inFlight = new Map<string, Promise<LiveResult<unknown>>>();
const lastSuccessByKey = new Map<string, string>();
const dayLocks = new Map<string, Promise<void>>();

type LiveRouteKind = 'day' | 'members' | 'games' | 'history';

export interface LiveFetchDeps {
  source?: ExternalClubSource | null;
  timeoutMs?: number;
}

function liveKey(clubId: string, route: string): string {
  return `${clubId}:${route}`;
}

function singleFlight<T>(key: string, work: () => Promise<LiveResult<T>>): Promise<LiveResult<T>> {
  const current = inFlight.get(key);
  if (current) return current as Promise<LiveResult<T>>;

  const promise = Promise.resolve()
    .then(work)
    .finally(() => {
      if (inFlight.get(key) === promise) inFlight.delete(key);
    });
  inFlight.set(key, promise);
  return promise;
}

function withDeadline<T>(request: () => Promise<T>, timeoutMs: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      const error = new Error('External club request deadline exceeded') as Error & { code: string };
      error.code = 'deadline';
      reject(error);
    }, timeoutMs);
  });

  return Promise.race([Promise.resolve().then(request), deadline]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}

async function withDayLock<T>(clubId: string, date: string, work: () => Promise<T>): Promise<T> {
  const key = `${clubId}:${date}`;
  const previous = dayLocks.get(key) ?? Promise.resolve();
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const tail = previous.then(() => gate);
  dayLocks.set(key, tail);

  try {
    return await previous.then(work);
  } finally {
    release();
    if (dayLocks.get(key) === tail) dayLocks.delete(key);
  }
}

async function clubContext(clubId: string): Promise<{ slug: string; externalSource: string | null }> {
  const [club] = await db
    .select({ slug: clubs.slug, externalSource: clubs.externalSource })
    .from(clubs)
    .where(eq(clubs.id, clubId))
    .limit(1);
  if (!club) throw new Error('Club not found');
  return club;
}

async function syncForClub<T>(
  clubId: string,
  source: ExternalClubSource,
  work: (ctx: SyncContext) => Promise<T>,
  knownSlug?: string,
): Promise<T> {
  const slug = knownSlug ?? (await clubContext(clubId)).slug;
  return db.transaction(async (tx) => {
    const ctx = await buildSyncContext(tx, source.source, slug, emptyReport(false));
    return work(ctx);
  });
}

function staleResult<T>(key: string, data: T): LiveResult<T> {
  return { data, stale: true, lastSuccessAt: lastSuccessByKey.get(key) ?? null };
}

function freshResult<T>(key: string, data: T): LiveResult<T> {
  const lastSuccessAt = new Date().toISOString();
  lastSuccessByKey.set(key, lastSuccessAt);
  return { data, stale: false, lastSuccessAt };
}

async function fetchOnAccess<TSource, TData>(args: {
  key: string;
  clubId: string;
  routeKind: LiveRouteKind;
  timeoutMs: number;
  request?: () => Promise<TSource>;
  fallback: () => Promise<TData>;
  transform: (value: TSource) => Promise<TData>;
}): Promise<LiveResult<TData>> {
  if (!args.request) return staleResult(args.key, await args.fallback());

  let value: TSource;
  try {
    value = await withDeadline(args.request, args.timeoutMs);
  } catch (error) {
    const details = errorDetails(error);
    logger.warn({ clubId: args.clubId, routeKind: args.routeKind, ...details });
    return staleResult(args.key, await args.fallback());
  }

  return freshResult(args.key, await args.transform(value));
}

function errorDetails(error: unknown): { errorName: string; errorCode?: string | number } {
  const record = error && typeof error === 'object' ? (error as Record<string, unknown>) : null;
  const name = record?.name;
  const code = record?.code;
  const isSafeLabel = (value: unknown): value is string =>
    typeof value === 'string' && /^[A-Za-z][A-Za-z0-9_.-]{0,63}$/.test(value);

  return {
    errorName: isSafeLabel(name) ? name : 'UnknownError',
    ...(typeof code === 'number' || isSafeLabel(code) ? { errorCode: code } : {}),
  };
}

async function readMembersFromDb(clubId: string): Promise<ClubLiveMembersData> {
  const rows = await db
    .select({ externalId: clubExternalMembers.externalId, nickname: clubExternalMembers.nickname })
    .from(clubExternalMembers)
    .where(eq(clubExternalMembers.clubId, clubId))
    .orderBy(asc(clubExternalMembers.nickname), asc(clubExternalMembers.externalId));
  return { items: rows };
}

async function readHistoryDatesFromDb(
  clubId: string,
  source: string,
): Promise<ClubLiveHistoryDatesData> {
  const rows = await db
    .select({ date: externalRefs.externalId })
    .from(externalRefs)
    .innerJoin(meetups, eq(meetups.id, externalRefs.internalId))
    .where(
      and(
        eq(externalRefs.source, source),
        eq(externalRefs.kind, 'meetup'),
        eq(meetups.clubId, clubId),
      ),
    )
    .orderBy(asc(externalRefs.externalId));
  return { dates: rows.map((row) => row.date) };
}

async function readGamesFromDb(clubId: string, source: string): Promise<ClubLiveGamesData> {
  const metadata = await db
    .select({ externalId: gameExternalMetadata.externalId, gameId: gameExternalMetadata.gameId, payload: gameExternalMetadata.payload })
    .from(gameExternalMetadata)
    .where(eq(gameExternalMetadata.source, source))
    .orderBy(asc(gameExternalMetadata.externalId));
  if (metadata.length === 0) return { items: [] };

  const gameIds = [...new Set(metadata.map((row) => row.gameId))];
  const gameRows = await db
    .select({
      id: games.id,
      name: games.nameEn,
      minPlayers: games.minPlayers,
      maxPlayers: games.maxPlayers,
      playMinutes: games.playMinutes,
      bggId: games.bggId,
    })
    .from(games)
    .where(inArray(games.id, gameIds));
  const gameById = new Map(gameRows.map((game) => [game.id, game]));
  const ownerRows = await db
    .select({ gameId: clubExternalOwnerships.gameId, externalMemberId: clubExternalMembers.externalId })
    .from(clubExternalOwnerships)
    .innerJoin(clubExternalMembers, eq(clubExternalMembers.id, clubExternalOwnerships.externalMemberId))
    .where(
      and(
        eq(clubExternalOwnerships.clubId, clubId),
        inArray(clubExternalOwnerships.gameId, gameIds),
      ),
    );
  const ownersByGame = new Map<string, Set<string>>();
  for (const row of ownerRows) {
    const owners = ownersByGame.get(row.gameId) ?? new Set<string>();
    owners.add(row.externalMemberId);
    ownersByGame.set(row.gameId, owners);
  }

  return {
    items: metadata.flatMap((row) => {
      const game = gameById.get(row.gameId);
      if (!game) return [];
      const payload = row.payload as
        | {
            name?: unknown;
            year?: unknown;
            minPlayers?: unknown;
            maxPlayers?: unknown;
            playMinutes?: unknown;
            bggId?: unknown;
            expansions?: unknown;
          }
        | null;
      const name = typeof payload?.name === 'string' ? payload.name : game.name;
      const year = typeof payload?.year === 'number' ? payload.year : null;
      const minPlayers = storedCount(payload?.minPlayers, game.minPlayers);
      const maxPlayers = storedCount(payload?.maxPlayers, game.maxPlayers);
      const playMinutes = storedCount(payload?.playMinutes, game.playMinutes);
      const bggId = storedBggId(payload?.bggId, game.bggId);
      const expansions = Array.isArray(payload?.expansions)
        ? payload.expansions.flatMap((value) => {
            if (!value || typeof value !== 'object') return [];
            const expansion = value as { externalId?: unknown; name?: unknown };
            return typeof expansion.externalId === 'string' && typeof expansion.name === 'string'
              ? [{ externalId: expansion.externalId, name: expansion.name }]
              : [];
          })
        : [];
      const dto: ClubLiveGame = {
        externalId: row.externalId,
        name,
        year,
        minPlayers,
        maxPlayers,
        playMinutes,
        bggId,
        owners: [...(ownersByGame.get(row.gameId) ?? [])].sort().map((externalMemberId) => ({ externalMemberId })),
        expansions,
      };
      return [dto];
    }),
  };
}

function storedCount(value: unknown, fallback: number | null): number | null {
  if (value === null) return null;
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 ? value : fallback;
}

function storedBggId(value: unknown, fallback: number | null): number | null {
  if (value === null) return null;
  return typeof value === 'number' && Number.isInteger(value) && value > 0 ? value : fallback;
}

async function storeGamePayloads(ctx: SyncContext, input: ExternalGame[]): Promise<void> {
  const fetchedAt = new Date();
  for (const game of input) {
    await ctx.tx
      .update(gameExternalMetadata)
      .set({ payload: game, fetchedAt })
      .where(
        and(
          eq(gameExternalMetadata.source, ctx.source),
          eq(gameExternalMetadata.externalId, game.externalId),
        ),
      );
  }
}

async function readDayFromDb(
  clubId: string,
  source: string,
  date: string,
  liveDay?: ExternalDay,
): Promise<ClubLiveDayData> {
  const [meetup] = await db
    .select({ id: meetups.id, venue: meetups.addressLine, note: meetups.description })
    .from(externalRefs)
    .innerJoin(meetups, eq(meetups.id, externalRefs.internalId))
    .where(
      and(
        eq(externalRefs.source, source),
        eq(externalRefs.kind, 'meetup'),
        eq(externalRefs.externalId, date),
        eq(meetups.clubId, clubId),
      ),
    )
    .limit(1);
  if (!meetup) return { date, venue: null, note: null, tables: [], externalUrl: null };

  const tableRows = await db
    .select({
      id: meetupTables.id,
      gameId: meetupTables.gameId,
      seats: meetupTables.seats,
      note: meetupTables.note,
      externalId: externalRefs.externalId,
      gameName: games.nameEn,
    })
    .from(meetupTables)
    .innerJoin(
      externalRefs,
      and(
        eq(externalRefs.internalId, meetupTables.id),
        eq(externalRefs.source, source),
        eq(externalRefs.kind, 'meetup_table'),
      ),
    )
    .leftJoin(games, eq(games.id, meetupTables.gameId))
    .where(eq(meetupTables.meetupId, meetup.id))
    .orderBy(asc(meetupTables.position), asc(externalRefs.externalId));
  const tableIds = tableRows.map((table) => table.id);
  const seatRows = tableIds.length
    ? await db
        .select({
          tableId: meetupTableIdentities.tableId,
          kind: identities.kind,
          externalId: identities.externalId,
          displayName: identities.displayName,
          userName: users.name,
          profileVisibility: users.profileVisibility,
          invitedByIdentityId: identities.invitedByIdentityId,
        })
        .from(meetupTableIdentities)
        .innerJoin(identities, eq(identities.id, meetupTableIdentities.identityId))
        .leftJoin(users, eq(users.id, identities.userId))
        .where(inArray(meetupTableIdentities.tableId, tableIds))
        .orderBy(asc(identities.externalId))
    : [];
  const inviterIds = [...new Set(seatRows.flatMap((seat) => (seat.invitedByIdentityId ? [seat.invitedByIdentityId] : [])))];
  const inviterRows = inviterIds.length
    ? await db
        .select({ id: identities.id, externalId: identities.externalId })
        .from(identities)
        .where(inArray(identities.id, inviterIds))
    : [];
  const inviterById = new Map(inviterRows.map((row) => [row.id, row.externalId]));
  const seatsByTable = new Map<string, ClubLiveSeat[]>();
  for (const seat of seatRows) {
    let dto: ClubLiveSeat | undefined;
    if (seat.kind === 'external' && seat.externalId) {
      dto = {
        kind: 'member',
        externalMemberId: seat.externalId,
        displayName:
          seat.profileVisibility === 'public' && seat.userName
            ? seat.userName
            : seat.displayName,
      };
    } else if (seat.kind === 'guest' && seat.externalId && seat.invitedByIdentityId) {
      const invitedByExternalMemberId = inviterById.get(seat.invitedByIdentityId);
      if (invitedByExternalMemberId) {
        dto = {
          kind: 'guest',
          externalId: seat.externalId,
          invitedByExternalMemberId,
          displayName: seat.displayName,
        };
      }
    }
    if (!dto) continue;
    const seats = seatsByTable.get(seat.tableId) ?? [];
    seats.push(dto);
    seatsByTable.set(seat.tableId, seats);
  }

  const metadataRows = tableRows.flatMap((table) => (table.gameId ? [table.gameId] : []));
  const gameMetadata = metadataRows.length
    ? await db
        .select({
          externalId: gameExternalMetadata.externalId,
          gameId: gameExternalMetadata.gameId,
          payload: gameExternalMetadata.payload,
        })
        .from(gameExternalMetadata)
        .where(
          and(
            eq(gameExternalMetadata.source, source),
            inArray(gameExternalMetadata.gameId, [...new Set(metadataRows)]),
          ),
        )
    : [];
  const externalGameById = new Map(gameMetadata.map((row) => [row.gameId, row.externalId]));
  const externalGameNameById = new Map(
    gameMetadata.flatMap((row) => {
      const payload = row.payload as { name?: unknown } | null;
      return typeof payload?.name === 'string' ? [[row.gameId, payload.name] as const] : [];
    }),
  );
  const liveTableByExternalId = new Map((liveDay?.tables ?? []).map((table) => [table.externalId, table]));
  const hostExternalIds = [
    ...new Set(
      (liveDay?.tables ?? []).flatMap((table) =>
        table.hostExternalMemberId ? [table.hostExternalMemberId] : [],
      ),
    ),
  ];
  const hostRows = hostExternalIds.length
    ? await db
        .select({
          externalId: clubExternalMembers.externalId,
          nickname: clubExternalMembers.nickname,
          name: users.name,
          profileVisibility: users.profileVisibility,
        })
        .from(clubExternalMembers)
        .leftJoin(users, eq(users.id, clubExternalMembers.userId))
        .where(
          and(
            eq(clubExternalMembers.clubId, clubId),
            inArray(clubExternalMembers.externalId, hostExternalIds),
          ),
        )
    : [];
  const hostNameByExternalId = new Map(
    hostRows.map((host) => [
      host.externalId,
      host.profileVisibility === 'public' && host.name ? host.name : host.nickname,
    ]),
  );
  const tablePlays = tableIds.length
    ? await db
        .select({ tableId: plays.meetupTableId, status: plays.status })
        .from(plays)
        .where(inArray(plays.meetupTableId, tableIds))
    : [];
  const frozenTableIds = new Set(
    tablePlays.flatMap((play) =>
      play.tableId && play.status === 'draft' ? [play.tableId] : [],
    ),
  );

  return {
    date,
    venue: meetup.venue,
    note: meetup.note,
    tables: tableRows.map((row) => {
      const liveTable = frozenTableIds.has(row.id) ? undefined : liveTableByExternalId.get(row.externalId);
      const liveHostId = liveTableByExternalId.get(row.externalId)?.hostExternalMemberId;
      return {
        tableId: row.id,
        externalId: row.externalId,
        hostName: liveHostId ? hostNameByExternalId.get(liveHostId) ?? null : null,
        hasOpenPlay: frozenTableIds.has(row.id),
        gameExternalId: liveTable
          ? liveTable.gameExternalId ?? null
          : row.gameId
            ? externalGameById.get(row.gameId) ?? null
            : null,
        gameName: liveTable
          ? liveTable.gameName
          : (row.gameId ? externalGameNameById.get(row.gameId) : undefined) ??
            row.gameName ??
            row.note ??
            '',
        note: liveTable ? liveTable.note ?? null : row.note,
        startsAt: liveTable ? liveTable.startsAt ?? null : null,
        endsAt: liveTable ? liveTable.endsAt ?? null : null,
        minPlayers: liveTable ? liveTable.minPlayers ?? null : null,
        maxPlayers: liveTable ? liveTable.maxPlayers ?? null : row.seats,
        seats: seatsByTable.get(row.id) ?? [],
        status: liveTable ? liveTable.status : 'confirmed',
      };
    }),
    externalUrl: null,
  };
}

export function createLiveReader(deps: LiveFetchDeps): LiveReader {
  const source = deps.source ?? null;
  const timeoutMs = deps.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    throw new Error('External club timeout must be a positive number');
  }

  return {
    readDay(clubId, date) {
      const key = liveKey(clubId, `day/${date}`);
      return singleFlight(key, async () => {
        const context = await clubContext(clubId);
        const sourceId = source?.source ?? context.externalSource ?? '';
        return fetchOnAccess({
          key,
          clubId,
          routeKind: 'day',
          timeoutMs,
          request: source?.fetchDay ? () => source.fetchDay!(date) : undefined,
          fallback: () => readDayFromDb(clubId, sourceId, date),
          transform: async (day) => {
            if (!day) return { date, venue: null, note: null, tables: [], externalUrl: null };
            if (!source) return readDayFromDb(clubId, sourceId, date);
            await withDayLock(clubId, date, async () => {
              await syncForClub(clubId, source, async (ctx) => syncDays(ctx, [day]), context.slug);
            });
            return readDayFromDb(clubId, sourceId, date, day);
          },
        });
      });
    },
    readMembers(clubId) {
      const key = liveKey(clubId, 'members');
      return singleFlight(key, async () => {
        await clubContext(clubId);
        return fetchOnAccess({
          key,
          clubId,
          routeKind: 'members',
          timeoutMs,
          request: source?.fetchMembers ? () => source.fetchMembers!() : undefined,
          fallback: () => readMembersFromDb(clubId),
          transform: async (members) => {
            if (!source) return readMembersFromDb(clubId);
            await syncForClub(clubId, source, async (ctx) => syncMembers(ctx, members, new Map()));
            return readMembersFromDb(clubId);
          },
        });
      });
    },
    readGames(clubId) {
      const key = liveKey(clubId, 'games');
      return singleFlight(key, async () => {
        const context = await clubContext(clubId);
        const sourceId = source?.source ?? context.externalSource ?? '';
        return fetchOnAccess({
          key,
          clubId,
          routeKind: 'games',
          timeoutMs,
          request: source?.fetchGames ? () => source.fetchGames!() : undefined,
          fallback: () => readGamesFromDb(clubId, sourceId),
          transform: async (games) => {
            if (!source) return readGamesFromDb(clubId, sourceId);
            await syncForClub(clubId, source, async (ctx) => {
              await syncGames(ctx, games, { syncOwnerships: false });
              await storeGamePayloads(ctx, games);
            });
            return readGamesFromDb(clubId, source.source);
          },
        });
      });
    },
    readHistoryDates(clubId) {
      const key = liveKey(clubId, 'history');
      return singleFlight(key, async () => {
        const context = await clubContext(clubId);
        const sourceId = source?.source ?? context.externalSource ?? '';
        return fetchOnAccess({
          key,
          clubId,
          routeKind: 'history',
          timeoutMs,
          request: source?.fetchHistoryDates ? () => source.fetchHistoryDates!() : undefined,
          fallback: () => readHistoryDatesFromDb(clubId, sourceId),
          transform: async (dates) => ({ dates }),
        });
      });
    },
  };
}
