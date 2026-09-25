import { createHash } from 'node:crypto';
import { and, eq, inArray } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../../app.js';
import { db, pool } from '../../db/client.js';
import {
  cafes,
  friendships,
  games,
  meetupParticipants,
  meetups,
  meetupTables,
  provinces,
  userBlocks,
  userGames,
  users,
  wards,
} from '../../db/schema/index.js';
import { fakeAuth, fakeUser } from '../../test/fake-auth.js';
import type { SessionUser } from '../../types.js';
import { goingMeetupIdsForUser, promoteWaitlistForMeetups } from './service.js';

const stamp = Date.now();
const PROVINCE = {
  code: `p6-t1-${stamp}`,
  name: 'Tỉnh Kèo Test',
  slug: `p6-tinh-keo-test-${stamp}`,
};
const WARD = {
  code: `p6-w1-${stamp}`,
  provinceCode: PROVINCE.code,
  name: 'Phường Kèo',
  slug: `p6-phuong-keo-${stamp}`,
};

function user(tag: string) {
  return {
    ...fakeUser('user'),
    id: `u-p6-${tag}-${stamp}`,
    email: `p6-${tag}-${stamp}@example.test`,
    username: `p6_${tag}_${stamp}`,
  };
}

const creator = user('creator');
const alice = user('alice');
const bob = user('bob');
const carol = user('carol');
const dave = user('dave');
const erin = user('erin');
const frank = user('frank');
const stranger = user('stranger');
const blocked = user('blocked');

const allUsers = [creator, alice, bob, carol, dave, erin, frank, stranger, blocked];

function appFor(u: SessionUser | null) {
  return createApp({ auth: fakeAuth(u), rateLimit: false });
}

const creatorApp = appFor(creator);
const aliceApp = appFor(alice);
const bobApp = appFor(bob);
const carolApp = appFor(carol);
const daveApp = appFor(dave);
const erinApp = appFor(erin);
const frankApp = appFor(frank);
const strangerApp = appFor(stranger);
const blockedApp = appFor(blocked);
const publicApp = appFor(null);

let cafeId: string;
let gameId: string;

const headers = { 'content-type': 'application/json' };
const createdMeetupIds = new Set<string>();

async function post(app: typeof creatorApp, path: string, body?: unknown) {
  return app.request(path, {
    method: 'POST',
    headers,
    ...(body !== undefined && { body: JSON.stringify(body) }),
  });
}
async function patch(app: typeof creatorApp, path: string, body: unknown) {
  return app.request(path, { method: 'PATCH', headers, body: JSON.stringify(body) });
}
async function del(app: typeof creatorApp, path: string) {
  return app.request(path, { method: 'DELETE', headers });
}

function futureDate(daysAhead: number, hour = 19): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + daysAhead);
  d.setUTCHours(hour - 7, 0, 0, 0); // hour is local Asia/Saigon
  return d.toISOString();
}

interface CreateOpts {
  visibility?: 'public' | 'friends' | 'private';
  capacity?: number;
  startsAt?: string;
  provinceCode?: string;
}

async function createMeetup(app: typeof creatorApp, opts: CreateOpts = {}) {
  const res = await post(app, '/api/events', {
    title: `Kèo test ${Math.random().toString(36).slice(2, 8)}`,
    startsAt: opts.startsAt ?? futureDate(3),
    cafeId,
    provinceCode: opts.provinceCode ?? PROVINCE.code,
    visibility: opts.visibility,
    capacity: opts.capacity,
  });
  const json = (await res.json()) as { id: string; slug: string; inviteUrl: string };
  if (res.status === 201) createdMeetupIds.add(json.id);
  return { res, json };
}

