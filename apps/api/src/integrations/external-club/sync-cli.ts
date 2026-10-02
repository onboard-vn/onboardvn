import { parseArgs } from 'node:util';
import { z } from 'zod';
import { pool } from '../../db/client.js';
import { env } from '../../lib/env.js';
import { loadExternalClubSource } from './loader.js';
import { syncExternalClub } from './sync.js';

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'expected YYYY-MM-DD');

const { values } = parseArgs({
  options: {
    club: { type: 'string' },
    from: { type: 'string' },
    to: { type: 'string' },
    'dry-run': { type: 'boolean', default: false },
  },
});

try {
  const options = z
    .object({ club: z.string().min(1), from: date.optional(), to: date.optional() })
    .parse(values);
  const source = await loadExternalClubSource(env);
  if (!source) {
    throw new Error(
      'External club sync disabled: set EXTERNAL_CLUB_PLUGIN and EXTERNAL_CLUB_BASE_URL',
    );
  }
  const report = await syncExternalClub(source, {
    clubSlug: options.club,
    from: options.from,
    to: options.to,
    dryRun: values['dry-run'],
  });
  console.log(JSON.stringify(report, null, 2));
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  await pool.end();
}
