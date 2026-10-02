import { createHash } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { db, pool } from '../../db/client.js';
import {
  identities,
  identityClaimTokens,
  meetupTableIdentities,
  playPlayers,
} from '../../db/schema/index.js';
import { createWorld, send, type World } from '../../test/play-world.js';

let w: World;
const app = (name: keyof World['users'] | null) => w.appFor(name ? w.users[name] : null);

interface Dto {
  id: string;
  displayName: string;
  birthYear?: number | null;
  clubId: string | null;
}

async function addGuest(as: keyof World['users'], body: object = {}) {
  const res = await send(app(as), 'POST', `/api/tables/${w.tableId}/guests`, body);
  return { res, json: (await res.json()) as Dto };
}

async function newPlayWith(identityIds: string[], id = crypto.randomUUID()) {
  const res = await send(app('host'), 'POST', '/api/plays', {
    id,
    meetupTableId: w.tableId,
    playerIdentityIds: identityIds,
  });
  expect(res.status).toBe(201);
  return id;
}

beforeAll(async () => {
  w = await createWorld('idn');
});
afterAll(async () => {
  await w.cleanup();
  await pool.end();
});

describe('guests', () => {
  it('adds a guest with a default name, club and hidden birth year for other members', async () => {
    const { res, json } = await addGuest('seated', { birthYear: 1990 });
    expect(res.status).toBe(201);
    expect(json.displayName).toBe(`Bạn của ${w.users.seated.name}`);
    expect(json.clubId).toBe(w.clubId);
    expect(json.birthYear).toBe(1990);

    const other = await (await send(app('other'), 'GET', `/api/tables/${w.tableId}`)).json();
    const seenByOther = (other as { seated: Dto[] }).seated.find((s) => s.id === json.id);
    expect(seenByOther).toBeDefined();
    expect('birthYear' in seenByOther!).toBe(false);

    const adminView = await (await send(app('admin'), 'GET', `/api/tables/${w.tableId}`)).json();
    expect((adminView as { seated: Dto[] }).seated.find((s) => s.id === json.id)?.birthYear).toBe(
      1990,
    );
  });

  it('only host, seated users and club admins may add guests; outsiders get 404', async () => {
    expect((await addGuest('host', { displayName: 'Khách A' })).res.status).toBe(201);
    expect((await addGuest('admin')).res.status).toBe(201);
    expect((await addGuest('other')).res.status).toBe(403);
    expect((await addGuest('outsider')).res.status).toBe(404);
  });

  it('rejects invalid birth years and respects table capacity', async () => {
    expect((await addGuest('host', { birthYear: 1800 })).res.status).toBe(422);
    expect((await addGuest('host', { birthYear: 2999 })).res.status).toBe(422);
    const seatsLeft =
      6 -
      (
        (await (await send(app('host'), 'GET', `/api/tables/${w.tableId}`)).json()) as {
          seated: Dto[];
        }
      ).seated.length;
    for (let i = 0; i < seatsLeft; i++) expect((await addGuest('host')).res.status).toBe(201);
    expect((await addGuest('host')).res.status).toBe(409);
  });

  it('lists club identities with search', async () => {
    const res = await send(app('other'), 'GET', `/api/clubs/${w.clubId}/identities?q=Khách A`);
    const items = ((await res.json()) as { items: Dto[] }).items;
    expect(items.map((i) => i.displayName)).toEqual(['Khách A']);
    expect((await send(app('outsider'), 'GET', `/api/clubs/${w.clubId}/identities`)).status).toBe(
      403,
    );
    const all = (
      (await (await send(app('other'), 'GET', `/api/clubs/${w.clubId}/identities`)).json()) as {
        items: Dto[];
      }
    ).items;
    expect(all.length).toBeGreaterThanOrEqual(6);
  });
});

