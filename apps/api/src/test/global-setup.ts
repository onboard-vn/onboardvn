import { execFileSync } from 'node:child_process';
import { Client } from 'pg';

export const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? 'postgres://onboard:onboard@localhost:54329/onboard_test';

export default async function setup() {
  const url = new URL(TEST_DATABASE_URL);
  const dbName = url.pathname.slice(1);
  const admin = new Client({ connectionString: new URL('/postgres', url).toString() });
  await admin.connect();
  const exists = await admin.query('select 1 from pg_database where datname = $1', [dbName]);
  if (exists.rowCount === 0) await admin.query(`create database "${dbName}"`);
  await admin.end();

  execFileSync('pnpm', ['exec', 'tsx', 'src/db/migrate.ts'], {
    env: { ...process.env, ...testEnv() },
    stdio: 'inherit',
  });
}

export function testEnv(): Record<string, string> {
  return {
    NODE_ENV: 'test',
    DATABASE_URL: TEST_DATABASE_URL,
    BETTER_AUTH_SECRET: 'test-secret-test-secret-test-secret-123',
    BETTER_AUTH_URL: 'http://localhost:3000',
    WEB_ORIGIN: 'http://localhost:3000',
  };
}