beforeAll(async () => {
  await db.insert(users).values(allUsers).onConflictDoNothing({ target: users.id });
  await db.insert(provinces).values(PROVINCE).onConflictDoNothing();
  await db.insert(wards).values(WARD).onConflictDoNothing();
  const [cafe] = await db
    .insert(cafes)
    .values({
      slug: `p6-cafe-${stamp}`,
      name: 'Quán Kèo Test',
      provinceCode: PROVINCE.code,
      wardCode: WARD.code,
      addressLine: '123 Test',
      consentStatus: 'granted',
    })
    .returning({ id: cafes.id });
  cafeId = cafe!.id;
  const [game] = await db
    .insert(games)
    .values({ slug: `p6-game-${stamp}`, nameEn: 'Catan Test', descriptionRightsHolder: null })
    .returning({ id: games.id });
  gameId = game!.id;
  await db.insert(friendships).values({
    userA: creator.id < alice.id ? creator.id : alice.id,
    userB: creator.id < alice.id ? alice.id : creator.id,
  });
  await db.insert(userBlocks).values({ blockerId: creator.id, blockedId: blocked.id });
});

afterAll(async () => {
  if (createdMeetupIds.size > 0) {
    await db.delete(meetups).where(inArray(meetups.id, [...createdMeetupIds]));
  }
  await db.delete(games).where(eq(games.id, gameId));
  await db.delete(cafes).where(eq(cafes.id, cafeId));
  await db.delete(wards).where(eq(wards.code, WARD.code));
  await db.delete(provinces).where(eq(provinces.code, PROVINCE.code));
  await db.delete(userBlocks).where(eq(userBlocks.blockerId, creator.id));
  await db.delete(friendships).where(
    inArray(
      friendships.userA,
      allUsers.map((u) => u.id),
    ),
  );
  await db.delete(users).where(
    inArray(
      users.id,
      allUsers.map((u) => u.id),
    ),
  );
  await pool.end();
});

describe('create + visibility', () => {
  it('defaults to public visibility', async () => {
    const { res, json } = await createMeetup(creatorApp);
    expect(res.status).toBe(201);
    expect((json as unknown as { visibility: string }).visibility).toBe('public');
  });

  it('private meetup without code is 404 for a stranger', async () => {
    const { json } = await createMeetup(creatorApp, { visibility: 'private' });
    const res = await strangerApp.request(`/api/events/${json.slug}`);
    expect(res.status).toBe(404);
  });

  it('private meetup with the right code returns 200 but is excluded from list/calendar', async () => {
    const startsAt = futureDate(5);
    const { json } = await createMeetup(creatorApp, { visibility: 'private', startsAt });
    const code = json.inviteUrl.split('/join/')[1]!.split('?')[0]!;
    const detailRes = await strangerApp.request(`/api/events/${json.slug}?code=${code}`);
    expect(detailRes.status).toBe(200);

    const listRes = await strangerApp.request(
      `/api/events?provinceCode=${PROVINCE.code}&pageSize=50`,
    );
    const listJson = (await listRes.json()) as { items: { slug: string }[] };
    expect(listJson.items.some((i) => i.slug === json.slug)).toBe(false);

    const month = startsAt.slice(0, 7);
    const calRes = await strangerApp.request(`/api/events/calendar?month=${month}`);
    const calJson = (await calRes.json()) as { meetupIds: string[] }[];
    expect(calJson.every((day) => !day.meetupIds.includes(json.id))).toBe(true);
  });

  it('a viewer blocked by the creator gets 404', async () => {
    const { json } = await createMeetup(creatorApp);
    const res = await blockedApp.request(`/api/events/${json.slug}`);
    expect(res.status).toBe(404);
  });

  it('never stores the raw invite token', async () => {
    const { json } = await createMeetup(creatorApp);
    const rawToken = json.inviteUrl.split('/join/')[1]!.split('?')[0]!;
    const [row] = await db
      .select({ hash: meetups.inviteCodeHash })
      .from(meetups)
      .where(eq(meetups.id, json.id));
    expect(row!.hash).not.toBe(rawToken);
    expect(row!.hash).toBe(createHash('sha256').update(rawToken).digest('hex'));
  });

  it('DTOs never include an email field', async () => {
    const { json } = await createMeetup(creatorApp);
    expect(JSON.stringify(json)).not.toContain(creator.email);
  });
});

