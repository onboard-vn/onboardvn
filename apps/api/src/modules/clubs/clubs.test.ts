import { createHash } from 'node:crypto';
import { and, eq, inArray } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../../app.js';
import { db, pool } from '../../db/client.js';
import {
  adminAuditLog,
  clubExternalMembers,
  clubMembers,
  clubs,
  friendships,
  meetups,
  provinces,
  users,
} from '../../db/schema/index.js';
import { fakeAuth, fakeUser } from '../../test/fake-auth.js';
import type { SessionUser } from '../../types.js';
import { handOverClubsBeforeUserDelete } from './service.js';

const stamp = Date.now();
const PROVINCE = { code: `club-p-${stamp}`, name: 'Tỉnh Club Test', slug: `club-tinh-${stamp}` };

function user(tag: string, role: 'user' | 'admin' = 'user') {
  return {
    ...fakeUser(role),
    id: `u-club-${tag}-${stamp}`,
    email: `club-${tag}-${stamp}@example.test`,
    username: `club_${tag}_${stamp}`,
  };
}

const owner = user('owner');
const admin = user('admin');
const member = user('member');
const member2 = user('member2');
const outsider = user('outsider');
const friend = user('friend');
const staff = user('staff', 'admin');
const allUsers = [owner, admin, member, member2, outsider, friend, staff];

const appFor = (u: SessionUser | null) => createApp({ auth: fakeAuth(u), rateLimit: false });
const ownerApp = appFor(owner);
const adminApp = appFor(admin);
const memberApp = appFor(member);
const member2App = appFor(member2);
const outsiderApp = appFor(outsider);
const staffApp = appFor(staff);
const anonApp = appFor(null);

const headers = { 'content-type': 'application/json' };
const createdClubIds = new Set<string>();

type App = typeof ownerApp;
const post = (app: App, path: string, body: unknown = {}) =>
  app.request(path, { method: 'POST', headers, body: JSON.stringify(body) });
const patch = (app: App, path: string, body: unknown) =>
  app.request(path, { method: 'PATCH', headers, body: JSON.stringify(body) });
const del = (app: App, path: string) => app.request(path, { method: 'DELETE', headers });

const codeFromUrl = (url: string) => url.split('/join/')[1]!;

interface CreatedClub {
  id: string;
  slug: string;
  code: string;
}

async function createClub(app: App, name = `Club ${Math.random().toString(36).slice(2, 8)}`) {
  const res = await post(app, '/api/clubs', { name });
  const json = (await res.json()) as { club: { id: string; slug: string }; inviteUrl: string };
  if (res.status === 201) createdClubIds.add(json.club.id);
  return { res, json, club: res.status === 201 ? toCreated(json) : undefined };
}

function toCreated(json: { club: { id: string; slug: string }; inviteUrl: string }): CreatedClub {
  return { id: json.club.id, slug: json.club.slug, code: codeFromUrl(json.inviteUrl) };
}

async function clubWithMembers() {
  const { club } = await createClub(ownerApp);
  for (const app of [adminApp, memberApp]) {
    expect((await post(app, `/api/clubs/join/${club!.code}`)).status).toBe(200);
  }
  expect(
    (await patch(ownerApp, `/api/clubs/${club!.id}/members/${admin.id}`, { role: 'admin' })).status,
  ).toBe(204);
  return club!;
}

function futureDate(daysAhead: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + daysAhead);
  d.setUTCHours(12, 0, 0, 0);
  return d.toISOString();
}

async function createClubMeetup(app: App, clubId: string, visibility = 'club') {
  const res = await post(app, '/api/events', {
    title: `Kèo club ${Math.random().toString(36).slice(2, 8)}`,
    startsAt: futureDate(4),
    addressLine: '1 Test',
    provinceCode: PROVINCE.code,
    visibility,
    clubId,
  });
  return { res, json: (await res.json()) as { id: string; slug: string } };
}

