import { createHash, randomBytes } from 'node:crypto';
import { eq, inArray, or } from 'drizzle-orm';
import { createApp } from '../app.js';
import { db } from '../db/client.js';
import {
  clubMembers,
  clubs,
  games,
  identities,
  meetupParticipants,
  meetups,
  meetupTables,
  plays,
  provinces,
  scoreTemplates,
  users,
} from '../db/schema/index.js';
import type { SessionUser } from '../types.js';
import { fakeAuth, fakeUser } from './fake-auth.js';
import { scoreTemplateFixture } from './score-template-fixture.js';

export type App = ReturnType<typeof createApp>;

export interface World {
  stamp: number;
  users: Record<'owner' | 'admin' | 'host' | 'seated' | 'other' | 'outsider', SessionUser>;
  clubId: string;
  meetupId: string;
  tableId: string;
  gameId: string;
  templateId: string;
  appFor: (u: SessionUser | null) => App;
  cleanup: () => Promise<void>;
}

const JSON_HEADERS = { 'content-type': 'application/json' };

export const send = (app: App, method: string, path: string, body?: unknown) =>
  app.request(path, {
    method,
    headers: JSON_HEADERS,
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });

/** Club with owner/admin/host/seated/other members, one club Kèo with a 6-seat table (host +
 * seated), a game and an approved score template. `outsider` belongs to no club. */
export async function createWorld(tag: string): Promise<World> {
  const stamp = Date.now() + Math.floor(Math.random() * 1000);
  const mk = (name: string) => ({
    ...fakeUser('user'),
    id: `u-${tag}-${name}-${stamp}`,
    name: `${tag} ${name}`,
    email: `${tag}-${name}-${stamp}@example.test`,
    username: `${tag}_${name}_${stamp}`,
  });
  const u = {
    owner: mk('owner'),
    admin: mk('admin'),
    host: mk('host'),
    seated: mk('seated'),
    other: mk('other'),
    outsider: mk('outsider'),
  };
  await db.insert(users).values(Object.values(u));
  const province = { code: `pw-p-${stamp}`, name: 'PW Test', slug: `pw-tinh-${stamp}` };
  await db.insert(provinces).values(province);
  const [club] = await db
    .insert(clubs)
    .values({
      slug: `pw-club-${stamp}`,
      name: `PW Club ${stamp}`,
      inviteCodeHash: createHash('sha256').update(randomBytes(8)).digest('hex'),
      createdBy: u.owner.id,
    })
    .returning();
  await db.insert(clubMembers).values([
    { clubId: club!.id, userId: u.owner.id, role: 'owner' },
    { clubId: club!.id, userId: u.admin.id, role: 'admin' },
    { clubId: club!.id, userId: u.host.id, role: 'member' },
    { clubId: club!.id, userId: u.seated.id, role: 'member' },
    { clubId: club!.id, userId: u.other.id, role: 'member' },
  ]);
  const [meetup] = await db
    .insert(meetups)
    .values({
      slug: `pw-keo-${stamp}`,
      title: `PW Kèo ${stamp}`,
      startsAt: new Date(Date.now() + 2 * 24 * 3600 * 1000),
      addressLine: '1 Test',
      provinceCode: province.code,
      visibility: 'club',
      clubId: club!.id,
      inviteCodeHash: createHash('sha256').update(randomBytes(8)).digest('hex'),
      createdBy: u.host.id,
    })
    .returning();
  const [game] = await db
    .insert(games)
    .values({ slug: `pw-game-${stamp}`, nameEn: `PW Game ${stamp}` })
    .returning();
  const [table] = await db
    .insert(meetupTables)
    .values({
      meetupId: meetup!.id,
      hostUserId: u.host.id,
      gameId: game!.id,
      seats: 6,
      position: 1,
    })
    .returning();
  await db.insert(meetupParticipants).values(
    [u.host, u.seated].map((p) => ({
      meetupId: meetup!.id,
      userId: p.id,
      status: 'going' as const,
      tableId: table!.id,
    })),
  );
  const [template] = await db
    .insert(scoreTemplates)
    .values({
      gameId: game!.id,
      version: 1,
      status: 'approved',
      definition: scoreTemplateFixture(),
      confidence: 'high',
      needsReview: false,
      sources: [],
    })
    .returning();

  const userIds = Object.values(u).map((x) => x.id);
  return {
    stamp,
    users: u,
    clubId: club!.id,
    meetupId: meetup!.id,
    tableId: table!.id,
    gameId: game!.id,
    templateId: template!.id,
    appFor: (user) => createApp({ auth: fakeAuth(user), rateLimit: false }),
    cleanup: async () => {
      await db.delete(plays).where(eq(plays.gameId, game!.id));
      await db
        .delete(identities)
        .where(or(inArray(identities.userId, userIds), eq(identities.clubId, club!.id)));
      await db.delete(meetups).where(eq(meetups.clubId, club!.id));
      await db.delete(clubs).where(eq(clubs.id, club!.id));
      await db.delete(users).where(inArray(users.id, userIds));
      await db.delete(games).where(eq(games.id, game!.id));
      await db.delete(provinces).where(eq(provinces.code, province.code));
    },
  };
}
