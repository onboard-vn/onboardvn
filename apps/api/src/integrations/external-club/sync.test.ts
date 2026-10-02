import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { and, eq, inArray, like } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { db, pool } from '../../db/client.js';
import {
  clubExternalMembers,
  clubExternalOwnerships,
  clubs,
  externalRefs,
  gameExternalMetadata,
  games,
  identities,
  meetupParticipants,
  meetupTableIdentities,
  meetupTables,
  meetups,
  provinces,
  users,
} from '../../db/schema/index.js';
import { fakeUser } from '../../test/fake-auth.js';
import { loadExternalClubSource } from './loader.js';
import { syncExternalClub } from './sync.js';
import type { ExternalClubSource, ExternalDay, ExternalGame, ExternalMember } from './types.js';

const stamp = Date.now();
const SOURCE = `fake_${stamp}`;
const PROVINCE = { code: `ext-p-${stamp}`, name: 'Ext Test', slug: `ext-tinh-${stamp}` };
const owner = {
  ...fakeUser('user'),
  id: `u-ext-owner-${stamp}`,
  email: `ext-owner-${stamp}@example.test`,
  username: `ext_owner_${stamp}`,
};
const linkedUser = {
  ...fakeUser('user'),
  id: `u-ext-linked-${stamp}`,
  email: `ext-linked-${stamp}@example.test`,
  username: `ext_linked_${stamp}`,
};
const CLUB_SLUG = `ext-club-${stamp}`;
const GAME_PREFIX = `extgame${stamp}`;
let clubId = '';
let preexistingGameId = '';

const members: ExternalMember[] = [
  { externalId: 'm1', nickname: 'Member One', stats: { hosted: 2 }, loginId: 'login-1' },
  { externalId: 'm2', nickname: 'Member Two', stats: {} },
  { externalId: 'm3', nickname: 'Member Three', stats: {} },
];

const catalog: ExternalGame[] = [
  {
    externalId: 'g1',
    name: `${GAME_PREFIX} Alpha`,
    year: 2020,
    minPlayers: 2,
    maxPlayers: 4,
    owners: [{ externalMemberId: 'm1' }, { externalMemberId: 'm2' }],
    expansions: [{ externalId: 'e1', name: 'Alpha Plus' }],
  },
  {
    externalId: 'g2',
    name: `${GAME_PREFIX} Beta`,
    owners: [{ externalMemberId: 'm3' }],
    expansions: [],
  },
  {
    externalId: 'g3',
    name: `${GAME_PREFIX} Pre Existing`,
    owners: [],
    expansions: [],
  },
];

const day = (tables: ExternalDay['tables'], date = '2026-09-10'): ExternalDay => ({
  date,
  venue: 'Test Cafe',
  note: 'bring snacks',
  tables,
});

const baseTables: ExternalDay['tables'] = [
  {
    externalId: 't1',
    gameExternalId: 'g1',
    gameName: `${GAME_PREFIX} Alpha`,
    startsAt: '2026-09-10T12:00:00.000Z',
    endsAt: '2026-09-10T15:00:00.000Z',
    maxPlayers: 4,
    players: [{ externalMemberId: 'm1' }, { externalMemberId: 'm2' }],
    status: 'confirmed',
  },
  {
    externalId: 't2',
    gameName: 'Vote pending',
    players: [{ externalMemberId: 'm3' }],
    status: 'poll',
  },
];

function fakeSource(state: { days: ExternalDay[]; games?: ExternalGame[] }): ExternalClubSource {
  return {
    source: SOURCE,
    listGames: async () => state.games ?? catalog,
    listMembers: async () => members,
    listDays: async () => state.days,
  };
}

const counts = async () => ({
  members: (
    await db.select().from(clubExternalMembers).where(eq(clubExternalMembers.clubId, clubId))
  ).length,
  ownerships: (
    await db.select().from(clubExternalOwnerships).where(eq(clubExternalOwnerships.clubId, clubId))
  ).length,
  meetups: (await db.select().from(meetups).where(eq(meetups.clubId, clubId))).length,
  tables: (
    await db
      .select({ id: meetupTables.id })
      .from(meetupTables)
      .innerJoin(meetups, eq(meetups.id, meetupTables.meetupId))
      .where(eq(meetups.clubId, clubId))
  ).length,
  refs: (await db.select().from(externalRefs).where(eq(externalRefs.source, SOURCE))).length,
});

beforeAll(async () => {
  await db.insert(users).values([owner, linkedUser]).onConflictDoNothing({ target: users.id });
  await db.insert(provinces).values(PROVINCE).onConflictDoNothing();
  const [club] = await db
    .insert(clubs)
    .values({
      slug: CLUB_SLUG,
      name: 'Ext Club',
      provinceCode: PROVINCE.code,
      inviteCodeHash: `hash-${stamp}`,
      createdBy: owner.id,
    })
    .returning({ id: clubs.id });
  clubId = club!.id;
  const [game] = await db
    .insert(games)
    .values({ slug: `${GAME_PREFIX}-pre-existing`, nameEn: 'Pre Existing' })
    .returning({ id: games.id });
  preexistingGameId = game!.id;
});