beforeAll(async () => {
  await db.insert(users).values(allUsers).onConflictDoNothing({ target: users.id });
  await db.insert(provinces).values(PROVINCE).onConflictDoNothing();
  const [a, b] = owner.id < friend.id ? [owner.id, friend.id] : [friend.id, owner.id];
  await db.insert(friendships).values({ userA: a, userB: b });
});

afterAll(async () => {
  const ids = [...createdClubIds];
  if (ids.length > 0) {
    await db.delete(meetups).where(inArray(meetups.clubId, ids));
    await db.delete(clubs).where(inArray(clubs.id, ids));
  }
  const userIds = allUsers.map((u) => u.id);
  await db.delete(meetups).where(inArray(meetups.createdBy, userIds));
  await db.delete(adminAuditLog).where(eq(adminAuditLog.actorUserId, staff.id));
  await db.delete(friendships).where(inArray(friendships.userA, userIds));
  await db.delete(users).where(inArray(users.id, userIds));
  await db.delete(provinces).where(eq(provinces.code, PROVINCE.code));
  await pool.end();
});

describe('create + read', () => {
  it('creates a private club with the creator as owner and a one-time invite url', async () => {
    const { res, json } = await createClub(ownerApp);
    expect(res.status).toBe(201);
    const body = json as unknown as {
      club: { visibility: string };
      myRole: string;
      memberCount: number;
      inviteUrl: string;
    };
    expect(body.club.visibility).toBe('private');
    expect(body.myRole).toBe('owner');
    expect(body.memberCount).toBe(1);
    expect(body.inviteUrl).toContain('/clubs/join/');
  });

  it('stores only the sha256 hash of the invite code', async () => {
    const { club } = await createClub(ownerApp);
    const [row] = await db.select().from(clubs).where(eq(clubs.id, club!.id));
    expect(row!.inviteCodeHash).not.toBe(club!.code);
    expect(row!.inviteCodeHash).toBe(createHash('sha256').update(club!.code).digest('hex'));
    const detail = await (await ownerApp.request(`/api/clubs/${club!.slug}`)).text();
    expect(detail).not.toContain(club!.code);
    expect(detail).not.toContain(row!.inviteCodeHash);
  });

  it('rejects anonymous creation and invalid input', async () => {
    expect((await post(anonApp, '/api/clubs', { name: 'Anon club' })).status).toBe(401);
    expect((await post(ownerApp, '/api/clubs', { name: 'x' })).status).toBe(422);
  });

  it('outsiders and anonymous see only name and member count of a private club', async () => {
    const { club } = await createClub(ownerApp, 'Club Riêng Tư');
    await patch(ownerApp, `/api/clubs/${club!.id}`, { description: 'secret description' });
    for (const app of [outsiderApp, anonApp]) {
      const res = await app.request(`/api/clubs/${club!.slug}`);
      expect(res.status).toBe(200);
      const json = (await res.json()) as {
        club: { id?: string; name: string; description: string | null };
        myRole: string | null;
        memberCount: number;
        members?: unknown;
      };
      expect(json.club.name).toBe('Club Riêng Tư');
      expect(json.club.id).toBeUndefined();
      expect(json.club.description).toBeNull();
      expect(json.myRole).toBeNull();
      expect(json.memberCount).toBe(1);
      expect(json.members).toBeUndefined();
    }
  });

  it('members see the full detail with members list', async () => {
    const club = await clubWithMembers();
    const res = await memberApp.request(`/api/clubs/${club.slug}`);
    const json = (await res.json()) as {
      myRole: string;
      memberCount: number;
      members: { role: string }[];
    };
    expect(json.myRole).toBe('member');
    expect(json.memberCount).toBe(3);
    expect(json.members.map((m) => m.role)).toEqual(['owner', 'admin', 'member']);
  });

  it('lists only my clubs', async () => {
    const { club } = await createClub(ownerApp);
    const mine = (await (await ownerApp.request('/api/clubs')).json()) as {
      items: { id: string }[];
    };
    expect(mine.items.some((c) => c.id === club!.id)).toBe(true);
    const theirs = (await (await outsiderApp.request('/api/clubs')).json()) as {
      items: { id: string }[];
    };
    expect(theirs.items.some((c) => c.id === club!.id)).toBe(false);
  });

  it('returns 404 for an unknown slug', async () => {
    expect((await outsiderApp.request('/api/clubs/no-such-club-xyz')).status).toBe(404);
  });
});

