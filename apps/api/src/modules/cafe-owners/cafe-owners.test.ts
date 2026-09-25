import { createHash } from 'node:crypto';
import { eq, inArray } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../../app.js';
import { db, pool } from '../../db/client.js';
import {
  cafeGames,
  cafeMembers,
  cafeOwnerInvites,
  cafes,
  games,
  provinces,
  users,
  wards,
} from '../../db/schema/index.js';
import { onMailSent } from '../../lib/mailer/index.js';
import { fakeAuth, fakeUser } from '../../test/fake-auth.js';

function fakeUserWithId(id: string, role: 'user' | 'admin' = 'user') {
  const base = fakeUser(role);
  return { ...base, id, email: `${id}@example.test` };
}

const maintainer = fakeUser('maintainer');
const admin = fakeUserWithId('u-cafe-admin', 'admin');
const ownerA = fakeUserWithId('u-cafe-owner-a');
const ownerB = fakeUserWithId('u-cafe-owner-b');
const staffMember = fakeUserWithId('u-cafe-staff');
const stranger = fakeUserWithId('u-cafe-stranger');

const maintainerApp = createApp({ auth: fakeAuth(maintainer), rateLimit: false });
const ownerAApp = createApp({ auth: fakeAuth(ownerA), rateLimit: false });
const ownerBApp = createApp({ auth: fakeAuth(ownerB), rateLimit: false });
const staffApp = createApp({ auth: fakeAuth(staffMember), rateLimit: false });
const strangerApp = createApp({ auth: fakeAuth(stranger), rateLimit: false });
const publicApp = createApp({ auth: fakeAuth(null), rateLimit: false });

const PROVINCE = { code: 'p7-t1', name: 'Tỉnh P7', slug: 'p7-tinh' };
const WARD = { code: 'p7-w1', provinceCode: PROVINCE.code, name: 'Phường P7', slug: 'p7-phuong' };

const allUsers = [maintainer, admin, ownerA, ownerB, staffMember, stranger];
const cafeIds: string[] = [];

beforeAll(async () => {
  for (const u of allUsers) {
    await db
      .insert(users)
      .values({ ...u, username: u.id })
      .onConflictDoNothing({ target: users.id });
  }
  await db.insert(provinces).values(PROVINCE).onConflictDoNothing();
  await db.insert(wards).values(WARD).onConflictDoNothing();
});

afterAll(async () => {
  if (cafeIds.length > 0) {
    await db.delete(cafeMembers).where(inArray(cafeMembers.cafeId, cafeIds));
    await db.delete(cafeOwnerInvites).where(inArray(cafeOwnerInvites.cafeId, cafeIds));
    await db.delete(cafes).where(inArray(cafes.id, cafeIds));
  }
  await db.delete(users).where(
    inArray(
      users.id,
      allUsers.map((u) => u.id),
    ),
  );
  await db.delete(wards).where(eq(wards.code, WARD.code));
  await db.delete(provinces).where(eq(provinces.code, PROVINCE.code));
  await pool.end();
});

async function createCafe(overrides: Record<string, unknown> = {}) {
  const res = await maintainerApp.request('/api/cafes', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      name: `Quán P7 ${Date.now()}-${Math.random()}`,
      provinceCode: PROVINCE.code,
      wardCode: WARD.code,
      addressLine: '1 Test St',
      consentStatus: 'public_info_only',
      sourceUrl: 'https://example.test',
      ...overrides,
    }),
  });
  const json = (await res.json()) as { id: string; slug: string };
  cafeIds.push(json.id);
  return json;
}