describe('RSVP capacity + FIFO waitlist', () => {
  it('waitlists the 3rd/4th RSVP at capacity 2; leaving promotes the 3rd (not the 4th)', async () => {
    const { json } = await createMeetup(creatorApp, { capacity: 2 });
    const rsvp = (app: typeof creatorApp) =>
      post(app, `/api/events/${json.id}/rsvp`, { status: 'going' });

    const r1 = await rsvp(aliceApp);
    expect(((await r1.json()) as { viewerStatus: string }).viewerStatus).toBe('going');
    const r2 = await rsvp(bobApp);
    expect(((await r2.json()) as { viewerStatus: string }).viewerStatus).toBe('going');
    const r3 = await rsvp(carolApp);
    expect(((await r3.json()) as { viewerStatus: string }).viewerStatus).toBe('waitlist');
    const r4 = await rsvp(daveApp);
    expect(((await r4.json()) as { viewerStatus: string }).viewerStatus).toBe('waitlist');

    await post(aliceApp, `/api/events/${json.id}/rsvp`, { status: 'declined' });

    const carolDetail = await carolApp.request(`/api/events/${json.slug}`);
    expect(((await carolDetail.json()) as { viewerStatus: string }).viewerStatus).toBe('going');
    const daveDetail = await daveApp.request(`/api/events/${json.slug}`);
    expect(((await daveDetail.json()) as { viewerStatus: string }).viewerStatus).toBe('waitlist');
  });

  it('concurrent RSVPs never exceed capacity', async () => {
    const { json } = await createMeetup(creatorApp, { capacity: 2 });
    const apps = [aliceApp, bobApp, carolApp, daveApp, erinApp];
    const results = await Promise.all(
      apps.map((app) => post(app, `/api/events/${json.id}/rsvp`, { status: 'going' })),
    );
    const statuses = await Promise.all(
      results.map((r) => r.json() as Promise<{ viewerStatus: string }>),
    );
    const going = statuses.filter((s) => s.viewerStatus === 'going').length;
    const waitlisted = statuses.filter((s) => s.viewerStatus === 'waitlist').length;
    expect(going).toBe(2);
    expect(waitlisted).toBe(3);
  });
});

