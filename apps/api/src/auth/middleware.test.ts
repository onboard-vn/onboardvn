import { Hono } from 'hono';
import { describe, expect, it } from 'vitest';
import { errorHandler } from '../lib/error-handler.js';
import { fakeAuth, fakeUser } from '../test/fake-auth.js';
import type { AppEnv, SessionUser } from '../types.js';
import { requireRole, sessionMiddleware } from './middleware.js';

const buildApp = (user: SessionUser | null) =>
  new Hono<AppEnv>()
    .use(sessionMiddleware(fakeAuth(user)))
    .get('/maintainer-only', requireRole('maintainer', 'admin'), (c) => c.json({ ok: true }))
    .onError(errorHandler);

describe('requireRole', () => {
  it('returns 401 for anonymous requests', async () => {
    const res = await buildApp(null).request('/maintainer-only');
    expect(res.status).toBe(401);
    expect(await res.json()).toMatchObject({ error: { code: 'UNAUTHENTICATED' } });
  });

  it('returns 403 for a regular user', async () => {
    const res = await buildApp(fakeUser('user')).request('/maintainer-only');
    expect(res.status).toBe(403);
    expect(await res.json()).toMatchObject({ error: { code: 'FORBIDDEN' } });
  });

  it.each(['maintainer', 'admin'] as const)('allows %s', async (role) => {
    const res = await buildApp(fakeUser(role)).request('/maintainer-only');
    expect(res.status).toBe(200);
  });
});
