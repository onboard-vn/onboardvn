import { and, asc, eq, gt, isNotNull, isNull } from 'drizzle-orm';
import { db } from '../../db/client.js';
import { clubExternalMembers } from '../../db/schema/clubs.js';
import { digestLoginId } from '../../lib/login-digest.js';

const BATCH_SIZE = 100;
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

export type BackfillLoginDigestOptions = {
  dryRun?: boolean;
  clearRaw?: boolean;
};

export type BackfillLoginDigestReport = {
  digestCandidates: number;
  digestsWritten: number;
  rawClearCandidates: number;
  rawValuesCleared: number;
  digestMismatches: number;
};

function sanitizedError(error: unknown): Error {
  const name = error instanceof Error && SAFE_ERROR_NAMES.has(error.name) ? error.name : 'Error';
  const safe = new Error('External club login digest backfill failed');
  safe.name = name;
  return safe;
}

export async function backfillExternalClubLoginDigests(
  options: BackfillLoginDigestOptions = {},
): Promise<BackfillLoginDigestReport> {
  const report: BackfillLoginDigestReport = {
    digestCandidates: 0,
    digestsWritten: 0,
    rawClearCandidates: 0,
    rawValuesCleared: 0,
    digestMismatches: 0,
  };

  try {
    digestLoginId('');

    let cursor: string | undefined;
    while (true) {
      const batch = await db.transaction(async (tx) => {
        const conditions = [
          isNotNull(clubExternalMembers.externalLoginId),
          isNull(clubExternalMembers.externalLoginDigest),
          ...(cursor ? [gt(clubExternalMembers.id, cursor)] : []),
        ];
        const query = tx
          .select({
            id: clubExternalMembers.id,
            raw: clubExternalMembers.externalLoginId,
          })
          .from(clubExternalMembers)
          .where(and(...conditions))
          .orderBy(asc(clubExternalMembers.id))
          .limit(BATCH_SIZE);
        const rows = options.dryRun ? await query : await query.for('update');

        let written = 0;
        if (!options.dryRun) {
          for (const row of rows) {
            const digest = digestLoginId(row.raw!);
            const updated = await tx
              .update(clubExternalMembers)
              .set({ externalLoginDigest: digest })
              .where(
                and(
                  eq(clubExternalMembers.id, row.id),
                  isNotNull(clubExternalMembers.externalLoginId),
                  isNull(clubExternalMembers.externalLoginDigest),
                ),
              )
              .returning({ id: clubExternalMembers.id });
            written += updated.length;
          }
        } else {
          for (const row of rows) digestLoginId(row.raw!);
        }

        return { rows, written };
      });

      if (batch.rows.length === 0) break;
      report.digestCandidates += batch.rows.length;
      report.digestsWritten += batch.written;
      cursor = batch.rows.at(-1)!.id;
    }

    if (options.clearRaw) {
      cursor = undefined;
      while (true) {
        const batch = await db.transaction(async (tx) => {
          const conditions = [
            isNotNull(clubExternalMembers.externalLoginId),
            ...(cursor ? [gt(clubExternalMembers.id, cursor)] : []),
          ];
          const query = tx
            .select({
              id: clubExternalMembers.id,
              raw: clubExternalMembers.externalLoginId,
              digest: clubExternalMembers.externalLoginDigest,
            })
            .from(clubExternalMembers)
            .where(and(...conditions))
            .orderBy(asc(clubExternalMembers.id))
            .limit(BATCH_SIZE);
          const rows = options.dryRun ? await query : await query.for('update');

          let candidates = 0;
          let cleared = 0;
          let mismatches = 0;
          for (const row of rows) {
            const expectedDigest = digestLoginId(row.raw!);
            const matches = row.digest === expectedDigest || (options.dryRun && row.digest === null);
            if (!matches) {
              mismatches += 1;
              continue;
            }

            candidates += 1;
            if (options.dryRun) continue;

            const updated = await tx
              .update(clubExternalMembers)
              .set({ externalLoginId: null })
              .where(
                and(
                  eq(clubExternalMembers.id, row.id),
                  isNotNull(clubExternalMembers.externalLoginId),
                  eq(clubExternalMembers.externalLoginDigest, expectedDigest),
                ),
              )
              .returning({ id: clubExternalMembers.id });
            cleared += updated.length;
          }

          return { rows, candidates, cleared, mismatches };
        });

        if (batch.rows.length === 0) break;
        report.rawClearCandidates += batch.candidates;
        report.rawValuesCleared += batch.cleared;
        report.digestMismatches += batch.mismatches;
        cursor = batch.rows.at(-1)!.id;
      }
    }

    return report;
  } catch (error) {
    throw sanitizedError(error);
  }
}
