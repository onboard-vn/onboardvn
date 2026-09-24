import { inArray } from 'drizzle-orm';
import { afterAll, describe, expect, it } from 'vitest';
import { createApp } from '../../app.js';
import { db, pool } from '../../db/client.js';
import { categories } from '../../db/schema/index.js';
import { fakeAuth, fakeUser } from '../../test/fake-auth.js';

const maintainerApp = createApp({ auth: fakeAuth(fakeUser('maintainer')), rateLimit: false });
const publicApp = createApp({ auth: fakeAuth(null), rateLimit: false });

const createdIds: string[] = [];

afterAll(async () => {
  if (createdIds.length > 0) await db.delete(categories).where(inArray(categories.id, createdIds));
  await pool.end();
});

describe('categories', () => {
  it('accepts nameVi/kind/bggId on create and returns them publicly', async () => {
    const res = await maintainerApp.request('/api/categories', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        name: `Deck Building ${Date.now()}`,
        nameVi: 'Xây dựng bộ bài',
        kind: 'mechanic',
        bggId: 200_000 + (Date.now() % 100_000),
      }),
    });
    expect(res.status).toBe(201);
    const created = (await res.json()) as { id: string; nameVi: string | null };
    createdIds.push(created.id);
    expect(created.nameVi).toBe('Xây dựng bộ bài');

    const listRes = await publicApp.request('/api/categories?kind=mechanic');
    expect(listRes.status).toBe(200);
    const { items } = (await listRes.json()) as {
      items: { id: string; nameVi: string | null; kind: string }[];
    };
    const found = items.find((c) => c.id === created.id);
    expect(found?.nameVi).toBe('Xây dựng bộ bài');
    expect(found?.kind).toBe('mechanic');
  });
});