describe('claim link', () => {
  it('merges seats and plays into the redeeming user and burns the token', async () => {
    const target = await freshGuest();
    const playId = await newPlayWith([target.id]);
    await send(app('host'), 'PATCH', `/api/plays/${playId}/values`, {
      ops: [{ opId: crypto.randomUUID(), identityId: target.id, categoryKey: 'coins', value: 9 }],
    });

    expect(
      (await send(app('other'), 'POST', `/api/identities/${target.id}/claim-links`)).status,
    ).toBe(404);
    const linkRes = await send(app('host'), 'POST', `/api/identities/${target.id}/claim-links`);
    expect(linkRes.status).toBe(201);
    const { token } = (await linkRes.json()) as { token: string };

    const [stored] = await db
      .select()
      .from(identityClaimTokens)
      .where(eq(identityClaimTokens.tokenHash, createHash('sha256').update(token).digest('hex')));
    expect(stored).toBeDefined();
    expect(JSON.stringify(stored)).not.toContain(token);

    const redeem = await send(app('outsider'), 'POST', '/api/identities/claim', { token });
    expect(redeem.status).toBe(200);
    const merged = ((await redeem.json()) as { identity: Dto & { userId: string } }).identity;
    expect(merged.userId).toBe(w.users.outsider.id);

    const rows = await db.select().from(playPlayers).where(eq(playPlayers.playId, playId));
    expect(rows.map((r) => r.identityId)).toEqual([merged.id]);
    expect(rows[0]!.computed?.total).toBe(3);
    const [tomb] = await db.select().from(identities).where(eq(identities.id, target.id));
    expect(tomb!.claimedAt).not.toBeNull();
    const seats = await db
      .select()
      .from(meetupTableIdentities)
      .where(eq(meetupTableIdentities.identityId, merged.id));
    expect(seats.map((s) => s.tableId)).toEqual([w.tableId]);

    const history = await send(app('outsider'), 'GET', '/api/me/plays');
    expect(
      ((await history.json()) as { items: { id: string }[] }).items.map((i) => i.id),
    ).toContain(playId);

    expect((await send(app('other'), 'POST', '/api/identities/claim', { token })).status).toBe(404);
  });

  it('rejects expired tokens', async () => {
    const guest = await freshGuest();
    const { token } = (await (
      await send(app('host'), 'POST', `/api/identities/${guest.id}/claim-links`)
    ).json()) as { token: string };
    await db
      .update(identityClaimTokens)
      .set({ expiresAt: new Date(Date.now() - 1000) })
      .where(eq(identityClaimTokens.tokenHash, createHash('sha256').update(token).digest('hex')));
    expect((await send(app('other'), 'POST', '/api/identities/claim', { token })).status).toBe(404);
  });
});

describe('self claim', () => {
  it('inviter or club admin approves; unrelated members cannot', async () => {
    const guest = await freshGuest();
    const claim = await send(app('other'), 'POST', `/api/identities/${guest.id}/claim-requests`, {
      tableId: w.tableId,
      note: 'Mình là khách này',
    });
    expect(claim.status).toBe(201);
    const requestId = ((await claim.json()) as { id: string }).id;
    expect(
      (
        await send(app('other'), 'POST', `/api/identities/${guest.id}/claim-requests`, {
          tableId: w.tableId,
        })
      ).status,
    ).toBe(409);
    expect(
      (
        await send(app('outsider'), 'POST', `/api/identities/${guest.id}/claim-requests`, {
          tableId: w.tableId,
        })
      ).status,
    ).toBe(404);

    expect(
      (await send(app('seated'), 'POST', `/api/identity-claim-requests/${requestId}/approve`))
        .status,
    ).toBe(404);
    const pending = await send(app('host'), 'GET', '/api/identity-claim-requests');
    expect(
      ((await pending.json()) as { items: { id: string }[] }).items.map((i) => i.id),
    ).toContain(requestId);

    const approved = await send(
      app('host'),
      'POST',
      `/api/identity-claim-requests/${requestId}/approve`,
    );
    expect(approved.status).toBe(200);
    expect(await approved.json()).toMatchObject({ status: 'approved' });
    const [tomb] = await db.select().from(identities).where(eq(identities.id, guest.id));
    expect(tomb).toMatchObject({ userId: w.users.other.id });
    expect(
      (await send(app('host'), 'POST', `/api/identity-claim-requests/${requestId}/approve`)).status,
    ).toBe(409);
  });

  it('club admin can reject', async () => {
    const guest = await freshGuest();
    const claim = await send(
      app('outsider'),
      'POST',
      `/api/identities/${guest.id}/claim-requests`,
      { tableId: w.tableId },
    );
    expect(claim.status).toBe(404);
    const second = await send(app('other'), 'POST', `/api/identities/${guest.id}/claim-requests`, {
      tableId: w.tableId,
    });
    const id = ((await second.json()) as { id: string }).id;
    const rejected = await send(app('admin'), 'POST', `/api/identity-claim-requests/${id}/reject`);
    expect(await rejected.json()).toMatchObject({ status: 'rejected' });
    const [row] = await db.select().from(identities).where(eq(identities.id, guest.id));
    expect(row!.claimedAt).toBeNull();
  });
});

async function freshGuest(): Promise<Dto> {
  await db.delete(meetupTableIdentities).where(eq(meetupTableIdentities.tableId, w.tableId));
  const { res, json } = await addGuest('host');
  expect(res.status).toBe(201);
  return json;
}