describe('tables + seats', () => {
  it('a 2-seat table is host + 1; a 2nd extra person gets 409', async () => {
    const { json } = await createMeetup(creatorApp);
    const tableRes = await post(creatorApp, `/api/events/${json.id}/tables`, { seats: 2 });
    const table = (await tableRes.json()) as { id: string };
    expect(tableRes.status).toBe(201);

    await post(aliceApp, `/api/events/${json.id}/rsvp`, { status: 'going' });
    const seat1 = await post(aliceApp, `/api/events/${json.id}/tables/${table.id}/seat`);
    expect(seat1.status).toBe(204);

    await post(bobApp, `/api/events/${json.id}/rsvp`, { status: 'going' });
    const seat2 = await post(bobApp, `/api/events/${json.id}/tables/${table.id}/seat`);
    expect(seat2.status).toBe(409);
  });

  it('a 4-seat table rejects the 5th person with 409', async () => {
    const { json } = await createMeetup(creatorApp);
    const tableRes = await post(creatorApp, `/api/events/${json.id}/tables`, { seats: 4 });
    const table = (await tableRes.json()) as { id: string };
    for (const app of [aliceApp, bobApp, carolApp]) {
      await post(app, `/api/events/${json.id}/rsvp`, { status: 'going' });
      const seat = await post(app, `/api/events/${json.id}/tables/${table.id}/seat`);
      expect(seat.status).toBe(204);
    }
    await post(daveApp, `/api/events/${json.id}/rsvp`, { status: 'going' });
    const seat5 = await post(daveApp, `/api/events/${json.id}/tables/${table.id}/seat`);
    expect(seat5.status).toBe(409);
  });

  it('concurrent seat claims never exceed table seats', async () => {
    const { json } = await createMeetup(creatorApp);
    const tableRes = await post(creatorApp, `/api/events/${json.id}/tables`, { seats: 2 });
    const table = (await tableRes.json()) as { id: string };
    const apps = [aliceApp, bobApp, carolApp, daveApp];
    await Promise.all(
      apps.map((app) => post(app, `/api/events/${json.id}/rsvp`, { status: 'going' })),
    );
    const results = await Promise.all(
      apps.map((app) => post(app, `/api/events/${json.id}/tables/${table.id}/seat`)),
    );
    const seatedCount = results.filter((r) => r.status === 204).length;
    expect(seatedCount).toBe(1); // host already occupies the other seat
  });

  it('seating while maybe is 422', async () => {
    const { json } = await createMeetup(creatorApp);
    const tableRes = await post(creatorApp, `/api/events/${json.id}/tables`, { seats: 4 });
    const table = (await tableRes.json()) as { id: string };
    await post(aliceApp, `/api/events/${json.id}/rsvp`, { status: 'maybe' });
    const seat = await post(aliceApp, `/api/events/${json.id}/tables/${table.id}/seat`);
    expect(seat.status).toBe(422);
  });

  it('bringing a game not in the shelf is 422', async () => {
    const { json } = await createMeetup(creatorApp);
    const res = await post(creatorApp, `/api/events/${json.id}/tables`, {
      gameId,
      broughtByUserId: creator.id,
    });
    expect(res.status).toBe(422);
  });

  it('deleting a table clears seated participants to no table', async () => {
    const { json } = await createMeetup(creatorApp);
    const tableRes = await post(creatorApp, `/api/events/${json.id}/tables`, {});
    const table = (await tableRes.json()) as { id: string };
    await post(aliceApp, `/api/events/${json.id}/rsvp`, { status: 'going' });
    await post(aliceApp, `/api/events/${json.id}/tables/${table.id}/seat`);

    const delRes = await del(creatorApp, `/api/events/${json.id}/tables/${table.id}`);
    expect(delRes.status).toBe(204);

    const [row] = await db
      .select({ tableId: meetupParticipants.tableId })
      .from(meetupParticipants)
      .where(
        and(eq(meetupParticipants.userId, alice.id), eq(meetupParticipants.meetupId, json.id)),
      );
    expect(row?.tableId).toBeNull();
  });

  it("a host cannot edit another host's table (403)", async () => {
    const { json } = await createMeetup(creatorApp);
    await post(aliceApp, `/api/events/${json.id}/rsvp`, { status: 'going' });
    const aliceTableRes = await post(aliceApp, `/api/events/${json.id}/tables`, {});
    const aliceTable = (await aliceTableRes.json()) as { id: string };

    await post(bobApp, `/api/events/${json.id}/rsvp`, { status: 'going' });
    await post(bobApp, `/api/events/${json.id}/tables`, {});

    const editRes = await patch(bobApp, `/api/events/${json.id}/tables/${aliceTable.id}`, {
      note: 'hijack',
    });
    expect(editRes.status).toBe(403);
  });
});

describe('cancel', () => {
  it('a cancelled meetup is viewable but rejects RSVP and table creation', async () => {
    const { json } = await createMeetup(creatorApp);
    const cancelRes = await del(creatorApp, `/api/events/${json.id}`);
    expect(cancelRes.status).toBe(204);

    const viewRes = await strangerApp.request(`/api/events/${json.slug}`);
    expect(viewRes.status).toBe(200);
    expect(((await viewRes.json()) as { status: string }).status).toBe('cancelled');

    const rsvpRes = await post(aliceApp, `/api/events/${json.id}/rsvp`, { status: 'going' });
    expect(rsvpRes.status).toBe(409);
    const tableRes = await post(creatorApp, `/api/events/${json.id}/tables`, {});
    expect(tableRes.status).toBe(409);
  });
});

