import type { CafeConsentStatus, CafeMemberRole } from '@onboard/shared';
import { and, eq, inArray, isNull, sql } from 'drizzle-orm';
import { db } from '../../db/client.js';
import {
  cafeGameEvents,
  cafeGames,
  cafeInventoryImports,
  cafeMembers,
  cafeOwnerInvites,
  cafes,
  games,
  users,
} from '../../db/schema/index.js';

export type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export function findCafeMinimal(cafeId: string, tx: Tx | typeof db = db) {
  return tx
    .select({
      id: cafes.id,
      slug: cafes.slug,
      name: cafes.name,
      consentStatus: cafes.consentStatus,
    })
    .from(cafes)
    .where(eq(cafes.id, cafeId))
    .limit(1)
    .then((rows) => rows[0]);
}

/** Serializes concurrent invite creation for the same café so the partial-unique "one active
 * invite" index never raises 23505 — the loser just waits and revokes-then-inserts after. */
export async function lockCafeRow(cafeId: string, tx: Tx): Promise<boolean> {
  const rows = await tx
    .select({ id: cafes.id })
    .from(cafes)
    .where(eq(cafes.id, cafeId))
    .for('update');
  return rows.length > 0;
}

export function findCafeMember(cafeId: string, userId: string) {
  return db.query.cafeMembers.findFirst({
    where: and(eq(cafeMembers.cafeId, cafeId), eq(cafeMembers.userId, userId)),
  });
}

export async function insertCafeMember(
  cafeId: string,
  userId: string,
  role: CafeMemberRole,
  tx: Tx | typeof db = db,
): Promise<void> {
  await tx.insert(cafeMembers).values({ cafeId, userId, role }).onConflictDoNothing();
}

/** Invite acceptance always grants (or upgrades to) 'owner' — even if the accepting user was
 * already a 'staff' member of this café. */
export async function upsertCafeMemberAsOwner(
  cafeId: string,
  userId: string,
  tx: Tx,
): Promise<void> {
  await tx
    .insert(cafeMembers)
    .values({ cafeId, userId, role: 'owner' })
    .onConflictDoUpdate({
      target: [cafeMembers.cafeId, cafeMembers.userId],
      set: { role: 'owner' },
    });
}

export async function listCafeMembers(cafeId: string) {
  return db
    .select({
      userId: cafeMembers.userId,
      role: cafeMembers.role,
      createdAt: cafeMembers.createdAt,
      username: users.username,
      name: users.name,
    })
    .from(cafeMembers)
    .innerJoin(users, eq(users.id, cafeMembers.userId))
    .where(eq(cafeMembers.cafeId, cafeId));
}

export async function deleteCafeMember(cafeId: string, userId: string): Promise<boolean> {
  const rows = await db
    .delete(cafeMembers)
    .where(and(eq(cafeMembers.cafeId, cafeId), eq(cafeMembers.userId, userId)))
    .returning({ userId: cafeMembers.userId });
  return rows.length > 0;
}

export async function revokeActiveInvites(cafeId: string, tx: Tx | typeof db = db): Promise<void> {
  await tx
    .update(cafeOwnerInvites)
    .set({ revokedAt: new Date() })
    .where(
      and(
        eq(cafeOwnerInvites.cafeId, cafeId),
        isNull(cafeOwnerInvites.usedAt),
        isNull(cafeOwnerInvites.revokedAt),
      ),
    );
}

export async function insertInvite(
  values: typeof cafeOwnerInvites.$inferInsert,
  tx: Tx | typeof db = db,
) {
  const [row] = await tx.insert(cafeOwnerInvites).values(values).returning();
  return row!;
}

export function listInvites(cafeId: string) {
  return db.query.cafeOwnerInvites.findMany({
    where: eq(cafeOwnerInvites.cafeId, cafeId),
    orderBy: (t, { desc }) => desc(t.createdAt),
  });
}

export async function revokeInvite(cafeId: string, inviteId: string): Promise<boolean> {
  const rows = await db
    .update(cafeOwnerInvites)
    .set({ revokedAt: new Date() })
    .where(
      and(
        eq(cafeOwnerInvites.id, inviteId),
        eq(cafeOwnerInvites.cafeId, cafeId),
        isNull(cafeOwnerInvites.usedAt),
        isNull(cafeOwnerInvites.revokedAt),
      ),
    )
    .returning({ id: cafeOwnerInvites.id });
  return rows.length > 0;
}

export function findInviteByTokenHash(tokenHash: string) {
  return db.query.cafeOwnerInvites.findFirst({
    where: eq(cafeOwnerInvites.tokenHash, tokenHash),
    with: { cafe: { columns: { name: true } } },
  });
}

