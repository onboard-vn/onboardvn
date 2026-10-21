import { randomUUID } from 'node:crypto';
import { and, eq } from 'drizzle-orm';
import { afterAll, afterEach, beforeEach, describe, expect, it } from 'vitest';
import { db, pool } from '../../db/client.js';
import {
  clubExternalMembers,
  clubs,
  externalRefs,
  games,
  meetupTables,
  meetups,
  plays,
  provinces,
  users,
} from '../../db/schema/index.js';
import { fakeUser } from '../../test/fake-auth.js';
import { syncExternalClub } from './sync.js';
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
  source(days: ExternalDay[]): ExternalClubSource;
};

let world: World;

function makeWorld(): World {
  const key = randomUUID().replaceAll('-', '');
  const sourceId = `host_test_${key}`;
  const clubSlug = `host-test-${key}`;
  const provinceCode = `host-${key}`;
  const gameSlug = `host-test-${key}`;
  const owner = {
    ...fakeUser('user'),
    id: `u-host-owner-${key}`,
    email: `host-owner-${key}@example.test`,
    username: `host_owner_${key}`,
  };
  const linkedUser = {
    ...fakeUser('user'),
    id: `u-host-linked-${key}`,
    email: `host-linked-${key}@example.test`,
    username: `host_linked_${key}`,
  };
  const members: ExternalMember[] = [
    { externalId: 'member-1', nickname: 'Member One', stats: {} },
    { externalId: 'member-2', nickname: 'Member Two', stats: {} },
  ];
  const game: ExternalGame = {
    externalId: 'game-1',
    name: `Host Test ${key}`,
    owners: [],
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
    source: (days) => ({
      source: sourceId,
      listGames: async () => [game],
      listMembers: async () => members,
      listDays: async () => days,
    }),
  };
}

function testDay(hostExternalMemberId: string | null): ExternalDay {
  return {
    date: '2026-10-21',
    venue: 'Synthetic test venue',
    note: null,
    tables: [
      {
        externalId: 'table-1',
        hostExternalMemberId,
        gameExternalId: 'game-1',
        gameName: 'Host test game',
        note: null,
        maxPlayers: 4,
        players: [{ externalMemberId: 'member-1' }, { externalMemberId: 'member-2' }],
        status: 'confirmed',
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

beforeEach(async () => {
  world = makeWorld();
  await db.insert(users).values([world.owner, world.linkedUser]);
  await db.insert(provinces).values({
    code: world.provinceCode,
    name: 'Host Test Province',
    slug: world.provinceCode,
  });
  const [club] = await db
    .insert(clubs)
    .values({
      slug: world.clubSlug,
      name: 'Host Test Club',
      provinceCode: world.provinceCode,
      inviteCodeHash: `hash-${world.sourceId}`,
      externalSource: world.sourceId,
      createdBy: world.owner.id,
    })
    .returning({ id: clubs.id });
  world.clubId = club!.id;
});

afterEach(async () => {
  await db.delete(plays).where(eq(plays.clubId, world.clubId));
  await db.delete(meetups).where(eq(meetups.clubId, world.clubId));
  await db.delete(externalRefs).where(eq(externalRefs.source, world.sourceId));
  await db.delete(clubs).where(eq(clubs.id, world.clubId));
  await db.delete(games).where(eq(games.slug, world.gameSlug));
  await db.delete(users).where(eq(users.id, world.owner.id));
  await db.delete(users).where(eq(users.id, world.linkedUser.id));
  await db.delete(provinces).where(eq(provinces.code, world.provinceCode));
});

afterAll(async () => {
  await pool.end();
});

describe('external club host synchronization', () => {
  it('maps a linked external host to the linked user', async () => {
    const source = world.source([testDay('member-1')]);
    await syncExternalClub(source, { clubSlug: world.clubSlug });
    await db
      .update(clubExternalMembers)
      .set({ userId: world.linkedUser.id })
      .where(
        and(
          eq(clubExternalMembers.clubId, world.clubId),
          eq(clubExternalMembers.externalId, 'member-1'),
        ),
      );

    await syncExternalClub(source, { clubSlug: world.clubSlug });

    expect((await tableRow()).hostUserId).toBe(world.linkedUser.id);
  });

  it('keeps the importer as host when the external host is unlinked', async () => {
    await syncExternalClub(world.source([testDay('member-1')]), { clubSlug: world.clubSlug });

    expect((await tableRow()).hostUserId).toBe(world.owner.id);
  });

  it('defers a new host link while a draft play exists, then applies it on a later sync', async () => {
    const source = world.source([testDay('member-1')]);
    await syncExternalClub(source, { clubSlug: world.clubSlug });
    const table = await tableRow();
    await db.insert(plays).values({
      id: randomUUID(),
      clubId: world.clubId,
      meetupTableId: table.id,
      gameId: table.gameId!,
      createdBy: world.owner.id,
      status: 'draft',
    });
    await db
      .update(clubExternalMembers)
      .set({ userId: world.linkedUser.id })
      .where(
        and(
          eq(clubExternalMembers.clubId, world.clubId),
          eq(clubExternalMembers.externalId, 'member-1'),
        ),
      );

    const skipped = await syncExternalClub(source, { clubSlug: world.clubSlug });
    expect(skipped.tables.skipped).toBe(1);
    expect((await tableRow()).hostUserId).toBe(world.owner.id);

    await db.delete(plays).where(and(eq(plays.clubId, world.clubId), eq(plays.status, 'draft')));
    await syncExternalClub(source, { clubSlug: world.clubSlug });

    expect((await tableRow()).hostUserId).toBe(world.linkedUser.id);
  });
});
