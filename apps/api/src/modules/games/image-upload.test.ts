import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../../app.js';
import { db, pool } from '../../db/client.js';
import { storage } from '../../lib/storage/index.js';
import { games, users } from '../../db/schema/index.js';
import { fakeAuth, fakeUser } from '../../test/fake-auth.js';

const ORIGIN = 'http://localhost:3000';
const maintainer = fakeUser('maintainer');
const maintainerApp = createApp({ auth: fakeAuth(maintainer), rateLimit: false });

let gameId: string;
let uploadedImageKey: string | null = null;

beforeAll(async () => {
  await db
    .insert(users)
    .values({ ...maintainer, role: 'maintainer' })
    .onConflictDoNothing({ target: users.id });

  const res = await maintainerApp.request('/api/games', {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: ORIGIN },
    body: JSON.stringify({ nameEn: `Image Upload Test ${Date.now()}`, acceptLicense: true }),
  });
  const json = (await res.json()) as { id: string };
  gameId = json.id;
});

afterAll(async () => {
  if (uploadedImageKey) await storage.delete(uploadedImageKey);
  await db.delete(games).where(eq(games.id, gameId));
  await db.delete(users).where(eq(users.id, maintainer.id));
  await pool.end();
});

describe('game image upload', () => {
  it('serves an uploaded image at the returned imageUrl', async () => {
    const form = new FormData();
    form.set('file', new File([new Uint8Array([1, 2, 3, 4])], 'cover.png', { type: 'image/png' }));

    const uploadRes = await maintainerApp.request(`/api/games/${gameId}/image`, {
      method: 'POST',
      headers: { origin: ORIGIN },
      body: form,
    });
    expect(uploadRes.status).toBe(200);

    const game = (await uploadRes.json()) as { imageUrl: string | null };
    expect(game.imageUrl).toMatch(/^\/api\/uploads\//);
    uploadedImageKey = game.imageUrl!.replace('/api/uploads/', '');

    const getRes = await maintainerApp.request(game.imageUrl!);
    expect(getRes.status).toBe(200);
    expect(getRes.headers.get('content-type')).toContain('image/png');
    expect(getRes.headers.get('x-content-type-options')).toBe('nosniff');

    const limitedApp = createApp({ auth: fakeAuth(null), rateLimit: true });
    const control = await limitedApp.request('/api/games');
    expect(control.headers.get('ratelimit')).not.toBeNull();
    const image = await limitedApp.request(game.imageUrl!);
    expect(image.status).toBe(200);
    expect(image.headers.get('ratelimit')).toBeNull();
  });
});