describe('join + membership', () => {
  it('wrong code is 404, right code makes a member and is idempotent', async () => {
    const { club } = await createClub(ownerApp);
    expect((await post(outsiderApp, '/api/clubs/join/not-a-real-code')).status).toBe(404);
    const first = await post(outsiderApp, `/api/clubs/join/${club!.code}`);
    expect(first.status).toBe(200);
    expect(((await first.json()) as { role: string }).role).toBe('member');
    expect((await post(outsiderApp, `/api/clubs/join/${club!.code}`)).status).toBe(200);
    expect(await db.$count(clubMembers, eq(clubMembers.clubId, club!.id))).toBe(2);
  });

  it('rotating the invite code invalidates the old one', async () => {
    const { club } = await createClub(ownerApp);
    const rotated = await post(ownerApp, `/api/clubs/${club!.id}/invite-code/rotate`);
    const { inviteUrl } = (await rotated.json()) as { inviteUrl: string };
    expect((await post(outsiderApp, `/api/clubs/join/${club!.code}`)).status).toBe(404);
    expect((await post(outsiderApp, `/api/clubs/join/${codeFromUrl(inviteUrl)}`)).status).toBe(200);
  });

  it('non-admin cannot add members or rotate; admin can add a friend only', async () => {
    const club = await clubWithMembers();
    expect(
      (await post(memberApp, `/api/clubs/${club.id}/members`, { userId: friend.id })).status,
    ).toBe(403);
    expect(
      (await post(outsiderApp, `/api/clubs/${club.id}/members`, { userId: friend.id })).status,
    ).toBe(403);
    expect((await post(memberApp, `/api/clubs/${club.id}/invite-code/rotate`)).status).toBe(403);
    expect(
      (await post(adminApp, `/api/clubs/${club.id}/members`, { userId: friend.id })).status,
    ).toBe(422);
    expect(
      (await post(ownerApp, `/api/clubs/${club.id}/members`, { userId: friend.id })).status,
    ).toBe(204);
    expect(await db.$count(clubMembers, eq(clubMembers.clubId, club.id))).toBe(4);
  });

  it('sole owner cannot leave (422); a member can', async () => {
    const club = await clubWithMembers();
    expect((await del(ownerApp, `/api/clubs/${club.id}/members/me`)).status).toBe(422);
    expect((await del(memberApp, `/api/clubs/${club.id}/members/me`)).status).toBe(204);
    expect((await del(outsiderApp, `/api/clubs/${club.id}/members/me`)).status).toBe(403);
  });

  it('removal rules: admin removes members, not admins or owner; owner removes admins', async () => {
    const club = await clubWithMembers();
    expect((await post(member2App, `/api/clubs/join/${club.code}`)).status).toBe(200);
    expect((await del(adminApp, `/api/clubs/${club.id}/members/${owner.id}`)).status).toBe(403);
    expect((await del(adminApp, `/api/clubs/${club.id}/members/${member2.id}`)).status).toBe(204);
    expect((await del(ownerApp, `/api/clubs/${club.id}/members/${admin.id}`)).status).toBe(204);
    expect((await del(ownerApp, `/api/clubs/${club.id}/members/${outsider.id}`)).status).toBe(404);
  });

  it('owner transfers ownership; only owner changes roles', async () => {
    const club = await clubWithMembers();
    expect(
      (await patch(adminApp, `/api/clubs/${club.id}/members/${member.id}`, { role: 'admin' }))
        .status,
    ).toBe(403);
    expect(
      (await patch(ownerApp, `/api/clubs/${club.id}/members/${admin.id}`, { role: 'owner' }))
        .status,
    ).toBe(204);
    const roles = await db
      .select({ userId: clubMembers.userId, role: clubMembers.role })
      .from(clubMembers)
      .where(eq(clubMembers.clubId, club.id));
    expect(roles.find((r) => r.userId === admin.id)?.role).toBe('owner');
    expect(roles.find((r) => r.userId === owner.id)?.role).toBe('admin');
    expect(roles.filter((r) => r.role === 'owner')).toHaveLength(1);
  });

  it('update and delete require owner/admin and owner respectively', async () => {
    const club = await clubWithMembers();
    expect((await patch(memberApp, `/api/clubs/${club.id}`, { name: 'Đổi tên' })).status).toBe(403);
    expect((await patch(adminApp, `/api/clubs/${club.id}`, { name: 'Đổi tên' })).status).toBe(200);
    expect((await del(adminApp, `/api/clubs/${club.id}`)).status).toBe(403);
    expect((await del(ownerApp, `/api/clubs/${club.id}`)).status).toBe(204);
    expect((await ownerApp.request(`/api/clubs/${club.slug}`)).status).toBe(404);
  });

  it('global staff get no implicit club role', async () => {
    const club = await clubWithMembers();
    expect((await patch(staffApp, `/api/clubs/${club.id}`, { name: 'Staff edit' })).status).toBe(
      403,
    );
    const detail = (await (await staffApp.request(`/api/clubs/${club.slug}`)).json()) as {
      members?: unknown;
    };
    expect(detail.members).toBeUndefined();
  });
});

