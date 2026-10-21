import { randomUUID } from 'node:crypto';
import { and, eq } from 'drizzle-orm';
import { afterAll, afterEach, beforeEach, describe, expect, it } from 'vitest';
import { db, pool } from '../../db/client.js';
import {
  clubExternalMembers,
  clubExternalOwnerships,
  clubs,
  externalRefs,
  games,
  meetupParticipants,
  meetupTableIdentities,
  meetupTables,
  meetups,
  plays,
  provinces,
  users,
} from '../../db/schema/index.js';
import { fakeUser } from '../../test/fake-auth.js';
import { buildSyncContext, syncExternalClub } from './sync.js';
import { createLiveReader } from './live-fetch.js';
import { syncDays } from './sync-days.js';
import type { ExternalClubSource, ExternalDay, ExternalGame, ExternalMember } from './types.js';

type World = {
  sourceId: string;
  clubId: string;
  clubSlug: string;
  provinceCode: string;
  gameSlug: string;
  owner: ReturnType<typeof fakeUser>;
  linkedUser: ReturnType<typeof fakeUser>;
  members: ExternalMember[];
  game: ExternalGame;
  source(
    days: ExternalDay[],
    options?: { members?: ExternalMember[]; games?: ExternalGame[] },
  ): ExternalClubSource;
};

let world: World;

function makeWorld(): World {
  const key = randomUUID().replaceAll('-', '');
  const sourceId = `freeze_test_${key}`;
  const clubSlug = `freeze-test-${key}`;
  const provinceCode = `freeze-${key}`;
  const gameSlug = `freeze-test-${key}`;
  const owner = {
    ...fakeUser('user'),
    id: `u-freeze-owner-${key}`,
    email: `freeze-owner-${key}@example.test`,
    username: `freeze_owner_${key}`,
  };
  const linkedUser = {
    ...fakeUser('user'),
    id: `u-freeze-linked-${key}`,
    email: `freeze-linked-${key}@example.test`,
    username: `freeze_linked_${key}`,
  };
  const members: ExternalMember[] = [
    { externalId: 'member-1', nickname: 'Member One', stats: {} },
    { externalId: 'member-2', nickname: 'Member Two', stats: {} },
  ];
  const game: ExternalGame = {
    externalId: 'game-1',
    name: `Freeze Test ${key}`,
    owners: members.map((member) => ({ externalMemberId: member.externalId })),
    expansions: [],
  };

  return {
    sourceId,
    clubId: '',
    clubSlug,
    provinceCode,
    gameSlug,
    owner,
    linkedUser,
    members,
    game,
    source: (days, options = {}) => ({
      source: sourceId,
      listGames: async () => options.games ?? [game],
      listMembers: async () => options.members ?? members,
      listDays: async () => days,
    }),
  };
}

function testDay(
  table: Partial<ExternalDay['tables'][number]> = {},
  tables: ExternalDay['tables'] | null = null,
): ExternalDay {
  return {
    date: '2026-10-21',
    venue: 'Synthetic test venue',
    note: null,
    tables: tables ?? [
      {
        externalId: 'table-1',
        hostExternalMemberId: 'member-1',
        gameExternalId: 'game-1',
        gameName: 'Freeze test game',
        note: 'original note',
        minPlayers: 2,
        maxPlayers: 4,
        players: [{ externalMemberId: 'member-1' }, { externalMemberId: 'member-2' }],
        status: 'confirmed',
        ...table,
      },
    ],
  };
}

async function tableRow() {
  const [ref] = await db
    .select({ internalId: externalRefs.internalId })
    .from(externalRefs)
    .where(
      and(
        eq(externalRefs.source, world.sourceId),
        eq(externalRefs.kind, 'meetup_table'),
        eq(externalRefs.externalId, 'table-1'),
      ),
    );
  const [table] = await db.select().from(meetupTables).where(eq(meetupTables.id, ref!.internalId));
  return table!;
}

