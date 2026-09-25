import type { Role } from '@onboard/shared';
import type { AppDeps } from '../app.js';
import type { SessionUser } from '../types.js';

export function fakeUser(role: Role = 'user') {
  const now = new Date();
  return {
    id: `u-${role}`,
    name: `Test ${role}`,
    email: `${role}@example.test`,
    emailVerified: true,
    image: null,
    role,
    createdAt: now,
    updatedAt: now,
    profileVisibility: 'public',
    playsVisibility: 'public',
    friendsVisibility: 'friends',
    emailOnFriendRequest: false,
  } satisfies SessionUser;
}

/** Stub for route tests that do not need a real Better Auth session. */
export function fakeAuth(user: SessionUser | null): AppDeps['auth'] {
  const session = user
    ? {
        id: 's1',
        token: 't',
        userId: user.id,
        expiresAt: new Date(Date.now() + 60_000),
        createdAt: new Date(),
        updatedAt: new Date(),
        ipAddress: null,
        userAgent: null,
      }
    : null;
  return {
    api: { getSession: async () => (user ? { user, session } : null) },
    handler: async () => new Response(null, { status: 404 }),
  } as unknown as AppDeps['auth'];
}