describe('rate limit', () => {
  it('allows 5 clubs per day then 429', async () => {
    const limited = user('limited');
    await db.insert(users).values(limited).onConflictDoNothing({ target: users.id });
    allUsers.push(limited);
    const app = createApp({ auth: fakeAuth(limited), rateLimit: true });
    for (let i = 0; i < 5; i++) {
      const { res } = await createClub(app as unknown as App, `Rate club ${i} ${stamp}`);
      expect(res.status).toBe(201);
    }
    const sixth = await post(app as unknown as App, '/api/clubs', { name: `Rate club 6 ${stamp}` });
    expect(sixth.status).toBe(429);
  });
});

describe('club meetups', () => {
  it('non-member creating a club meetup is 422; club visibility without clubId is 422', async () => {
    const club = await clubWithMembers();
    expect((await createClubMeetup(outsiderApp, club.id)).res.status).toBe(422);
    const noClub = await post(ownerApp, '/api/events', {
      title: 'Kèo thiếu club',
      startsAt: futureDate(4),
      addressLine: '1 Test',
      provinceCode: PROVINCE.code,
      visibility: 'club',
    });
    expect(noClub.status).toBe(422);
  });

  it('is visible only to members across detail, list, calendar, rsvp and /me/events', async () => {
    const club = await clubWithMembers();
    const { res, json } = await createClubMeetup(ownerApp, club.id);
    expect(res.status).toBe(201);
    const startsAt = futureDate(4);
    const month = startsAt.slice(0, 7);
    const listPath = `/api/events?clubId=${club.id}&pageSize=50`;
    const calPath = `/api/events/calendar?month=${month}`;

    for (const app of [memberApp, adminApp, ownerApp]) {
      expect((await app.request(`/api/events/${json.slug}`)).status).toBe(200);
      const list = (await (await app.request(listPath)).json()) as { items: { slug: string }[] };
      expect(list.items.some((i) => i.slug === json.slug)).toBe(true);
    }
    const detail = (await (await memberApp.request(`/api/events/${json.slug}`)).json()) as {
      club: { slug: string } | null;
      visibility: string;
    };
    expect(detail.visibility).toBe('club');
    expect(detail.club?.slug).toBe(club.slug);

    for (const app of [outsiderApp, anonApp]) {
      expect((await app.request(`/api/events/${json.slug}`)).status).toBe(404);
      const list = (await (await app.request(listPath)).json()) as { items: { slug: string }[] };
      expect(list.items).toHaveLength(0);
      const cal = (await (await app.request(calPath)).json()) as { meetupIds: string[] }[];
      expect(cal.flatMap((d) => d.meetupIds)).not.toContain(json.id);
    }
    const memberCal = (await (await memberApp.request(calPath)).json()) as {
      meetupIds: string[];
    }[];
    expect(memberCal.flatMap((d) => d.meetupIds)).toContain(json.id);

    expect(
      (await post(outsiderApp, `/api/events/${json.id}/rsvp`, { status: 'going' })).status,
    ).toBe(404);
    expect((await post(memberApp, `/api/events/${json.id}/rsvp`, { status: 'going' })).status).toBe(
      200,
    );
    const mine = (await (await memberApp.request('/api/me/events')).json()) as {
      items: { id: string }[];
    };
    expect(mine.items.some((i) => i.id === json.id)).toBe(true);
  });

  it('a creator who left the club loses access; a leaving participant too', async () => {
    const club = await clubWithMembers();
    const { json } = await createClubMeetup(memberApp, club.id);
    await post(memberApp, `/api/events/${json.id}/rsvp`, { status: 'going' });
    await del(memberApp, `/api/clubs/${club.id}/members/me`);
    expect((await memberApp.request(`/api/events/${json.slug}`)).status).toBe(404);
    const mine = (await (await memberApp.request('/api/me/events')).json()) as {
      items: { id: string }[];
    };
    expect(mine.items.some((i) => i.id === json.id)).toBe(false);
  });

  it('only club members can be invited to a club meetup', async () => {
    const club = await clubWithMembers();
    await db
      .insert(friendships)
      .values(
        owner.id < friend.id
          ? { userA: owner.id, userB: friend.id }
          : { userA: friend.id, userB: owner.id },
      )
      .onConflictDoNothing();
    const { json } = await createClubMeetup(ownerApp, club.id);
    expect(
      (await post(ownerApp, `/api/events/${json.id}/invite`, { userIds: [friend.id] })).status,
    ).toBe(422);
  });

  it('switching a non-club meetup to club visibility without a club is 422', async () => {
    const created = await post(ownerApp, '/api/events', {
      title: 'Kèo công khai',
      startsAt: futureDate(4),
      addressLine: '1 Test',
      provinceCode: PROVINCE.code,
      visibility: 'public',
    });
    const meetup = (await created.json()) as { id: string };
    expect((await patch(ownerApp, `/api/events/${meetup.id}`, { visibility: 'club' })).status).toBe(
      422,
    );
  });

  it('deleting a club turns its club meetups private', async () => {
    const club = await clubWithMembers();
    const { json } = await createClubMeetup(ownerApp, club.id);
    expect((await del(ownerApp, `/api/clubs/${club.id}`)).status).toBe(204);
    const [row] = await db.select().from(meetups).where(eq(meetups.id, json.id));
    expect(row!.visibility).toBe('private');
    expect(row!.clubId).toBeNull();
  });
});

