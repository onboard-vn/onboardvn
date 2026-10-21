import { randomUUID } from 'node:crypto';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { and, eq, inArray } from 'drizzle-orm';
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { db, pool } from '../../db/client.js';
import { logger } from '../../lib/logger.js';
import {
  clubExternalMembers,
  clubs,
  externalRefs,
  gameExternalMetadata,
  games,
  meetups,
  plays,
  provinces,
  users,
} from '../../db/schema/index.js';
import { fakeUser } from '../../test/fake-auth.js';
import { createLiveReader } from './live-fetch.js';
import { loadExternalClubSource } from './loader.js';
import { syncExternalClub } from './sync.js';
import type { ExternalClubSource, ExternalDay, ExternalGame, ExternalMember } from './types.js';

type World = {
  sourceId: string;
  provinceCode: string;
  clubIds: string[];
  slugs: string[];
  gameSlug: string;
  owner: ReturnType<typeof fakeUser>;
};

const staleMember: ExternalMember = {
  externalId: 'stored-member',
  nickname: 'Stored Member',
  stats: {},
};
const freshMember: ExternalMember = {
  externalId: 'fresh-member',
  nickname: 'Fresh Member',
  stats: {},
};
let world: World;

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((done, fail) => {
    resolve = done;
    reject = fail;
  });
  return { promise, resolve, reject };
}

function sourceWith(
  methods: Partial<
    Pick<ExternalClubSource, 'fetchDay' | 'fetchMembers' | 'fetchGames' | 'fetchHistoryDates'>
  > = {},
): ExternalClubSource {
  return {
    source: world.sourceId,
    listGames: async () => [],
    listMembers: async () => [],
    listDays: async () => [],
    fetchDay: async () => null,
    fetchMembers: async () => [freshMember],
    fetchGames: async () => [],
    fetchHistoryDates: async () => [],
    ...methods,
  };
}

beforeEach(async () => {
  const key = randomUUID().replaceAll('-', '');
  world = {
    sourceId: `live_test_${key}`,
    provinceCode: `live-${key}`,
    clubIds: [],
    slugs: [`live-test-a-${key}`, `live-test-b-${key}`],
    gameSlug: `live-test-game-${key}`,
    owner: {
      ...fakeUser('user'),
      id: `u-live-owner-${key}`,
      email: `live-owner-${key}@example.test`,
    },
  };
  await db.insert(users).values(world.owner);
  await db.insert(provinces).values({
    code: world.provinceCode,
    name: 'Live Test Province',
    slug: world.provinceCode,
  });
  const rows = await db
    .insert(clubs)
    .values(
      world.slugs.map((slug, index) => ({
        slug,
        name: `Live Test Club ${index + 1}`,
        provinceCode: index === 0 ? world.provinceCode : null,
        inviteCodeHash: `hash-${slug}`,
        externalSource: world.sourceId,
        externalId: `club-${index + 1}`,
        createdBy: world.owner.id,
      })),
    )
    .returning({ id: clubs.id });
  world.clubIds = rows.map((row) => row.id);
  await db.insert(clubExternalMembers).values(
    world.clubIds.map((clubId) => ({
      clubId,
      externalId: staleMember.externalId,
      nickname: staleMember.nickname,
      stats: staleMember.stats,
    })),
  );
});

afterEach(async () => {
  await db.delete(externalRefs).where(eq(externalRefs.source, world.sourceId));
  await db.delete(plays).where(inArray(plays.clubId, world.clubIds));
  await db.delete(meetups).where(inArray(meetups.clubId, world.clubIds));
  await db.delete(gameExternalMetadata).where(eq(gameExternalMetadata.source, world.sourceId));
  await db.delete(games).where(eq(games.slug, world.gameSlug));
  await db.delete(clubs).where(inArray(clubs.id, world.clubIds));
  await db.delete(users).where(eq(users.id, world.owner.id));
  await db.delete(provinces).where(eq(provinces.code, world.provinceCode));
});

afterAll(async () => {
  await pool.end();
});