afterAll(async () => {
  await db.delete(meetups).where(eq(meetups.clubId, clubId));
  await db.delete(clubs).where(eq(clubs.id, clubId));
  await db.delete(externalRefs).where(eq(externalRefs.source, SOURCE));
  await db.delete(games).where(like(games.slug, `${GAME_PREFIX}%`));
  await db.delete(users).where(inArray(users.id, [owner.id, linkedUser.id]));
  await db.delete(provinces).where(eq(provinces.code, PROVINCE.code));
  await pool.end();
});

describe('syncExternalClub', () => {
  it('dry run reports changes without writing', async () => {
    const report = await syncExternalClub(fakeSource({ days: [day(baseTables)] }), {
      clubSlug: CLUB_SLUG,
      dryRun: true,
    });
    expect(report.members.created).toBe(3);
    expect(report.games.created).toBe(2);
    expect(report.games.linked).toBe(1);
    expect(report.meetups.created).toBe(1);
    expect(report.tables.created).toBe(2);
    expect(await counts()).toEqual({ members: 0, ownerships: 0, meetups: 0, tables: 0, refs: 0 });
    expect(
      await db
        .select()
        .from(games)
        .where(like(games.slug, `${GAME_PREFIX}-alpha`)),
    ).toHaveLength(0);
  });

  it('imports members, games, ownerships and club Kèo with tables', async () => {
    const report = await syncExternalClub(fakeSource({ days: [day(baseTables)] }), {
      clubSlug: CLUB_SLUG,
    });
    expect(report.ownerships.added).toBe(3);
    expect(await counts()).toEqual({ members: 3, ownerships: 3, meetups: 1, tables: 2, refs: 3 });

    const [meetup] = await db.select().from(meetups).where(eq(meetups.clubId, clubId));
    expect(meetup).toMatchObject({
      visibility: 'club',
      addressLine: 'Test Cafe',
      description: 'bring snacks',
    });
    expect(meetup!.startsAt.toISOString()).toBe('2026-09-10T12:00:00.000Z');
    expect(meetup!.endsAt?.toISOString()).toBe('2026-09-10T15:00:00.000Z');

    const [preexisting] = await db
      .select()
      .from(gameExternalMetadata)
      .where(
        and(eq(gameExternalMetadata.source, SOURCE), eq(gameExternalMetadata.externalId, 'g3')),
      );
    expect(preexisting?.gameId).toBe(preexistingGameId);

    const [m1] = await db
      .select()
      .from(clubExternalMembers)
      .where(and(eq(clubExternalMembers.clubId, clubId), eq(clubExternalMembers.externalId, 'm1')));
    expect(m1?.externalLoginId).toBe('login-1');
  });

  it('is idempotent on a second run', async () => {
    const before = await counts();
    const report = await syncExternalClub(fakeSource({ days: [day(baseTables)] }), {
      clubSlug: CLUB_SLUG,
    });
    expect(report.members).toEqual({ created: 0, updated: 0, unchanged: 3 });
    expect(report.games).toEqual({ created: 0, linked: 0, unchanged: 3 });
    expect(report.ownerships).toEqual({ added: 0, removed: 0 });
    expect(report.meetups).toEqual({ created: 0, updated: 0, unchanged: 1 });
    expect(report.tables).toEqual({ created: 0, updated: 0, unchanged: 2, removed: 0 });
    expect(await counts()).toEqual(before);
  });

  it('seats external players without fake users and links matched users', async () => {
    const [seats] = await db
      .select()
      .from(meetupTableIdentities)
      .innerJoin(meetupTables, eq(meetupTables.id, meetupTableIdentities.tableId))
      .innerJoin(meetups, eq(meetups.id, meetupTables.meetupId))
      .where(eq(meetups.clubId, clubId))
      .limit(1);
    expect(seats).toBeDefined();
    expect(
      await db
        .select()
        .from(users)
        .where(like(users.email, `%${stamp}%`)),
    ).toHaveLength(2);

    await db
      .update(clubExternalMembers)
      .set({ userId: linkedUser.id })
      .where(and(eq(clubExternalMembers.clubId, clubId), eq(clubExternalMembers.externalId, 'm2')));
    const report = await syncExternalClub(fakeSource({ days: [day(baseTables)] }), {
      clubSlug: CLUB_SLUG,
    });
    expect(report.participantsAdded).toBe(1);
    const participants = await db
      .select()
      .from(meetupParticipants)
      .where(eq(meetupParticipants.userId, linkedUser.id));
    expect(participants).toHaveLength(1);
    expect(participants[0]).toMatchObject({ status: 'going' });
    expect(participants[0]!.tableId).not.toBeNull();
    const [linkedIdentity] = await db
      .select()
      .from(identities)
      .where(and(eq(identities.clubId, clubId), eq(identities.externalId, 'm2')));
    expect(linkedIdentity).toMatchObject({ kind: 'external', userId: linkedUser.id });
  });

  it('updates changed tables and removes tables that vanished at the source', async () => {
    const changed = [{ ...baseTables[0]!, players: [{ externalMemberId: 'm1' }] }];
    const report = await syncExternalClub(fakeSource({ days: [day(changed)] }), {
      clubSlug: CLUB_SLUG,
    });
    expect(report.tables).toMatchObject({ updated: 1, removed: 1, created: 0 });
    expect((await counts()).tables).toBe(1);
    expect((await counts()).refs).toBe(2);
  });

  it('imports anonymous guests as seated guest identities, idempotently', async () => {
    const withGuest = [
      { ...baseTables[0]!, guests: [{ externalId: 'x1', invitedByExternalMemberId: 'm1' }] },
    ];
    const report = await syncExternalClub(fakeSource({ days: [day(withGuest)] }), {
      clubSlug: CLUB_SLUG,
    });
    expect(report.guests).toEqual({ created: 1, updated: 0, unchanged: 0 });
    const [guest] = await db
      .select()
      .from(identities)
      .where(and(eq(identities.clubId, clubId), eq(identities.externalId, 'x1')));
    const [inviter] = await db
      .select()
      .from(identities)
      .where(and(eq(identities.clubId, clubId), eq(identities.externalId, 'm1')));
    expect(guest).toMatchObject({
      kind: 'guest',
      displayName: 'Bạn của Member One',
      invitedByIdentityId: inviter!.id,
      externalSource: SOURCE,
    });
    const seat = await db
      .select()
      .from(meetupTableIdentities)
      .where(eq(meetupTableIdentities.identityId, guest!.id));
    expect(seat).toHaveLength(1);

    const again = await syncExternalClub(fakeSource({ days: [day(withGuest)] }), {
      clubSlug: CLUB_SLUG,
    });
    expect(again.guests).toEqual({ created: 0, updated: 0, unchanged: 1 });
    expect(again.tables).toMatchObject({ created: 0, updated: 0 });

    await syncExternalClub(fakeSource({ days: [day([baseTables[0]!])] }), { clubSlug: CLUB_SLUG });
    expect(
      await db
        .select()
        .from(meetupTableIdentities)
        .where(eq(meetupTableIdentities.identityId, guest!.id)),
    ).toHaveLength(0);
  });

  it('ignores days before --from', async () => {
    const report = await syncExternalClub(fakeSource({ days: [day(baseTables, '2026-01-01')] }), {
      clubSlug: CLUB_SLUG,
      from: '2026-02-01',
    });
    expect(report.meetups).toEqual({ created: 0, updated: 0, unchanged: 0 });
  });

  it('fails on unknown club and rolls back everything', async () => {
    await expect(
      syncExternalClub(fakeSource({ days: [] }), { clubSlug: 'missing-club' }),
    ).rejects.toThrow('Club not found');
  });
});