describe('club meetup write paths', () => {
  it('current members can manage tables and seats; ex-members get 404 on every write', async () => {
    const club = await clubWithMembers();
    const { json } = await createClubMeetup(memberApp, club.id);
    const meetupId = json.id;
    const tablePath = `/api/events/${meetupId}/tables`;

    const created = await post(memberApp, tablePath, { seats: 4 });
    expect(created.status).toBe(201);
    const { id: tableId } = (await created.json()) as { id: string };
    expect((await post(adminApp, `/api/events/${meetupId}/rsvp`, { status: 'going' })).status).toBe(
      200,
    );
    expect((await post(adminApp, `${tablePath}/${tableId}/seat`)).status).toBe(204);
    expect((await patch(memberApp, `${tablePath}/${tableId}`, { note: 'ok' })).status).toBe(200);
    expect((await patch(memberApp, `/api/events/${meetupId}`, { title: 'Sửa' })).status).toBe(200);

    expect((await post(ownerApp, `/api/events/${meetupId}/rsvp`, { status: 'going' })).status).toBe(
      200,
    );
    await del(ownerApp, `/api/clubs/${club.id}/members/${admin.id}`);
    await del(memberApp, `/api/clubs/${club.id}/members/me`);

    expect((await del(adminApp, `${tablePath}/${tableId}/seat`)).status).toBe(404);
    expect((await post(adminApp, `${tablePath}/${tableId}/seat`)).status).toBe(404);
    expect((await post(adminApp, tablePath, { seats: 3 })).status).toBe(404);
    expect((await post(memberApp, tablePath, { seats: 3 })).status).toBe(404);
    expect((await patch(memberApp, `${tablePath}/${tableId}`, { note: 'x' })).status).toBe(404);
    expect((await del(memberApp, `${tablePath}/${tableId}`)).status).toBe(404);
    expect((await patch(memberApp, `/api/events/${meetupId}`, { title: 'Sửa lại' })).status).toBe(
      404,
    );
    expect((await del(memberApp, `/api/events/${meetupId}`)).status).toBe(404);
    expect((await post(ownerApp, `${tablePath}`, { seats: 3 })).status).toBe(201);
  });
});

