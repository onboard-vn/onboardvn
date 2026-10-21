import { createHash, randomUUID } from 'node:crypto';
import { eq, inArray } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { db, pool } from '../../db/client.js';
import { clubMembers, clubs, users } from '../../db/schema/index.js';
import { ApiError } from '../../lib/errors.js';
import { fakeUser } from '../../test/fake-auth.js';
import { requireClubMemberOr404 } from './member-guard.js';

const stamp = Date.now();
const member = {
  ...fakeUser('user'),
  id: `u-club-guard-member-${stamp}`,
  email: `club-guard-member-${stamp}@example.test`,
  username: `club_guard_member_${stamp}`,
};
const nonMember = {
  ...fakeUser('user'),
  id: `u-club-guard-outsider-${stamp}`,
  email: `club-guard-outsider-${stamp}@example.test`,
  username: `club_guard_outsider_${stamp}`,
};
let clubId = '';

beforeAll(async () => {
  await db.insert(users).values([member, nonMember]).onConflictDoNothing({ target: users.id });
  const [club] = await db
    .insert(clubs)
    .values({
      slug: `club-guard-${stamp}`,
      name: 'Guard test club',
      inviteCodeHash: createHash('sha256').update(`club-guard-${stamp}`).digest('hex'),
      createdBy: member.id,
    })
    .returning({ id: clubs.id });
  if (!club) throw new Error('Expected the test club to be created');
  clubId = club.id;
  await db.insert(clubMembers).values({ clubId, userId: member.id, role: 'owner' });
});

afterAll(async () => {
  if (clubId) await db.delete(clubs).where(eq(clubs.id, clubId));
  await db.delete(users).where(inArray(users.id, [member.id, nonMember.id]));
  await pool.end();
});

async function errorResponse(clubId: string, userId: string | null | undefined) {
  try {
    await requireClubMemberOr404(clubId, userId);
  } catch (error) {
    if (error instanceof ApiError) return { status: error.status, body: error.toBody() };
    throw error;
  }
  throw new Error('Expected the membership guard to reject access');
}

describe('requireClubMemberOr404', () => {
  it('allows a club member', async () => {
    await expect(requireClubMemberOr404(clubId, member.id)).resolves.toBeUndefined();
  });

  it('returns the same 404 for non-members, anonymous users, and unknown clubs', async () => {
    const [unknownClub, anonymous, nonMemberResponse] = await Promise.all([
      errorResponse(randomUUID(), member.id),
      errorResponse(clubId, undefined),
      errorResponse(clubId, nonMember.id),
    ]);
    const expected = {
      status: 404,
      body: { error: { code: 'NOT_FOUND', message: 'Không tìm thấy club' } },
    };

    expect(unknownClub).toEqual(expected);
    expect(anonymous).toEqual(expected);
    expect(nonMemberResponse).toEqual(expected);
    expect(unknownClub).toEqual(anonymous);
    expect(anonymous).toEqual(nonMemberResponse);
  });
});