describe('user deletion cascade', () => {
  it('deleting the host cascades the table away and clears seated participants', async () => {
    const host = user('deleteme');
    await db.insert(users).values(host).onConflictDoNothing({ target: users.id });
    const hostApp = appFor(host);

    const { json } = await createMeetup(creatorApp);
    await post(hostApp, `/api/events/${json.id}/rsvp`, { status: 'going' });
    const tableRes = await post(hostApp, `/api/events/${json.id}/tables`, {});
    const table = (await tableRes.json()) as { id: string };
    await post(aliceApp, `/api/events/${json.id}/rsvp`, { status: 'going' });
    await post(aliceApp, `/api/events/${json.id}/tables/${table.id}/seat`);

    const goingIds = await goingMeetupIdsForUser(host.id);
    await db.delete(users).where(eq(users.id, host.id));
    await promoteWaitlistForMeetups(goingIds);

    const [tableRow] = await db.select().from(meetupTables).where(eq(meetupTables.id, table.id));
    expect(tableRow).toBeUndefined();
    const [aliceRow] = await db
      .select({ tableId: meetupParticipants.tableId })
      .from(meetupParticipants)
      .where(
        and(eq(meetupParticipants.userId, alice.id), eq(meetupParticipants.meetupId, json.id)),
      );
    expect(aliceRow?.tableId).toBeNull();
  });
});

describe('calendar aggregate', () => {
  it('aggregates players/tables per day over the visible set, excluding cancelled and strangers of friends-only meetups', async () => {
    const startsAt = futureDate(10, 19);
    const startsAt2 = futureDate(10, 20);
    const month = startsAt.slice(0, 7);

    const { json: meetupA } = await createMeetup(creatorApp, { startsAt });
    const tableA1 = (await (
      await post(creatorApp, `/api/events/${meetupA.id}/tables`, {})
    ).json()) as { id: string };
    await post(creatorApp, `/api/events/${meetupA.id}/tables`, {});
    for (const app of [aliceApp, bobApp, carolApp]) {
      await post(app, `/api/events/${meetupA.id}/rsvp`, { status: 'going' });
    }
    await post(aliceApp, `/api/events/${meetupA.id}/tables/${tableA1.id}/seat`);

    const { json: meetupB } = await createMeetup(creatorApp, { startsAt: startsAt2 });
    await post(creatorApp, `/api/events/${meetupB.id}/tables`, {});
    for (const app of [daveApp, erinApp, frankApp]) {
      await post(app, `/api/events/${meetupB.id}/rsvp`, { status: 'going' });
    }

    const cancelledRes = await createMeetup(creatorApp, { startsAt });
    await del(creatorApp, `/api/events/${cancelledRes.json.id}`);

    const friendsRes = await post(creatorApp, '/api/events', {
      title: 'Kèo bạn bè',
      startsAt,
      cafeId,
      provinceCode: PROVINCE.code,
      visibility: 'friends',
    });
    const friendsJson = (await friendsRes.json()) as { id: string };
    createdMeetupIds.add(friendsJson.id);
    await post(aliceApp, `/api/events/${friendsJson.id}/rsvp`, { status: 'going' });

    const calRes = await strangerApp.request(`/api/events/calendar?month=${month}`);
    const calJson = (await calRes.json()) as {
      date: string;
      players: number;
      tables: number;
      meetupIds: string[];
    }[];
    const day = calJson.find((d) => d.meetupIds.includes(meetupA.id));
    expect(day).toBeDefined();
    // Distinct going across the day: creator (host of both A tables + B's table) + alice/bob/carol (A) + dave/erin/frank (B).
    expect(day!.players).toBe(7);
    expect(day!.tables).toBe(3);
    expect(day!.meetupIds).not.toContain(cancelledRes.json.id);
    expect(day!.meetupIds).not.toContain(friendsJson.id);
  });
});