describe('owner invites', () => {
  it('creates, previews, accepts, and revoking an old invite when a new one is issued', async () => {
    const cafe = await createCafe();

    const createRes = await maintainerApp.request(`/api/cafes/${cafe.id}/owner-invites`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
    });
    expect(createRes.status).toBe(201);
    const { url } = (await createRes.json()) as { url: string; expiresAt: string };
    const token = url.split('/').pop()!;

    const previewRes = await publicApp.request(`/api/owner-invites/${token}`);
    expect(previewRes.status).toBe(200);
    expect((await previewRes.json()) as { status: string }).toMatchObject({ status: 'valid' });

    // Issuing a second invite must revoke the first.
    const secondRes = await maintainerApp.request(`/api/cafes/${cafe.id}/owner-invites`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
    });
    const { url: secondUrl } = (await secondRes.json()) as { url: string };
    const oldPreview = await publicApp.request(`/api/owner-invites/${token}`);
    expect((await oldPreview.json()) as { status: string }).toMatchObject({ status: 'revoked' });

    const secondToken = secondUrl.split('/').pop()!;
    const acceptRes = await ownerAApp.request(`/api/owner-invites/${secondToken}/accept`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
    });
    expect(acceptRes.status).toBe(200);

    const member = await db.query.cafeMembers.findFirst({
      where: (t, { and, eq: eqOp }) => and(eqOp(t.cafeId, cafe.id), eqOp(t.userId, ownerA.id)),
    });
    expect(member?.role).toBe('owner');

    // Reuse -> 410.
    const reuseRes = await ownerBApp.request(`/api/owner-invites/${secondToken}/accept`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
    });
    expect(reuseRes.status).toBe(410);

    // No raw token stored.
    const rows = await db
      .select({ tokenHash: cafeOwnerInvites.tokenHash })
      .from(cafeOwnerInvites)
      .where(eq(cafeOwnerInvites.cafeId, cafe.id));
    for (const row of rows) {
      expect(row.tokenHash).not.toBe(secondToken);
      expect(row.tokenHash).not.toBe(token);
    }
  });

  it('rejects an expired invite with 410', async () => {
    const cafe = await createCafe();
    const rawToken = 'expired-raw-token-test';
    const [invite] = await db
      .insert(cafeOwnerInvites)
      .values({
        tokenHash: createHash('sha256').update(rawToken).digest('hex'),
        cafeId: cafe.id,
        createdBy: maintainer.id,
        expiresAt: new Date(Date.now() - 1000),
      })
      .returning();
    expect(invite).toBeDefined();

    const previewRes = await publicApp.request(`/api/owner-invites/${rawToken}`);
    expect(previewRes.status).toBe(200);
    expect((await previewRes.json()) as { status: string }).toMatchObject({ status: 'expired' });

    const acceptRes = await strangerApp.request(`/api/owner-invites/${rawToken}/accept`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
    });
    expect(acceptRes.status).toBe(410);
  });

  it('returns 404 for an unknown token', async () => {
    const res = await publicApp.request('/api/owner-invites/does-not-exist');
    expect(res.status).toBe(404);
  });

  it('forbids a regular user from creating an invite', async () => {
    const cafe = await createCafe();
    const res = await strangerApp.request(`/api/cafes/${cafe.id}/owner-invites`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
    });
    expect(res.status).toBe(403);
  });

  it('accepting an old token after a new invite was issued returns 410, not the new one', async () => {
    const cafe = await createCafe();
    const firstRes = await maintainerApp.request(`/api/cafes/${cafe.id}/owner-invites`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
    });
    const { url: firstUrl } = (await firstRes.json()) as { url: string };
    const firstToken = firstUrl.split('/').pop()!;

    await maintainerApp.request(`/api/cafes/${cafe.id}/owner-invites`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
    });

    const acceptOldRes = await strangerApp.request(`/api/owner-invites/${firstToken}/accept`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
    });
    expect(acceptOldRes.status).toBe(410);
  });

  it('exactly one of two concurrent accepts on the same token succeeds', async () => {
    const cafe = await createCafe();
    const createRes = await maintainerApp.request(`/api/cafes/${cafe.id}/owner-invites`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
    });
    const { url } = (await createRes.json()) as { url: string };
    const token = url.split('/').pop()!;

    const [resA, resB] = await Promise.all([
      ownerAApp.request(`/api/owner-invites/${token}/accept`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
      }),
      ownerBApp.request(`/api/owner-invites/${token}/accept`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
      }),
    ]);
    const statuses = [resA.status, resB.status].sort();
    expect(statuses).toEqual([200, 410]);
  });

  it('lets a café staff member who accepts an invite become the owner (not stuck as staff)', async () => {
    const cafe = await createCafe();
    await db
      .insert(cafeMembers)
      .values({ cafeId: cafe.id, userId: staffMember.id, role: 'staff' })
      .onConflictDoNothing();

    const createRes = await maintainerApp.request(`/api/cafes/${cafe.id}/owner-invites`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
    });
    const { url } = (await createRes.json()) as { url: string };
    const token = url.split('/').pop()!;

    const acceptRes = await staffApp.request(`/api/owner-invites/${token}/accept`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
    });
    expect(acceptRes.status).toBe(200);

    const member = await db.query.cafeMembers.findFirst({
      where: (t, { and, eq: eqOp }) => and(eqOp(t.cafeId, cafe.id), eqOp(t.userId, staffMember.id)),
    });
    expect(member?.role).toBe('owner');
  });
});