describe('external club live fetches', () => {
  it('returns database table ids, names, host visibility, and open-play state', async () => {
    const date = '2026-10-21';
    const host: ExternalMember = {
      externalId: 'live-host',
      nickname: 'Host Nickname',
      stats: {},
    };
    const player: ExternalMember = {
      externalId: 'live-player',
      nickname: 'Player Nickname',
      stats: {},
    };
    const game: ExternalGame = {
      externalId: 'live-game',
      name: world.gameSlug.replaceAll('-', ' '),
      owners: [],
      expansions: [],
    };
    const day: ExternalDay = {
      date,
      venue: 'Live test venue',
      note: null,
      tables: [
        {
          externalId: 'live-table',
          hostExternalMemberId: host.externalId,
          gameExternalId: game.externalId,
          gameName: game.name,
          note: null,
          minPlayers: 2,
          maxPlayers: 4,
          players: [
            { externalMemberId: host.externalId },
            { externalMemberId: player.externalId },
          ],
          guests: [{ externalId: 'live-guest', invitedByExternalMemberId: host.externalId }],
          status: 'confirmed',
        },
      ],
    };
    const source: ExternalClubSource = {
      source: world.sourceId,
      listGames: async () => [game],
      listMembers: async () => [host, player],
      listDays: async () => [day],
      fetchDay: async () => day,
    };

    await syncExternalClub(source, { clubSlug: world.slugs[0]! });
    await db
      .update(clubExternalMembers)
      .set({ userId: world.owner.id })
      .where(
        and(
          eq(clubExternalMembers.clubId, world.clubIds[0]!),
          eq(clubExternalMembers.externalId, host.externalId),
        ),
      );
    await syncExternalClub(source, { clubSlug: world.slugs[0]! });

    const reader = createLiveReader({ source });
    const fresh = await reader.readDay(world.clubIds[0]!, date);
    const table = fresh.data.tables[0]!;

    expect(fresh.stale).toBe(false);
    expect(table.tableId).toMatch(/^[0-9a-f-]{36}$/i);
    expect(table.hostName).toBe(world.owner.name);
    expect(table.hasOpenPlay).toBe(false);
    expect(table.seats).toEqual(
      expect.arrayContaining([
        { kind: 'member', externalMemberId: host.externalId, displayName: world.owner.name },
        { kind: 'member', externalMemberId: player.externalId, displayName: player.nickname },
        {
          kind: 'guest',
          externalId: 'live-guest',
          invitedByExternalMemberId: host.externalId,
          displayName: 'Bạn của Host Nickname',
        },
      ]),
    );

    await db.update(users).set({ profileVisibility: 'private' }).where(eq(users.id, world.owner.id));
    const privateProfile = await reader.readDay(world.clubIds[0]!, date);
    expect(privateProfile.data.tables[0]?.hostName).toBe(host.nickname);
    expect(privateProfile.data.tables[0]?.seats).toContainEqual({
      kind: 'member',
      externalMemberId: host.externalId,
      displayName: host.nickname,
    });

    const [storedGame] = await db
      .select({ id: games.id })
      .from(games)
      .where(eq(games.slug, world.gameSlug))
      .limit(1);
    if (!storedGame) throw new Error('Expected the live test game to be imported');
    await db.insert(plays).values({
      id: randomUUID(),
      clubId: world.clubIds[0]!,
      meetupTableId: table.tableId,
      gameId: storedGame.id,
      createdBy: world.owner.id,
    });

    const stale = await createLiveReader({ source: null }).readDay(world.clubIds[0]!, date);
    expect(stale.stale).toBe(true);
    expect(stale.data.tables[0]).toMatchObject({
      tableId: table.tableId,
      hostName: null,
      hasOpenPlay: true,
    });
    expect(stale.data.tables[0]?.seats).toContainEqual({
      kind: 'member',
      externalMemberId: host.externalId,
      displayName: host.nickname,
    });
  });

  it('deduplicates concurrent same-key reads and fetches again after they settle', async () => {
    const pending = deferred<ExternalMember[]>();
    const started = deferred<void>();
    let calls = 0;
    const source = sourceWith({
      fetchMembers: async () => {
        calls++;
        started.resolve(undefined);
        return calls === 1 ? pending.promise : [freshMember];
      },
    });
    const reader = createLiveReader({ source });

    const first = reader.readMembers(world.clubIds[0]!);
    const concurrent = reader.readMembers(world.clubIds[0]!);
    await started.promise;
    expect(calls).toBe(1);

    pending.resolve([freshMember]);
    const [firstResult, concurrentResult] = await Promise.all([first, concurrent]);
    expect(firstResult).toEqual(concurrentResult);
    expect(firstResult.stale).toBe(false);
    expect(firstResult.data.items).toContainEqual({
      externalId: freshMember.externalId,
      nickname: freshMember.nickname,
    });

    await reader.readMembers(world.clubIds[0]!);
    expect(calls).toBe(2);
  });

  it('does not cache a failed upstream read', async () => {
    let calls = 0;
    const source = sourceWith({
      fetchMembers: async () => {
        calls++;
        if (calls === 1) throw new Error('synthetic upstream failure');
        return [freshMember];
      },
    });
    const reader = createLiveReader({ source });

    const stale = await reader.readMembers(world.clubIds[0]!);
    const fresh = await reader.readMembers(world.clubIds[0]!);

    expect(stale).toMatchObject({
      stale: true,
      data: { items: [{ externalId: staleMember.externalId, nickname: staleMember.nickname }] },
    });
    expect(fresh.stale).toBe(false);
    expect(fresh.data.items).toContainEqual({
      externalId: freshMember.externalId,
      nickname: freshMember.nickname,
    });
    expect(calls).toBe(2);
  });

  it('logs one sanitized warning when a live fetch fails and falls back to stored data', async () => {
    const sensitiveDetails =
      'login=private-login digest=private-digest url=https://example.test/?token=private-token';
    const failure = Object.assign(new Error(sensitiveDetails), {
      name: 'DigestError',
      code: 'CLUB_DIGEST_KEY_MISSING',
    });
    const warning = vi.spyOn(logger, 'warn');
    const reader = createLiveReader({
      source: sourceWith({ fetchMembers: async () => Promise.reject(failure) }),
    });

    try {
      const result = await reader.readMembers(world.clubIds[0]!);

      expect(result.stale).toBe(true);
      expect(result.data.items).toContainEqual({
        externalId: staleMember.externalId,
        nickname: staleMember.nickname,
      });
      expect(warning).toHaveBeenCalledTimes(1);
      expect(warning.mock.calls[0]).toEqual([
        {
          clubId: world.clubIds[0],
          routeKind: 'members',
          errorName: 'DigestError',
          errorCode: 'CLUB_DIGEST_KEY_MISSING',
        },
      ]);
      expect(JSON.stringify(warning.mock.calls)).not.toContain(sensitiveDetails);
    } finally {
      warning.mockRestore();
    }
  });

  it('keeps the prior success timestamp when an upstream read later fails', async () => {
    let calls = 0;
    const reader = createLiveReader({
      source: sourceWith({
        fetchMembers: async () => {
          calls++;
          if (calls === 1) return [freshMember];
          throw new Error('synthetic upstream failure');
        },
      }),
    });

    const fresh = await reader.readMembers(world.clubIds[0]!);
    const stale = await reader.readMembers(world.clubIds[0]!);

    expect(fresh.stale).toBe(false);
    expect(fresh.lastSuccessAt).not.toBeNull();
    expect(stale.stale).toBe(true);
    expect(stale.lastSuccessAt).toBe(fresh.lastSuccessAt);
    expect(stale.data.items).toContainEqual({
      externalId: freshMember.externalId,
      nickname: freshMember.nickname,
    });
  });

  it('uses stale database members when the upstream queue is full', async () => {
    const queueFull = Object.assign(new Error('synthetic queue full'), { code: 'queue_full' });
    const reader = createLiveReader({
      source: sourceWith({ fetchMembers: async () => Promise.reject(queueFull) }),
    });

    const result = await reader.readMembers(world.clubIds[0]!);

    expect(result).toMatchObject({
      stale: true,
      data: { items: [{ externalId: staleMember.externalId, nickname: staleMember.nickname }] },
    });
  });

  it('uses stale database members after a deadline and ignores the late result', async () => {
    const pending = deferred<ExternalMember[]>();
    const reader = createLiveReader({
      source: sourceWith({ fetchMembers: async () => pending.promise }),
      timeoutMs: 10,
    });

    const result = await reader.readMembers(world.clubIds[0]!);
    expect(result).toMatchObject({
      stale: true,
      data: { items: [{ externalId: staleMember.externalId, nickname: staleMember.nickname }] },
    });

    pending.resolve([freshMember]);
    await new Promise<void>((resolve) => setImmediate(resolve));
    const rows = await db
      .select({
        externalId: clubExternalMembers.externalId,
        nickname: clubExternalMembers.nickname,
      })
      .from(clubExternalMembers)
      .where(eq(clubExternalMembers.clubId, world.clubIds[0]!));
    expect(rows).toEqual([{ externalId: staleMember.externalId, nickname: staleMember.nickname }]);
  });

  it('handles an upstream rejection that arrives after the deadline', async () => {
    const pending = deferred<ExternalMember[]>();
    const unhandledRejections: unknown[] = [];
    const onUnhandledRejection = (reason: unknown) => unhandledRejections.push(reason);
    process.on('unhandledRejection', onUnhandledRejection);

    try {
      const reader = createLiveReader({
        source: sourceWith({ fetchMembers: async () => pending.promise }),
        timeoutMs: 10,
      });
      const result = await reader.readMembers(world.clubIds[0]!);
      expect(result.stale).toBe(true);

      pending.reject(new Error('late upstream failure'));
      await new Promise<void>((resolve) => setImmediate(resolve));
    } finally {
      process.off('unhandledRejection', onUnhandledRejection);
    }

    expect(unhandledRejections).toEqual([]);
  });

  it('does not share an in-flight request between different clubs', async () => {
    const first = deferred<ExternalMember[]>();
    const second = deferred<ExternalMember[]>();
    const firstStarted = deferred<void>();
    const secondStarted = deferred<void>();
    let calls = 0;
    const source = sourceWith({
      fetchMembers: async () => {
        calls++;
        if (calls === 1) {
          firstStarted.resolve(undefined);
          return first.promise;
        }
        secondStarted.resolve(undefined);
        return second.promise;
      },
    });
    const reader = createLiveReader({ source });

    const firstRead = reader.readMembers(world.clubIds[0]!);
    const secondRead = reader.readMembers(world.clubIds[1]!);
    await Promise.all([firstStarted.promise, secondStarted.promise]);
    expect(calls).toBe(2);
    first.resolve([freshMember]);
    second.resolve([staleMember]);
    const results = await Promise.all([firstRead, secondRead]);

    expect(results[0]?.data.items[0]?.externalId).toBe(freshMember.externalId);
    expect(results[1]?.data.items[0]?.externalId).toBe(staleMember.externalId);
  });

  it('returns the last stored game catalog, including expansions, after an upstream failure', async () => {
    let calls = 0;
    const game = {
      externalId: 'catalog-game',
      name: world.gameSlug.replaceAll('-', ' '),
      year: 2018,
      owners: [],
      expansions: [{ externalId: 'catalog-expansion', name: 'Stored Expansion' }],
    };
    const reader = createLiveReader({
      source: sourceWith({
        fetchGames: async () => {
          calls++;
          if (calls > 1) throw new Error('synthetic upstream failure');
          return [game];
        },
      }),
    });

    const fresh = await reader.readGames(world.clubIds[0]!);
    const stale = await reader.readGames(world.clubIds[0]!);

    expect(fresh.stale).toBe(false);
    expect(stale).toMatchObject({
      stale: true,
      data: {
        items: [
          {
            externalId: game.externalId,
            name: game.name,
            year: game.year,
            expansions: game.expansions,
          },
        ],
      },
    });
  });

  it('reuses the source instance for the same plugin path and base URL', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'external-club-singleton-'));
    const pluginPath = join(directory, 'plugin.mjs');
    const counterKey = `externalClubFactoryCalls_${randomUUID().replaceAll('-', '')}`;
    const globals = globalThis as unknown as Record<string, unknown>;
    globals[counterKey] = 0;
    try {
      await writeFile(
        pluginPath,
        `export const createSource = () => {
          const key = ${JSON.stringify(counterKey)};
          globalThis[key] = (globalThis[key] ?? 0) + 1;
          return {
            source: 'singleton-test',
            listGames: async () => [],
            listMembers: async () => [],
            listDays: async () => [],
          };
        };`,
      );
      const config = {
        EXTERNAL_CLUB_PLUGIN: pluginPath,
        EXTERNAL_CLUB_BASE_URL: 'https://example.test',
      };

      const first = await loadExternalClubSource(config);
      const second = await loadExternalClubSource(config);

      expect(first).not.toBeNull();
      expect(second).toBe(first);
      expect(globals[counterKey]).toBe(1);
    } finally {
      delete globals[counterKey];
      await rm(directory, { recursive: true, force: true });
    }
  });
});