describe('external members', () => {
  const LOGIN_ID = `login-secret-${stamp}`;

  async function clubWithExternals() {
    const { club } = await createClub(ownerApp);
    await db.insert(clubExternalMembers).values([
      {
        clubId: club!.id,
        externalId: 'ext-1',
        nickname: 'Alpha',
        stats: { played: 7 },
        externalLoginId: LOGIN_ID,
      },
      { clubId: club!.id, externalId: 'ext-2', nickname: 'Beta', externalLoginId: 'dup-login' },
      { clubId: club!.id, externalId: 'ext-3', nickname: 'Gamma', externalLoginId: 'dup-login' },
    ]);
    return club!;
  }

  it('joining with an external id links the member; the login id never leaks', async () => {
    const club = await clubWithExternals();
    const res = await post(outsiderApp, `/api/clubs/join/${club.code}`, { externalId: 'ext-1' });
    expect(((await res.json()) as { externalMatched: boolean }).externalMatched).toBe(true);

    const [row] = await db
      .select()
      .from(clubExternalMembers)
      .where(
        and(eq(clubExternalMembers.clubId, club.id), eq(clubExternalMembers.externalId, 'ext-1')),
      );
    expect(row!.userId).toBe(outsider.id);

    const bodies = [
      await (await outsiderApp.request(`/api/clubs/${club.slug}`)).text(),
      await (await outsiderApp.request(`/api/clubs/${club.id}/external-members`)).text(),
      await (await ownerApp.request(`/api/clubs/${club.slug}`)).text(),
      await (await ownerApp.request(`/api/clubs/${club.id}/external-members`)).text(),
      await (await staffApp.request('/api/clubs-admin')).text(),
      await (await outsiderApp.request('/api/clubs')).text(),
    ];
    for (const body of bodies) expect(body).not.toContain(LOGIN_ID);
    const list = (await (
      await ownerApp.request(`/api/clubs/${club.id}/external-members`)
    ).json()) as {
      items: Record<string, unknown>[];
    };
    expect(list.items.every((i) => !('externalLoginId' in i))).toBe(true);
    expect(list.items.find((i) => i.externalId === 'ext-1')?.linkedUserId).toBe(outsider.id);
  });

  it('matches by login id too, and refuses unknown, ambiguous or already-claimed ids', async () => {
    const club = await clubWithExternals();
    const join = async (app: App, externalId: string) => {
      const res = await post(app, `/api/clubs/join/${club.code}`, { externalId });
      return ((await res.json()) as { externalMatched: boolean }).externalMatched;
    };
    expect(await join(memberApp, 'nope')).toBe(false);
    expect(await join(memberApp, 'dup-login')).toBe(false);
    expect(await join(memberApp, LOGIN_ID)).toBe(true);
    expect(await join(member2App, 'ext-1')).toBe(false);
  });

  it('existing members can match later; admin can unlink', async () => {
    const club = await clubWithExternals();
    await post(memberApp, `/api/clubs/join/${club.code}`);
    const match = await post(memberApp, `/api/clubs/${club.id}/external-match`, {
      externalId: 'dup-login',
    });
    expect(((await match.json()) as { matched: boolean }).matched).toBe(false);
    const ok = await post(memberApp, `/api/clubs/${club.id}/external-match`, {
      externalId: LOGIN_ID,
    });
    expect(((await ok.json()) as { matched: boolean }).matched).toBe(true);

    const [row] = await db
      .select()
      .from(clubExternalMembers)
      .where(
        and(eq(clubExternalMembers.clubId, club.id), eq(clubExternalMembers.externalId, 'ext-1')),
      );
    expect(
      (await del(memberApp, `/api/clubs/${club.id}/external-members/${row!.id}/link`)).status,
    ).toBe(403);
    expect(
      (await del(ownerApp, `/api/clubs/${club.id}/external-members/${row!.id}/link`)).status,
    ).toBe(204);
    const [after] = await db
      .select()
      .from(clubExternalMembers)
      .where(eq(clubExternalMembers.id, row!.id));
    expect(after!.userId).toBeNull();
  });

  it('only members can list external members', async () => {
    const club = await clubWithExternals();
    expect((await outsiderApp.request(`/api/clubs/${club.id}/external-members`)).status).toBe(403);
  });
});