describe('café-scoped role', () => {
  async function seedOwnerAndStaff(cafeId: string) {
    await db
      .insert(cafeMembers)
      .values([
        { cafeId, userId: ownerA.id, role: 'owner' },
        { cafeId, userId: staffMember.id, role: 'staff' },
      ])
      .onConflictDoNothing();
  }

  it('lets the owner PATCH their café but strips sourceUrl/consentStatus', async () => {
    const cafe = await createCafe();
    await seedOwnerAndStaff(cafe.id);

    const res = await ownerAApp.request(`/api/cafes/${cafe.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        addressLine: 'Địa chỉ mới',
        sourceUrl: 'https://evil.example/hijack',
        consentStatus: 'granted',
      }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { addressLine: string; sourceUrl?: string };
    expect(body.addressLine).toBe('Địa chỉ mới');
    // The owner DTO does expose sourceUrl (read-only) — it just must stay untouched by the PATCH.
    expect(body.sourceUrl).toBe('https://example.test');

    const row = await db.query.cafes.findFirst({ where: eq(cafes.id, cafe.id) });
    expect(row?.consentStatus).toBe('public_info_only');
    expect(row?.sourceUrl).toBe('https://example.test');
  });

  it('403s an owner of a different café for every switched route', async () => {
    const cafe = await createCafe();
    await seedOwnerAndStaff(cafe.id);

    const otherCafe = await createCafe();
    await db.insert(cafeMembers).values({ cafeId: otherCafe.id, userId: ownerB.id, role: 'owner' });

    const patchRes = await ownerBApp.request(`/api/cafes/${cafe.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ addressLine: 'x' }),
    });
    expect(patchRes.status).toBe(403);

    const postGameRes = await ownerBApp.request(`/api/cafes/${cafe.id}/games`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ gameId: '00000000-0000-0000-0000-000000000000' }),
    });
    expect(postGameRes.status).toBe(403);

    const bulkRes = await ownerBApp.request(`/api/cafes/${cafe.id}/games/bulk`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ gameIds: ['00000000-0000-0000-0000-000000000000'] }),
    });
    expect(bulkRes.status).toBe(403);

    const strangerRes = await strangerApp.request(`/api/cafes/${cafe.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ addressLine: 'x' }),
    });
    expect(strangerRes.status).toBe(403);
  });

  it('lets café staff PATCH like the owner', async () => {
    const cafe = await createCafe();
    await seedOwnerAndStaff(cafe.id);

    const res = await staffApp.request(`/api/cafes/${cafe.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ addressLine: 'Sửa bởi staff' }),
    });
    expect(res.status).toBe(200);
  });

  it('403s an owner of a different café for PATCH and DELETE on /games/:gameId', async () => {
    const cafe = await createCafe();
    await seedOwnerAndStaff(cafe.id);
    const [game] = await db
      .insert(games)
      .values({ slug: `p7-game-${Date.now()}`, nameEn: 'P7 Game' })
      .returning();
    await db.insert(cafeGames).values({ cafeId: cafe.id, gameId: game!.id, addedBy: ownerA.id });

    const otherCafe = await createCafe();
    await db.insert(cafeMembers).values({ cafeId: otherCafe.id, userId: ownerB.id, role: 'owner' });

    const patchRes = await ownerBApp.request(`/api/cafes/${cafe.id}/games/${game!.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ copies: 5 }),
    });
    expect(patchRes.status).toBe(403);

    const deleteRes = await ownerBApp.request(`/api/cafes/${cafe.id}/games/${game!.id}`, {
      method: 'DELETE',
      headers: { 'content-type': 'application/json' },
    });
    expect(deleteRes.status).toBe(403);

    await db.delete(cafeGames).where(eq(cafeGames.cafeId, cafe.id));
    await db.delete(games).where(eq(games.id, game!.id));
  });

  it('rejects a non-UUID :id with 4xx, not a 500', async () => {
    const res = await ownerAApp.request('/api/cafes/not-a-uuid', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ addressLine: 'x' }),
    });
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.status).toBeLessThan(500);
  });

  it('owner DTO excludes addedBy/createdBy/consentNote, and PATCH consentNote is ignored', async () => {
    const cafe = await createCafe({ consentNote: 'ghi chú nội bộ ban đầu' });
    await db.insert(cafeMembers).values({ cafeId: cafe.id, userId: ownerA.id, role: 'owner' });

    const res = await ownerAApp.request(`/api/cafes/${cafe.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ addressLine: 'x', consentNote: 'chủ quán tự ghi' }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body).not.toHaveProperty('consentNote');
    expect(body).not.toHaveProperty('createdBy');
    for (const item of body.inventory as Record<string, unknown>[]) {
      expect(item).not.toHaveProperty('addedBy');
    }

    const row = await db.query.cafes.findFirst({ where: eq(cafes.id, cafe.id) });
    expect(row?.consentNote).toBe('ghi chú nội bộ ban đầu');
  });

  it('lets the owner still read /manage of their own declined café', async () => {
    const cafe = await createCafe({ consentStatus: 'declined' });
    await db.insert(cafeMembers).values({ cafeId: cafe.id, userId: ownerA.id, role: 'owner' });

    const res = await ownerAApp.request(`/api/cafes/${cafe.id}/manage`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { consentStatus: string };
    expect(body.consentStatus).toBe('declined');
  });
});

