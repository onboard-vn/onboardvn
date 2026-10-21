import { parseArgs } from 'node:util';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { pool } from '../../db/client.js';
import { backfillExternalClubLoginDigests } from './backfill-login-digest.js';

const SAFE_ERROR_NAMES = new Set([
  'AggregateError',
  'DatabaseError',
  'DrizzleQueryError',
  'Error',
  'PostgresError',
  'RangeError',
  'ReferenceError',
  'SyntaxError',
  'TypeError',
  'ZodError',
]);

export type BackfillCliOutput = {
  counts: (line: string) => void;
  error: (line: string) => void;
};

function errorName(error: unknown): string {
  return error instanceof Error && SAFE_ERROR_NAMES.has(error.name) ? error.name : 'Error';
}

export async function runBackfillLoginDigestCli(
  args: string[] = process.argv.slice(2),
  output: BackfillCliOutput = {
    counts: (line) => console.log(line),
    error: (line) => console.error(line),
  },
): Promise<number> {
  try {
    const { values } = parseArgs({
      args,
      options: {
        'dry-run': { type: 'boolean', default: false },
        'clear-raw': { type: 'boolean', default: false },
      },
    });
    const report = await backfillExternalClubLoginDigests({
      dryRun: values['dry-run'],
      clearRaw: values['clear-raw'],
    });
    output.counts(JSON.stringify(report));
    return 0;
  } catch (error) {
    output.error(`External club login digest backfill failed (${errorName(error)})`);
    return 1;
  }
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  process.exitCode = await runBackfillLoginDigestCli();
  await pool.end();
}