describe('list', () => {
  it('public list only returns public future meetups', async () => {
    const { json: pub } = await createMeetup(creatorApp);
    const { json: priv } = await createMeetup(creatorApp, { visibility: 'private' });

    // Past startsAt is rejected at create time now, so seed the past row directly.
    const [pastRow] = await db
      .insert(meetups)
      .values({
        slug: `p6-past-${stamp}`,
        title: 'Kèo quá khứ',
        startsAt: new Date(Date.now() - 86_400_000),
        cafeId,
        provinceCode: PROVINCE.code,
        visibility: 'public',
        inviteCodeHash: `p6-past-hash-${stamp}`,
        createdBy: creator.id,
      })
      .returning({ id: meetups.id, slug: meetups.slug });
    createdMeetupIds.add(pastRow!.id);

    const res = await publicApp.request(`/api/events?provinceCode=${PROVINCE.code}&pageSize=50`);
    const json = (await res.json()) as { items: { slug: string }[] };
    const slugs = json.items.map((i) => i.slug);
    expect(slugs).toContain(pub.slug);
    expect(slugs).not.toContain(priv.slug);
    expect(slugs).not.toContain(pastRow!.slug);
  });
});

describe('create validation', () => {
  it('rejects a startsAt in the past', async () => {
    const res = await post(creatorApp, '/api/events', {
      title: 'Kèo quá khứ',
      startsAt: new Date(Date.now() - 3_600_000).toISOString(),
      cafeId,
      provinceCode: PROVINCE.code,
    });
    expect(res.status).toBe(422);
  });

  it('rejects endsAt before startsAt', async () => {
    const startsAt = futureDate(3);
    const res = await post(creatorApp, '/api/events', {
      title: 'Kèo giờ sai',
      startsAt,
      endsAt: new Date(new Date(startsAt).getTime() - 60_000).toISOString(),
      cafeId,
      provinceCode: PROVINCE.code,
    });
    expect(res.status).toBe(422);
  });
});

describe('update validation', () => {
  it('rejects PATCH endsAt alone when it is before the stored startsAt', async () => {
    const startsAt = futureDate(5);
    const { json } = await createMeetup(creatorApp, { startsAt });
    const res = await patch(creatorApp, `/api/events/${json.id}`, {
      endsAt: new Date(new Date(startsAt).getTime() - 60_000).toISOString(),
    });
    expect(res.status).toBe(422);
  });

  it('rejects PATCH startsAt alone when it is after the stored endsAt', async () => {
    const startsAt = futureDate(5);
    const endsAt = futureDate(5, 21);
    const createRes = await post(creatorApp, '/api/events', {
      title: 'Kèo có giờ kết thúc',
      startsAt,
      endsAt,
      cafeId,
      provinceCode: PROVINCE.code,
    });
    const created = (await createRes.json()) as { id: string };
    createdMeetupIds.add(created.id);

    const res = await patch(creatorApp, `/api/events/${created.id}`, {
      startsAt: new Date(new Date(endsAt).getTime() + 60_000).toISOString(),
    });
    expect(res.status).toBe(422);
  });

  it('rejects PATCH startsAt into the past', async () => {
    const { json } = await createMeetup(creatorApp);
    const res = await patch(creatorApp, `/api/events/${json.id}`, {
      startsAt: new Date(Date.now() - 3_600_000).toISOString(),
    });
    expect(res.status).toBe(422);
  });
});

describe('/me/events', () => {
  it('returns only meetups the user created or participates in, not other public ones', async () => {
    const { json: mine } = await createMeetup(creatorApp);
    const { json: notMine } = await createMeetup(creatorApp);
    await post(aliceApp, `/api/events/${mine.id}/rsvp`, { status: 'maybe' });

    const res = await aliceApp.request('/api/me/events');
    const json = (await res.json()) as { items: { id: string }[] };
    const ids = json.items.map((i) => i.id);
    expect(ids).toContain(mine.id);
    expect(ids).not.toContain(notMine.id);
  });
});