describe('consent', () => {
  it('owner decline hides the café publicly and notifies admin; owner can re-enable', async () => {
    const cafe = await createCafe();
    await db.insert(cafeMembers).values({ cafeId: cafe.id, userId: ownerA.id, role: 'owner' });

    const sent: string[] = [];
    const stop = onMailSent((m) => sent.push(m.to));

    const declineRes = await ownerAApp.request(`/api/me/cafes/${cafe.id}/consent`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ decision: 'declined', reason: 'không muốn hiện nữa' }),
    });
    expect(declineRes.status).toBe(204);

    await new Promise((r) => setTimeout(r, 20));
    stop();
    expect(sent).toContain(admin.email);

    const detailRes = await publicApp.request(`/api/cafes/${cafe.slug}`);
    expect(detailRes.status).toBe(404);

    const listRes = await publicApp.request(`/api/cafes?province=${PROVINCE.slug}`);
    const listBody = (await listRes.json()) as { items: { id: string }[] };
    expect(listBody.items.some((c) => c.id === cafe.id)).toBe(false);

    const grantRes = await ownerAApp.request(`/api/me/cafes/${cafe.id}/consent`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ decision: 'granted' }),
    });
    expect(grantRes.status).toBe(204);

    const afterGrantRes = await publicApp.request(`/api/cafes/${cafe.slug}`);
    expect(afterGrantRes.status).toBe(200);
  });

  it('clears the old decline reason from consentNote when the owner re-grants', async () => {
    const cafe = await createCafe();
    await db.insert(cafeMembers).values({ cafeId: cafe.id, userId: ownerA.id, role: 'owner' });

    await ownerAApp.request(`/api/me/cafes/${cafe.id}/consent`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ decision: 'declined', reason: 'lý do từ chối cũ' }),
    });
    await ownerAApp.request(`/api/me/cafes/${cafe.id}/consent`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ decision: 'granted' }),
    });

    const row = await db.query.cafes.findFirst({ where: eq(cafes.id, cafe.id) });
    expect(row?.consentNote).toBeNull();
  });

  it('forbids café staff (non-owner) from changing consent', async () => {
    const cafe = await createCafe();
    await db.insert(cafeMembers).values([
      { cafeId: cafe.id, userId: ownerA.id, role: 'owner' },
      { cafeId: cafe.id, userId: staffMember.id, role: 'staff' },
    ]);

    const res = await staffApp.request(`/api/me/cafes/${cafe.id}/consent`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ decision: 'granted' }),
    });
    expect(res.status).toBe(403);
  });
});

describe('staff invites and memberships', () => {
  it('owner adds a staff member by username, and GET /me/cafes lists it', async () => {
    const cafe = await createCafe();
    await db.insert(cafeMembers).values({ cafeId: cafe.id, userId: ownerA.id, role: 'owner' });

    const addRes = await ownerAApp.request(`/api/me/cafes/${cafe.id}/staff`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ username: stranger.id }),
    });
    expect(addRes.status).toBe(204);

    const member = await db.query.cafeMembers.findFirst({
      where: (t, { and, eq: eqOp }) => and(eqOp(t.cafeId, cafe.id), eqOp(t.userId, stranger.id)),
    });
    expect(member?.role).toBe('staff');

    const listRes = await ownerAApp.request('/api/me/cafes');
    const listBody = (await listRes.json()) as { items: { cafeId: string; role: string }[] };
    expect(listBody.items).toContainEqual(
      expect.objectContaining({ cafeId: cafe.id, role: 'owner' }),
    );
  });
});

describe('admin members management', () => {
  it('lists and removes a café member (staff-only)', async () => {
    const cafe = await createCafe();
    await db.insert(cafeMembers).values({ cafeId: cafe.id, userId: ownerA.id, role: 'owner' });

    const forbiddenRes = await strangerApp.request(`/api/cafes/${cafe.id}/members`);
    expect(forbiddenRes.status).toBe(403);

    const listRes = await maintainerApp.request(`/api/cafes/${cafe.id}/members`);
    expect(listRes.status).toBe(200);
    const listBody = (await listRes.json()) as { items: { userId: string }[] };
    expect(listBody.items.some((m) => m.userId === ownerA.id)).toBe(true);

    const deleteRes = await maintainerApp.request(`/api/cafes/${cafe.id}/members/${ownerA.id}`, {
      method: 'DELETE',
      headers: { 'content-type': 'application/json' },
    });
    expect(deleteRes.status).toBe(204);

    const member = await db.query.cafeMembers.findFirst({
      where: (t, { and, eq: eqOp }) => and(eqOp(t.cafeId, cafe.id), eqOp(t.userId, ownerA.id)),
    });
    expect(member).toBeUndefined();
  });
});
