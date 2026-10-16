import { expect, it, vi } from 'vitest';
vi.mock('../../lib/env.js', () => ({
  env: {
    NODE_ENV: 'test',
    DATABASE_URL: 'postgres://unused:unused@127.0.0.1:1/unused',
    BETTER_AUTH_SECRET: 'test-secret-test-secret-test-secret-123',
    BETTER_AUTH_URL: 'https://example.com',
    WEB_ORIGIN: 'https://example.com',
    UPLOADS_DIR: './uploads',
    MOBILE_WEB_DIR: '/srv/mobile-web',
  },
}));
vi.mock('node:fs/promises', () => ({ readFile: vi.fn(async () => '[]') }));
vi.mock('./service.js', () => ({
  siteOrigin: 'https://example.com',
  sitemapKinds: [],
  STATIC_PAGES: {},
  pageMetadata: vi.fn(async () => ({
    title: 'Public',
    description: 'Site',
    canonical: 'https://example.com/',
    image: 'https://example.com/image.jpg',
    imageAlt: 'Site',
    indexable: true,
    status: 200,
  })),
}));
import { createApp } from '../../app.js';
it('metadata bypasses API session resolution even when a cookie is sent', async () => {
  const getSession = vi.fn(async () => {
    throw new Error('Auth must not run');
  });
  const app = createApp({
    auth: { api: { getSession }, handler: async () => new Response() } as never,
    rateLimit: false,
  });
  const response = await app.request('/api/site-metadata?path=/', {
    headers: { cookie: 'session=secret' },
  });
  expect(response.status).toBe(200);
  expect(getSession).not.toHaveBeenCalled();
  expect(await response.json()).toMatchObject({ title: 'Public' });
});