async function seatIds(tableId: string): Promise<string[]> {
  return (
    await db
      .select({ identityId: meetupTableIdentities.identityId })
      .from(meetupTableIdentities)
      .where(eq(meetupTableIdentities.tableId, tableId))
  )
    .map((row) => row.identityId)
    .sort();
}

async function seedWorld() {
  await db.insert(users).values([world.owner, world.linkedUser]);
  await db.insert(provinces).values({
    code: world.provinceCode,
    name: 'Freeze Test Province',
    slug: world.provinceCode,
  });
  const [club] = await db
    .insert(clubs)
    .values({
      slug: world.clubSlug,
      name: 'Freeze Test Club',
      provinceCode: world.provinceCode,
      inviteCodeHash: `hash-${world.sourceId}`,
      externalSource: world.sourceId,
      createdBy: world.owner.id,
    })
    .returning({ id: clubs.id });
  world.clubId = club!.id;
}

async function cleanupWorld() {
  await db.delete(plays).where(eq(plays.clubId, world.clubId));
  await db.delete(meetups).where(eq(meetups.clubId, world.clubId));
  await db.delete(externalRefs).where(eq(externalRefs.source, world.sourceId));
  await db.delete(clubs).where(eq(clubs.id, world.clubId));
  await db.delete(games).where(eq(games.slug, world.gameSlug));
  await db.delete(users).where(eq(users.id, world.owner.id));
  await db.delete(users).where(eq(users.id, world.linkedUser.id));
  await db.delete(provinces).where(eq(provinces.code, world.provinceCode));
}

beforeEach(async () => {
  world = makeWorld();
  await seedWorld();
});

afterEach(async () => {
  await cleanupWorld();
});

afterAll(async () => {
  await pool.end();
});