describe('loadExternalClubSource', () => {
  it('is disabled without plugin config', async () => {
    expect(await loadExternalClubSource({})).toBeNull();
    expect(await loadExternalClubSource({ EXTERNAL_CLUB_PLUGIN: '/x.mjs' })).toBeNull();
  });

  it('rejects relative plugin paths', async () => {
    await expect(
      loadExternalClubSource({
        EXTERNAL_CLUB_PLUGIN: 'plugin.mjs',
        EXTERNAL_CLUB_BASE_URL: 'https://example.test',
      }),
    ).rejects.toThrow('absolute');
  });

  it('loads a plugin module and validates its output', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'ext-club-'));
    const file = join(dir, 'plugin.mjs');
    await writeFile(
      file,
      `export const createSource = ({ baseUrl }) => ({
        source: 'plugin_' + baseUrl.length,
        listGames: async () => [{ externalId: 'x', owners: [], expansions: [] }],
        listMembers: async () => [{ externalId: 'm', nickname: 'N' }],
        listDays: async () => [],
      });`,
    );
    const source = await loadExternalClubSource({
      EXTERNAL_CLUB_PLUGIN: file,
      EXTERNAL_CLUB_BASE_URL: 'https://example.test',
    });
    expect(source?.source).toBe('plugin_20');
    expect(await source!.listMembers()).toEqual([{ externalId: 'm', nickname: 'N', stats: {} }]);
    await expect(source!.listGames()).rejects.toThrow();
  });
});
