import { defineConfig } from 'vitest/config';
// Pure/mocked SEO checks deliberately do not connect to or migrate a database.
export default defineConfig({
  test: {
    include: ['src/modules/seo/*.test.ts'],
    env: {
      NODE_ENV: 'test',
      DATABASE_URL: 'postgres://unused:unused@127.0.0.1:1/unused',
      BETTER_AUTH_SECRET: 'test-secret-test-secret-test-secret-123',
      BETTER_AUTH_URL: 'https://example.com',
      WEB_ORIGIN: 'https://example.com',
    },
  },
});