describe('invite + rotate', () => {
  it('inviting a non-friend is 422', async () => {
    const { json } = await createMeetup(creatorApp);
    const res = await post(creatorApp, `/api/events/${json.id}/invite`, { userIds: [stranger.id] });
    expect(res.status).toBe(422);
  });

  it('rotating the invite code invalidates the old one immediately', async () => {
    const { json } = await createMeetup(creatorApp, { visibility: 'private' });
    const oldCode = json.inviteUrl.split('/join/')[1]!.split('?')[0]!;
    const before = await strangerApp.request(`/api/events/${json.slug}?code=${oldCode}`);
    expect(before.status).toBe(200);

    const rotateRes = await post(creatorApp, `/api/events/${json.id}/invite-code/rotate`);
    expect(rotateRes.status).toBe(200);

    const after = await strangerApp.request(`/api/events/${json.slug}?code=${oldCode}`);
    expect(after.status).toBe(404);
  });
});

describe('capacity decrease', () => {
  it('rejects lowering capacity below the current going count', async () => {
    const { json } = await createMeetup(creatorApp, { capacity: 3 });
    await post(aliceApp, `/api/events/${json.id}/rsvp`, { status: 'going' });
    await post(bobApp, `/api/events/${json.id}/rsvp`, { status: 'going' });

    const res = await patch(creatorApp, `/api/events/${json.id}`, { capacity: 1 });
    expect(res.status).toBe(422);
  });
});

describe('host restrictions', () => {
  it("a host can't leave, decline, or move away from their own table", async () => {
    const { json } = await createMeetup(creatorApp);
    await post(aliceApp, `/api/events/${json.id}/rsvp`, { status: 'going' });
    const tableRes = await post(aliceApp, `/api/events/${json.id}/tables`, {});
    const table = (await tableRes.json()) as { id: string };

    const declineRes = await post(aliceApp, `/api/events/${json.id}/rsvp`, { status: 'declined' });
    expect(declineRes.status).toBe(409);

    const leaveRes = await del(aliceApp, `/api/events/${json.id}/tables/${table.id}/seat`);
    expect(leaveRes.status).toBe(409);

    const otherTableRes = await post(creatorApp, `/api/events/${json.id}/tables`, {});
    const otherTable = (await otherTableRes.json()) as { id: string };
    const seatElsewhere = await post(
      aliceApp,
      `/api/events/${json.id}/tables/${otherTable.id}/seat`,
    );
    expect(seatElsewhere.status).toBe(409);
  });

  it('re-sending RSVP going without a tableId keeps the existing seat', async () => {
    const { json } = await createMeetup(creatorApp);
    const tableRes = await post(creatorApp, `/api/events/${json.id}/tables`, {});
    const table = (await tableRes.json()) as { id: string };

    const res = await post(creatorApp, `/api/events/${json.id}/rsvp`, { status: 'going' });
    const detail = (await res.json()) as { tables: { id: string; host: { id: string } }[] };
    expect(detail.tables.find((t) => t.id === table.id)?.host.id).toBe(creator.id);
    const [row] = await db
      .select({ tableId: meetupParticipants.tableId })
      .from(meetupParticipants)
      .where(
        and(eq(meetupParticipants.userId, creator.id), eq(meetupParticipants.meetupId, json.id)),
      );
    expect(row?.tableId).toBe(table.id);
  });
});

describe('brought-by snapshot', () => {
  it('editing note after the game left the shelf still succeeds (no re-validation)', async () => {
    const { json } = await createMeetup(creatorApp);
    await db.insert(userGames).values({ userId: creator.id, gameId }).onConflictDoNothing();

    const tableRes = await post(creatorApp, `/api/events/${json.id}/tables`, {
      gameId,
      broughtByUserId: creator.id,
    });
    expect(tableRes.status).toBe(201);
    const table = (await tableRes.json()) as { id: string };

    await db
      .delete(userGames)
      .where(and(eq(userGames.userId, creator.id), eq(userGames.gameId, gameId)));

    const editRes = await patch(creatorApp, `/api/events/${json.id}/tables/${table.id}`, {
      note: 'ghi chú mới',
    });
    expect(editRes.status).toBe(200);
  });
});