describe('user deletion hand-over', () => {
  it('promotes the longest-standing admin, else the longest-standing member', async () => {
    const club = await clubWithMembers();
    await handOverClubsBeforeUserDelete(owner.id);
    const roles = await db
      .select({ userId: clubMembers.userId, role: clubMembers.role })
      .from(clubMembers)
      .where(eq(clubMembers.clubId, club.id));
    expect(roles.find((r) => r.userId === admin.id)?.role).toBe('owner');

    const second = await createClub(ownerApp);
    await post(member2App, `/api/clubs/join/${second.club!.code}`);
    await post(memberApp, `/api/clubs/join/${second.club!.code}`);
    await handOverClubsBeforeUserDelete(owner.id);
    const secondRoles = await db
      .select({ userId: clubMembers.userId, role: clubMembers.role })
      .from(clubMembers)
      .where(eq(clubMembers.clubId, second.club!.id));
    expect(secondRoles.find((r) => r.userId === member2.id)?.role).toBe('owner');
  });

  it('deletes a club left empty and turns its meetups private', async () => {
    const { club } = await createClub(ownerApp);
    const { json } = await createClubMeetup(ownerApp, club!.id);
    await handOverClubsBeforeUserDelete(owner.id);
    expect(await db.$count(clubs, eq(clubs.id, club!.id))).toBe(0);
    const [row] = await db.select().from(meetups).where(eq(meetups.id, json.id));
    expect(row!.visibility).toBe('private');
  });
});

describe('admin clubs', () => {
  it('lists and deletes clubs for staff only, with an audit row', async () => {
    const { club } = await createClub(ownerApp);
    expect((await ownerApp.request('/api/clubs-admin')).status).toBe(403);
    const list = (await (await staffApp.request('/api/clubs-admin')).json()) as {
      items: { id: string }[];
    };
    expect(list.items.some((c) => c.id === club!.id)).toBe(true);
    expect((await del(ownerApp, `/api/clubs-admin/${club!.id}`)).status).toBe(403);
    expect((await del(staffApp, `/api/clubs-admin/${club!.id}`)).status).toBe(204);
    expect(await db.$count(clubs, eq(clubs.id, club!.id))).toBe(0);
    expect(await db.$count(adminAuditLog, eq(adminAuditLog.targetId, club!.id))).toBe(1);
  });
});
