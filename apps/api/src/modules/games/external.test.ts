import { eq, inArray } from 'drizzle-orm';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../../app.js';
import { db, pool } from '../../db/client.js';
import { gameExternalMetadata, games, users } from '../../db/schema/index.js';
import { env } from '../../lib/env.js';
import { fakeAuth, fakeUser } from '../../test/fake-auth.js';
import { htmlToPlainText, toExternalDto } from './external.js';

const user = fakeUser('user');
const userApp = createApp({ auth: fakeAuth(user), rateLimit: false });
const publicApp = createApp({ auth: fakeAuth(null), rateLimit: false });

const slug = `ext-meta-${Date.now()}`;
let gameId = '';

const payload = {
  item: {
    description:
      'Fight &amp; win.<br/><br/>&#10;<script>alert(1)</script><iframe src="x"></iframe><b>Bold</b>',
    short_description: 'Short &quot;one&quot;',
    imageurl: 'https://cf.geekdo-images.com/full.jpg',
    images: { thumb: 'https://cf.geekdo-images.com/thumb.jpg', square200: 'javascript:alert(1)' },
    href: '/boardgame/1/ext',
  },
};

beforeAll(async () => {
  await db
    .insert(users)
    .values({ ...user, role: 'user' })
    .onConflictDoNothing({ target: users.id });
  const [row] = await db
    .insert(games)
    .values({ slug, nameEn: slug, createdBy: user.id })
    .returning({ id: games.id });
  gameId = row!.id;
  await db.insert(gameExternalMetadata).values({
    gameId,
    source: 'bgg',
    externalId: slug,
    payload,
    fetchedAt: new Date(),
  });
});

afterEach(() => {
  env.SHOW_EXTERNAL_METADATA = false;
});

afterAll(async () => {
  await db.delete(gameExternalMetadata).where(eq(gameExternalMetadata.gameId, gameId));
  await db.delete(games).where(inArray(games.id, [gameId]));
  await db.delete(users).where(eq(users.id, user.id));
  await pool.end();
});

describe('htmlToPlainText', () => {
  it('strips scripts, tags and decodes entities', () => {
    expect(htmlToPlainText(payload.item.description)).toBe('Fight & win.\n\nBold');
  });
});

describe('toExternalDto', () => {
  it('rejects non-https urls and falls back', () => {
    const dto = toExternalDto(payload);
    expect(dto.thumbUrl).toBe('https://cf.geekdo-images.com/thumb.jpg');
    expect(dto.bggUrl).toBe('https://boardgamegeek.com/boardgame/1/ext');
    expect(dto.attribution).toBe('BoardGameGeek');
  });

  it('tolerates malformed payloads', () => {
    expect(toExternalDto(null)).toMatchObject({ description: null, imageUrl: null, bggUrl: null });
  });
});

describe('external metadata gating', () => {
  it('omits external when flag is off, even for authenticated users', async () => {
    const res = await userApp.request(`/api/games/${slug}`);
    expect(await res.json()).not.toHaveProperty('external');
  });

  it('omits external for anonymous requests when flag is on', async () => {
    env.SHOW_EXTERNAL_METADATA = true;
    const res = await publicApp.request(`/api/games/${slug}`);
    expect(await res.json()).not.toHaveProperty('external');
    const list = (await (await publicApp.request(`/api/games?q=${slug}`)).json()) as {
      items: object[];
    };
    expect(list.items[0]).not.toHaveProperty('externalThumbUrl');
  });

  it('includes sanitized external for authenticated users when flag is on', async () => {
    env.SHOW_EXTERNAL_METADATA = true;
    const body = (await (await userApp.request(`/api/games/${slug}`)).json()) as {
      external: { description: string; attribution: string };
    };
    expect(body.external.description).toBe('Fight & win.\n\nBold');
    expect(body.external.attribution).toBe('BoardGameGeek');
    const list = (await (await userApp.request(`/api/games?q=${slug}`)).json()) as {
      items: { externalThumbUrl: string }[];
    };
    expect(list.items[0]?.externalThumbUrl).toBe('https://cf.geekdo-images.com/thumb.jpg');
  });
});