describe('table seats reduction', () => {
  it('rejects lowering seats below the current seated count', async () => {
    const { json } = await createMeetup(creatorApp);
    const tableRes = await post(creatorApp, `/api/events/${json.id}/tables`, { seats: 4 });
    const table = (await tableRes.json()) as { id: string };
    await post(aliceApp, `/api/events/${json.id}/rsvp`, { status: 'going' });
    await post(aliceApp, `/api/events/${json.id}/tables/${table.id}/seat`);

    const res = await patch(creatorApp, `/api/events/${json.id}/tables/${table.id}`, { seats: 1 });
    expect(res.status).toBe(422);
  });
});

describe('cache-control', () => {
  it('a non-public or code-accessed detail response is private, no-store', async () => {
    const { json } = await createMeetup(creatorApp, { visibility: 'private' });
    const code = json.inviteUrl.split('/join/')[1]!.split('?')[0]!;
    const res = await strangerApp.request(`/api/events/${json.slug}?code=${code}`);
    expect(res.headers.get('cache-control')).toBe('private, no-store');
  });
});

describe('participant name privacy', () => {
  it("hides a participant's name from a non-friend, shows it to a friend/self", async () => {
    const privateUser = {
      ...user('privateprofile'),
      name: 'Private Profile Person',
      profileVisibility: 'private',
    };
    await db
      .insert(users)
      .values(privateUser as unknown as typeof users.$inferInsert)
      .onConflictDoNothing({ target: users.id });
    const privateApp = appFor(privateUser as SessionUser);

    const { json } = await createMeetup(creatorApp);
    const tableRes = await post(creatorApp, `/api/events/${json.id}/tables`, {});
    const table = (await tableRes.json()) as { id: string };
    await post(privateApp, `/api/events/${json.id}/rsvp`, { status: 'going' });
    await post(privateApp, `/api/events/${json.id}/tables/${table.id}/seat`);

    const strangerView = await strangerApp.request(`/api/events/${json.slug}`);
    const strangerDetail = (await strangerView.json()) as {
      tables: { seatedUsers: { id: string; name: string; username: string | null }[] }[];
    };
    const strangerNames = strangerDetail.tables.flatMap((t) => t.seatedUsers.map((u) => u.name));
    expect(strangerNames).not.toContain(privateUser.name);

    const selfRes = await privateApp.request(`/api/events/${json.slug}`);
    const selfDetail = (await selfRes.json()) as { tables: { seatedUsers: { name: string }[] }[] };
    const selfNames = selfDetail.tables.flatMap((t) => t.seatedUsers.map((u) => u.name));
    expect(selfNames).toContain(privateUser.name);

    await db.delete(users).where(eq(users.id, privateUser.id));
  });
});

describe('public-only rate limit', () => {
  it('rate-limits public meetup creation but not private/friends', async () => {
    const limited = user('ratelimited');
    await db.insert(users).values(limited).onConflictDoNothing({ target: users.id });
    const limitedApp = createApp({ auth: fakeAuth(limited), rateLimit: true });

    for (let i = 0; i < 10; i++) {
      const res = await post(limitedApp, '/api/events', {
        title: `Kèo rate ${i}`,
        startsAt: futureDate(3),
        cafeId,
        provinceCode: PROVINCE.code,
        visibility: 'public',
      });
      expect(res.status).toBe(201);
      const j = (await res.json()) as { id: string };
      createdMeetupIds.add(j.id);
    }
    const eleventh = await post(limitedApp, '/api/events', {
      title: 'Kèo rate 11',
      startsAt: futureDate(3),
      cafeId,
      provinceCode: PROVINCE.code,
      visibility: 'public',
    });
    expect(eleventh.status).toBe(429);

    const privateStillWorks = await post(limitedApp, '/api/events', {
      title: 'Kèo private not limited',
      startsAt: futureDate(3),
      cafeId,
      provinceCode: PROVINCE.code,
      visibility: 'private',
    });
    expect(privateStillWorks.status).toBe(201);
    const j = (await privateStillWorks.json()) as { id: string };
    createdMeetupIds.add(j.id);
    await db.delete(users).where(eq(users.id, limited.id));
  });
});