/** Row-locks the invite for the duration of the accept transaction so two concurrent accepts
 * can't both win. */
export async function findInviteByTokenHashForUpdate(tx: Tx, tokenHash: string) {
  const [row] = await tx
    .select({
      id: cafeOwnerInvites.id,
      cafeId: cafeOwnerInvites.cafeId,
      usedAt: cafeOwnerInvites.usedAt,
      revokedAt: cafeOwnerInvites.revokedAt,
      expiresAt: cafeOwnerInvites.expiresAt,
    })
    .from(cafeOwnerInvites)
    .where(eq(cafeOwnerInvites.tokenHash, tokenHash))
    .for('update');
  return row;
}

export async function markInviteUsed(id: string, usedBy: string, tx: Tx): Promise<void> {
  await tx
    .update(cafeOwnerInvites)
    .set({ usedAt: new Date(), usedBy })
    .where(eq(cafeOwnerInvites.id, id));
}

export async function updateConsent(
  cafeId: string,
  values: {
    consentStatus: CafeConsentStatus;
    consentNote?: string | null;
    verifiedAt?: Date | null;
  },
): Promise<void> {
  await db.update(cafes).set(values).where(eq(cafes.id, cafeId));
}

export async function countMembershipsForUser(userId: string): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(cafeMembers)
    .where(eq(cafeMembers.userId, userId));
  return row?.count ?? 0;
}

export function listMembershipsForUser(userId: string) {
  return db
    .select({
      cafeId: cafes.id,
      cafeSlug: cafes.slug,
      cafeName: cafes.name,
      role: cafeMembers.role,
      consentStatus: cafes.consentStatus,
    })
    .from(cafeMembers)
    .innerJoin(cafes, eq(cafes.id, cafeMembers.cafeId))
    .where(eq(cafeMembers.userId, userId));
}

export async function findUserIdByUsername(username: string): Promise<string | undefined> {
  const [row] = await db.select({ id: users.id }).from(users).where(eq(users.username, username));
  return row?.id;
}

export async function findAdminEmails(): Promise<string[]> {
  const rows = await db.select({ email: users.email }).from(users).where(eq(users.role, 'admin'));
  return rows.map((r) => r.email);
}

export async function findExistingGameIds(gameIds: string[]): Promise<Set<string>> {
  if (gameIds.length === 0) return new Set();
  const rows = await db.select({ id: games.id }).from(games).where(inArray(games.id, gameIds));
  return new Set(rows.map((r) => r.id));
}

/** Upserts inventory copies for the given games in a single statement; never touches rows for
 * games not in `items`. */
/** Writes one `add` event for a newly inserted row, one `confirm` for a row that was previously
 * `source: 'community'` (the import "claims" it back for the owner) — an already owner/staff row
 * gets no event since only its copies/addedVia changed. */
export async function upsertCafeGamesTx(
  tx: Tx,
  cafeId: string,
  items: { gameId: string; copies: number }[],
  actorId: string,
): Promise<void> {
  if (items.length === 0) return;

  const gameIds = items.map((item) => item.gameId);
  const existing = await tx
    .select({ gameId: cafeGames.gameId, source: cafeGames.source })
    .from(cafeGames)
    .where(and(eq(cafeGames.cafeId, cafeId), inArray(cafeGames.gameId, gameIds)));
  const existingSourceByGameId = new Map(existing.map((row) => [row.gameId, row.source]));

  await tx
    .insert(cafeGames)
    .values(
      items.map((item) => ({
        cafeId,
        gameId: item.gameId,
        copies: item.copies,
        addedVia: 'import' as const,
        source: 'owner' as const,
      })),
    )
    .onConflictDoUpdate({
      target: [cafeGames.cafeId, cafeGames.gameId],
      set: {
        copies: sql`excluded.copies`,
        addedVia: sql`excluded.added_via`,
        source: sql`excluded.source`,
      },
    });

  const events: (typeof cafeGameEvents.$inferInsert)[] = [];
  for (const item of items) {
    const previousSource = existingSourceByGameId.get(item.gameId);
    if (previousSource === undefined) {
      events.push({ cafeId, gameId: item.gameId, userId: actorId, action: 'add', source: 'owner' });
    } else if (previousSource === 'community') {
      events.push({
        cafeId,
        gameId: item.gameId,
        userId: actorId,
        action: 'confirm',
        source: 'owner',
      });
    }
  }
  if (events.length > 0) await tx.insert(cafeGameEvents).values(events);
}

export async function insertInventoryImportAudit(
  tx: Tx,
  cafeId: string,
  userId: string,
  rowsApplied: number,
): Promise<void> {
  await tx.insert(cafeInventoryImports).values({ cafeId, userId, rowsApplied });
}
