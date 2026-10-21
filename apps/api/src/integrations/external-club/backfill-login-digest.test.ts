import { randomUUID } from 'node:crypto';
import { eq, inArray, sql } from 'drizzle-orm';
import { afterAll, afterEach, describe, expect, it } from 'vitest';
import { db, pool } from '../../db/client.js';
import { clubExternalMembers, clubs } from '../../db/schema/index.js';
import { digestLoginId } from '../../lib/login-digest.js';
import { runBackfillLoginDigestCli } from './backfill-login-digest-cli.js';
import { backfillExternalClubLoginDigests } from './backfill-login-digest.js';

const clubIds: string[] = [];

async function makeMember(raw: string, digest: string | null = null) {
  const suffix = randomUUID();
  const [club] = await db
    .insert(clubs)
    .values({ slug: `digest-backfill-${suffix}`, name: 'Digest Backfill Test', inviteCodeHash: `hash-${suffix}` })
    .returning({ id: clubs.id });
  clubIds.push(club!.id);

  const [member] = await db
    .insert(clubExternalMembers)
    .values({
      clubId: club!.id,
      externalId: `member-${suffix}`,
      nickname: 'Digest Test Member',
      externalLoginId: raw,
      externalLoginDigest: digest,
    })
    .returning({ id: clubExternalMembers.id });
  return member!.id;
}

async function makeMembers(rawValues: string[]) {
  const suffix = randomUUID();
  const [club] = await db
    .insert(clubs)
    .values({ slug: `digest-backfill-${suffix}`, name: 'Digest Backfill Test', inviteCodeHash: `hash-${suffix}` })
    .returning({ id: clubs.id });
  clubIds.push(club!.id);

  const externalIds = rawValues.map((_, index) => `member-${suffix}-${index}`);
  const members = await db
    .insert(clubExternalMembers)
    .values(
      rawValues.map((raw, index) => ({
        clubId: club!.id,
        externalId: externalIds[index]!,
        nickname: 'Digest Test Member',
        externalLoginId: raw,
      })),
    )
    .returning({ id: clubExternalMembers.id, externalId: clubExternalMembers.externalId });
  const idByExternalId = new Map(members.map((member) => [member.externalId, member.id]));

  return rawValues.map((raw, index) => ({ id: idByExternalId.get(externalIds[index]!)!, raw }));
}

async function getMember(id: string) {
  const [member] = await db
    .select({
      externalLoginId: clubExternalMembers.externalLoginId,
      externalLoginDigest: clubExternalMembers.externalLoginDigest,
    })
    .from(clubExternalMembers)
    .where(eq(clubExternalMembers.id, id));
  return member!;
}

async function waitForPassTwoToWaitOnLock(blockerPid: number) {
  const deadline = Date.now() + 10_000;
  while (Date.now() < deadline) {
    const result = await db.execute(sql`
      SELECT EXISTS (
        SELECT 1
        FROM pg_stat_activity
        WHERE wait_event_type = 'Lock'
          AND ${blockerPid} = ANY(pg_blocking_pids(pid))
          AND query ILIKE 'select%club_external_members%for update%'
      ) AS waiting
    `);
    if (result.rows[0]?.waiting === true) return;
    await new Promise((resolveWait) => setTimeout(resolveWait, 10));
  }
  throw new Error('Timed out waiting for pass two to lock the concurrently updated row');
}

afterEach(async () => {
  if (clubIds.length > 0) {
    await db.delete(clubs).where(inArray(clubs.id, [...clubIds]));
    clubIds.length = 0;
  }
});

afterAll(async () => {
  await pool.end();
});