describe('external club sync freeze guards', () => {
  it('serializes concurrent first imports of the same day', async () => {
    const source = world.source([testDay({}, [])], { members: [], games: [] });

    await Promise.all([
      syncExternalClub(source, { clubSlug: world.clubSlug }),
      syncExternalClub(source, { clubSlug: world.clubSlug }),
    ]);

    const meetupsForClub = await db
      .select({ id: meetups.id })
      .from(meetups)
      .where(eq(meetups.clubId, world.clubId));
    const meetupRefs = await db
      .select({ internalId: externalRefs.internalId })
      .from(externalRefs)
      .where(
        and(
          eq(externalRefs.source, world.sourceId),
          eq(externalRefs.kind, 'meetup'),
          eq(externalRefs.externalId, '2026-10-21'),
        ),
      );

    expect(meetupsForClub).toHaveLength(1);
    expect(meetupRefs).toHaveLength(1);
    expect(meetupRefs[0]!.internalId).toBe(meetupsForClub[0]!.id);
  });

  it('serializes concurrent table creation for an existing empty day', async () => {
    await syncExternalClub(world.source([testDay({}, [])]), { clubSlug: world.clubSlug });
    const source = world.source([testDay()]);

    await Promise.all([
      syncExternalClub(source, { clubSlug: world.clubSlug }),
      syncExternalClub(source, { clubSlug: world.clubSlug }),
    ]);

    const refs = await db
      .select({ internalId: externalRefs.internalId })
      .from(externalRefs)
      .where(
        and(
          eq(externalRefs.source, world.sourceId),
          eq(externalRefs.kind, 'meetup_table'),
          eq(externalRefs.externalId, 'table-1'),
        ),
      );
    const [meetupRef] = await db
      .select({ internalId: externalRefs.internalId })
      .from(externalRefs)
      .where(
        and(
          eq(externalRefs.source, world.sourceId),
          eq(externalRefs.kind, 'meetup'),
          eq(externalRefs.externalId, '2026-10-21'),
        ),
      );
    expect(refs).toHaveLength(1);
    expect(
      await db.select().from(meetupTables).where(eq(meetupTables.meetupId, meetupRef!.internalId)),
    ).toHaveLength(1);
  });

  it('preserves table fields, seats and participants while a draft play exists and counts the skip', async () => {
    const source = world.source([testDay()]);
    await syncExternalClub(source, { clubSlug: world.clubSlug });
    await db
      .update(clubExternalMembers)
      .set({ userId: world.linkedUser.id })
      .where(
        and(
          eq(clubExternalMembers.clubId, world.clubId),
          eq(clubExternalMembers.externalId, 'member-2'),
        ),
      );
    await syncExternalClub(source, { clubSlug: world.clubSlug });

    const before = await tableRow();
    const seatsBefore = await seatIds(before.id);
    const [participantBefore] = await db
      .select()
      .from(meetupParticipants)
      .where(
        and(
          eq(meetupParticipants.meetupId, before.meetupId),
          eq(meetupParticipants.userId, world.linkedUser.id),
        ),
      );
    expect(seatsBefore).toHaveLength(2);
    expect(participantBefore?.tableId).toBe(before.id);

    await db.insert(plays).values({
      id: randomUUID(),
      clubId: world.clubId,
      meetupTableId: before.id,
      gameId: before.gameId!,
      createdBy: world.owner.id,
      status: 'draft',
    });
    const changed = testDay({
      note: 'changed note',
      maxPlayers: 5,
      players: [{ externalMemberId: 'member-1' }],
    });

    const report = await syncExternalClub(world.source([changed]), { clubSlug: world.clubSlug });

    expect(report.tables.skipped).toBe(1);
    const after = await tableRow();
    expect(after.seats).toBe(before.seats);
    expect(after.note).toBe(before.note);
    expect(await seatIds(after.id)).toEqual(seatsBefore);
    const [participantAfter] = await db
      .select()
      .from(meetupParticipants)
      .where(
        and(
          eq(meetupParticipants.meetupId, after.meetupId),
          eq(meetupParticipants.userId, world.linkedUser.id),
        ),
      );
    expect(participantAfter?.tableId).toBe(after.id);
  });

  it('keeps a table with a finished play when that table disappears upstream', async () => {
    const source = world.source([testDay()]);
    await syncExternalClub(source, { clubSlug: world.clubSlug });
    const table = await tableRow();
    await db.insert(plays).values({
      id: randomUUID(),
      clubId: world.clubId,
      meetupTableId: table.id,
      gameId: table.gameId!,
      createdBy: world.owner.id,
      status: 'final',
      endedAt: new Date(),
    });

    const report = await syncExternalClub(world.source([testDay({}, [])]), {
      clubSlug: world.clubSlug,
    });

    expect(report.tables.removed).toBe(0);
    expect(report.tables.skipped).toBe(1);
    expect(await db.select().from(meetupTables).where(eq(meetupTables.id, table.id))).toHaveLength(
      1,
    );
  });

  it('does not remove imported seats when the sync member map is empty', async () => {
    await syncExternalClub(world.source([testDay()]), { clubSlug: world.clubSlug });
    const table = await tableRow();
    const before = await seatIds(table.id);

    await db.transaction(async (tx) => {
      const ctx = await buildSyncContext(tx, world.sourceId, world.clubSlug);
      await syncDays(ctx, [testDay()]);
    });

    expect(await seatIds(table.id)).toEqual(before);
  });

  it('does not remove ownership rows during a games-only live read', async () => {
    await syncExternalClub(world.source([testDay()]), { clubSlug: world.clubSlug });
    const before = await db
      .select()
      .from(clubExternalOwnerships)
      .where(eq(clubExternalOwnerships.clubId, world.clubId));
    expect(before).toHaveLength(2);

    const source: ExternalClubSource = {
      ...world.source([]),
      fetchGames: async () => [{ ...world.game, owners: [] }],
    };
    const result = await createLiveReader({ source }).readGames(world.clubId);

    const after = await db
      .select()
      .from(clubExternalOwnerships)
      .where(eq(clubExternalOwnerships.clubId, world.clubId));
    expect(after).toHaveLength(2);
    expect(result.data.items[0]?.owners).toEqual([
      { externalMemberId: 'member-1' },
      { externalMemberId: 'member-2' },
    ]);
  });
});
