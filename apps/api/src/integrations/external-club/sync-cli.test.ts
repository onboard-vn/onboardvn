import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const cliDirectory = fileURLToPath(new URL('.', import.meta.url));
const apiRoot = resolve(cliDirectory, '../../..');
const tsxCli = require.resolve('tsx/cli');

describe('external club CLI argument errors', () => {
  it.each([
    {
      cli: 'sync-cli.ts',
      message: /^External club sync failed \([A-Za-z]+\)$/m,
    },
    {
      cli: 'backfill-login-digest-cli.ts',
      message: /^External club login digest backfill failed \([A-Za-z]+\)$/m,
    },
  ])('does not echo unexpected arguments from $cli', ({ cli, message }) => {
    const sentinel = `private-login-id-${randomUUID()}`;
    const result = spawnSync(
      process.execPath,
      [tsxCli, resolve(cliDirectory, cli), `--unknown-login-id-${sentinel}`],
      { cwd: apiRoot, encoding: 'utf8', timeout: 10_000 },
    );
    const output = `${result.stdout ?? ''}${result.stderr ?? ''}`;

    expect(result.status === 1 && result.error === undefined).toBe(true);
    expect(output.includes(sentinel)).toBe(false);
    expect((result.stdout ?? '') === '').toBe(true);
    expect(message.test(result.stderr ?? '')).toBe(true);
  });
});