describe('backfillExternalClubLoginDigests', () => {
  it('dry run reports row counts without changing stored values', async () => {
    const rawNeedingDigest = `dry-run-${randomUUID()}`;
    const rawWithDigest = `dry-run-verified-${randomUUID()}`;
    const ids = await Promise.all([
      makeMember(rawNeedingDigest),
      makeMember(rawWithDigest, digestLoginId(rawWithDigest)),
    ]);

    const output: string[] = [];
    const exitCode = await runBackfillLoginDigestCli(['--dry-run', '--clear-raw'], {
      counts: (line) => output.push(line),
      error: (line) => output.push(line),
    });

    expect(exitCode).toBe(0);
    expect(output).toHaveLength(1);
    expect(JSON.parse(output[0]!)).toEqual({
      digestCandidates: 1,
      digestsWritten: 0,
      rawClearCandidates: 2,
      rawValuesCleared: 0,
      digestMismatches: 0,
    });
    expect(await Promise.all(ids.map(getMember))).toEqual([
      { externalLoginId: rawNeedingDigest, externalLoginDigest: null },
      { externalLoginId: rawWithDigest, externalLoginDigest: digestLoginId(rawWithDigest) },
    ]);
  });

  it('fills digests for rows that have a raw value and no digest', async () => {
    const raw = `backfill-${randomUUID()}`;
    const id = await makeMember(raw);

    const report = await backfillExternalClubLoginDigests();

    expect(report.digestCandidates).toBe(1);
    expect(report.digestsWritten).toBe(1);
    expect(await getMember(id)).toEqual({
      externalLoginId: raw,
      externalLoginDigest: digestLoginId(raw),
    });
  });

  it('processes every eligible row once in both passes across multiple batches', async () => {
    const raws = Array.from({ length: 101 }, (_, index) => `multi-batch-${randomUUID()}-${index}`);
    const members = await makeMembers(raws);

    const report = await backfillExternalClubLoginDigests({ clearRaw: true });

    expect(report).toEqual({
      digestCandidates: members.length,
      digestsWritten: members.length,
      rawClearCandidates: members.length,
      rawValuesCleared: members.length,
      digestMismatches: 0,
    });
    expect(await Promise.all(members.map(({ id }) => getMember(id)))).toEqual(
      members.map(({ raw }) => ({
        externalLoginId: null,
        externalLoginDigest: digestLoginId(raw),
      })),
    );
  });

  it('clears only rows whose stored digest verifies the raw value', async () => {
    const verifiedRaw = `verified-${randomUUID()}`;
    const mismatchedRaw = `mismatched-${randomUUID()}`;
    const wrongDigest = digestLoginId(`different-${randomUUID()}`);
    const [verifiedId, mismatchedId] = await Promise.all([
      makeMember(verifiedRaw, digestLoginId(verifiedRaw)),
      makeMember(mismatchedRaw, wrongDigest),
    ]);

    const report = await backfillExternalClubLoginDigests({ clearRaw: true });

    expect(report).toEqual({
      digestCandidates: 0,
      digestsWritten: 0,
      rawClearCandidates: 1,
      rawValuesCleared: 1,
      digestMismatches: 1,
    });
    expect(await getMember(verifiedId)).toEqual({
      externalLoginId: null,
      externalLoginDigest: digestLoginId(verifiedRaw),
    });
    expect(await getMember(mismatchedId)).toEqual({
      externalLoginId: mismatchedRaw,
      externalLoginDigest: wrongDigest,
    });
  });

  it('keeps the raw value when a concurrent digest update wins the pass-two row lock', async () => {
    const raw = `interleaved-${randomUUID()}`;
    const id = await makeMember(raw, digestLoginId(raw));
    const mismatchedDigest = digestLoginId(`different-${randomUUID()}`);
    const concurrentUpdate = await pool.connect();
    let transactionOpen = false;
    let backfillPromise: ReturnType<typeof backfillExternalClubLoginDigests> | undefined;

    try {
      await concurrentUpdate.query('BEGIN');
      transactionOpen = true;
      const pidResult = await concurrentUpdate.query<{ pid: number }>('SELECT pg_backend_pid() AS pid');
      const pid = Number(pidResult.rows[0]?.pid);
      const updated = await concurrentUpdate.query(
        'UPDATE public.club_external_members SET external_login_digest = $1 WHERE id = $2',
        [mismatchedDigest, id],
      );
      expect(updated.rowCount).toBe(1);

      backfillPromise = backfillExternalClubLoginDigests({ clearRaw: true });
      await waitForPassTwoToWaitOnLock(pid);
      await concurrentUpdate.query('COMMIT');
      transactionOpen = false;

      const report = await backfillPromise;

      expect(report).toEqual({
        digestCandidates: 0,
        digestsWritten: 0,
        rawClearCandidates: 0,
        rawValuesCleared: 0,
        digestMismatches: 1,
      });
      expect(await getMember(id)).toEqual({
        externalLoginId: raw,
        externalLoginDigest: mismatchedDigest,
      });
    } finally {
      if (transactionOpen) await concurrentUpdate.query('ROLLBACK');
      concurrentUpdate.release();
      if (backfillPromise) await backfillPromise.catch(() => undefined);
    }
  });

  it('makes no changes on a second run', async () => {
    const raw = `idempotent-${randomUUID()}`;
    await makeMember(raw);

    await backfillExternalClubLoginDigests({ clearRaw: true });
    const secondRun = await backfillExternalClubLoginDigests({ clearRaw: true });

    expect(secondRun).toEqual({
      digestCandidates: 0,
      digestsWritten: 0,
      rawClearCandidates: 0,
      rawValuesCleared: 0,
      digestMismatches: 0,
    });
  });

  it('prints no raw value or digest when a database update fails', async () => {
    const raw = `forced-error-${randomUUID()}`;
    const id = await makeMember(raw);
    const suffix = randomUUID().replaceAll('-', '');
    const functionName = `digest_backfill_error_${suffix}`;
    const triggerName = `digest_backfill_error_${suffix}`;

    try {
      // A row-scoped PostgreSQL trigger forces a real database error without affecting other test rows.
      await db.execute(sql.raw(`
        CREATE FUNCTION public."${functionName}"() RETURNS trigger
        LANGUAGE plpgsql AS $function$
        BEGIN
          IF NEW.id = '${id}'::uuid THEN
            RAISE EXCEPTION '${raw}';
          END IF;
          RETURN NEW;
        END
        $function$
      `));
      await db.execute(sql.raw(`
        CREATE TRIGGER "${triggerName}"
        BEFORE UPDATE ON public.club_external_members
        FOR EACH ROW EXECUTE FUNCTION public."${functionName}"()
      `));

      const output: string[] = [];
      const exitCode = await runBackfillLoginDigestCli([], {
        counts: (line) => output.push(line),
        error: (line) => output.push(line),
      });
      const expectedDigest = digestLoginId(raw);

      expect(exitCode).toBe(1);
      expect(output).toHaveLength(1);
      expect(output[0]).toMatch(/^External club login digest backfill failed \([A-Za-z]+\)$/);
      expect(output[0]).not.toContain(raw);
      expect(output[0]).not.toContain(expectedDigest);
    } finally {
      await db.execute(sql.raw(`DROP TRIGGER IF EXISTS "${triggerName}" ON public.club_external_members`));
      await db.execute(sql.raw(`DROP FUNCTION IF EXISTS public."${functionName}"()`));
    }
  });
});
