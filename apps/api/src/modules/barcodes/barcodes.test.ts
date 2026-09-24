import type { BarcodeLookupResult, GameUpcCandidate } from '@onboard/shared';
import { eq, inArray } from 'drizzle-orm';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createApp } from '../../app.js';
import { db, pool } from '../../db/client.js';
import { barcodeLookups, gameBarcodes, games, users } from '../../db/schema/index.js';
import { fakeAuth, fakeUser } from '../../test/fake-auth.js';
import type { BarcodeProvider } from './gameupc-client.js';

const maintainer = fakeUser('maintainer');

const VALID_UNKNOWN_CODE = '4006381333931';
const VALID_HIT_CODE = '96385074';
const VALID_LINK_CODE = '5000112637922';
const VALID_CANDIDATE_CODE = '036000291452';
const VALID_CONFLICT_CODE = '9780201379624';

const createdGameIds: string[] = [];
const codesToClean = [
  VALID_UNKNOWN_CODE,
  VALID_HIT_CODE,
  VALID_LINK_CODE,
  `0${VALID_CANDIDATE_CODE}`, // normalizeBarcode prefixes UPC-A with a leading 0
  VALID_CONFLICT_CODE,
];

function makeProvider(overrides: Partial<BarcodeProvider> = {}): BarcodeProvider {
  return {
    name: 'gameupc',
    lookup: vi.fn(async () => []),
    vote: vi.fn(async () => {}),
    ...overrides,
  };
}

async function insertGame(nameEn: string, bggId?: number): Promise<{ id: string; slug: string }> {
  const [row] = await db
    .insert(games)
    .values({ slug: `barcode-test-${Date.now()}-${Math.random()}`, nameEn, bggId })
    .returning();
  createdGameIds.push(row!.id);
  return row!;
}

beforeAll(async () => {
  await db
    .insert(users)
    .values({ ...maintainer, role: 'maintainer' })
    .onConflictDoNothing({ target: users.id });
});

afterEach(async () => {
  await db.delete(barcodeLookups).where(inArray(barcodeLookups.code, codesToClean));
});

afterAll(async () => {
  if (createdGameIds.length > 0) {
    await db.delete(gameBarcodes).where(inArray(gameBarcodes.gameId, createdGameIds));
    await db.delete(games).where(inArray(games.id, createdGameIds));
  }
  await db.delete(users).where(eq(users.id, maintainer.id));
  await pool.end();
});

describe('GET /api/barcodes/:code', () => {
  it('rejects an invalid checksum with 422', async () => {
    const app = createApp({ auth: fakeAuth(maintainer), rateLimit: false });
    const res = await app.request('/api/barcodes/1234567890123');
    expect(res.status).toBe(422);
  });

  it('forbids a regular user (403)', async () => {
    const app = createApp({ auth: fakeAuth(fakeUser('user')), rateLimit: false });
    const res = await app.request(`/api/barcodes/${VALID_UNKNOWN_CODE}`);
    expect(res.status).toBe(403);
  });

  it('returns kind local when the code is in game_barcodes', async () => {
    const game = await insertGame(`Local Hit ${Date.now()}`);
    await db
      .insert(gameBarcodes)
      .values({ code: VALID_HIT_CODE, gameId: game.id, source: 'manual' });

    const provider = makeProvider();
    const app = createApp({
      auth: fakeAuth(maintainer),
      rateLimit: false,
      barcodeProvider: provider,
    });
    const res = await app.request(`/api/barcodes/${VALID_HIT_CODE}`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as BarcodeLookupResult;
    expect(body.kind).toBe('local');
    expect(provider.lookup).not.toHaveBeenCalled();

    await db.delete(gameBarcodes).where(eq(gameBarcodes.code, VALID_HIT_CODE));
  });

  it('returns kind unknown when no provider is configured', async () => {
    const app = createApp({
      auth: fakeAuth(maintainer),
      rateLimit: false,
      barcodeProvider: undefined,
    });
    const res = await app.request(`/api/barcodes/${VALID_UNKNOWN_CODE}`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as BarcodeLookupResult;
    expect(body).toEqual({ kind: 'unknown', code: VALID_UNKNOWN_CODE });
  });

  it('returns candidates flagged with the matching local game', async () => {
    const game = await insertGame(`Candidate Match ${Date.now()}`, 999001);
    const provider = makeProvider({
      lookup: vi.fn(async (): Promise<GameUpcCandidate[]> => [
        { bggId: 999001, name: 'Candidate Match', confidence: 90 },
      ]),
    });
    const app = createApp({
      auth: fakeAuth(maintainer),
      rateLimit: false,
      barcodeProvider: provider,
    });

    const res = await app.request(`/api/barcodes/${VALID_CANDIDATE_CODE}`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as BarcodeLookupResult;
    expect(body.kind).toBe('candidates');
    if (body.kind === 'candidates') {
      expect(body.items[0]?.localGame?.id).toBe(game.id);
    }
    expect(provider.lookup).toHaveBeenCalledTimes(1);

    const res2 = await app.request(`/api/barcodes/${VALID_CANDIDATE_CODE}`);
    expect(res2.status).toBe(200);
    expect(provider.lookup).toHaveBeenCalledTimes(1);
  });

  it('maps a provider failure to unknown + providerError, never a 5xx', async () => {
    const provider = makeProvider({
      lookup: vi.fn(async () => {
        throw new Error('timeout');
      }),
    });
    const app = createApp({
      auth: fakeAuth(maintainer),
      rateLimit: false,
      barcodeProvider: provider,
    });

    const res = await app.request(`/api/barcodes/${VALID_UNKNOWN_CODE}`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as BarcodeLookupResult;
    expect(body).toEqual({ kind: 'unknown', code: VALID_UNKNOWN_CODE, providerError: true });
  });
});

describe('POST /api/barcodes/:code/link', () => {
  it('links a code to a game (201)', async () => {
    const game = await insertGame(`Link Target ${Date.now()}`);
    const app = createApp({
      auth: fakeAuth(maintainer),
      rateLimit: false,
      barcodeProvider: undefined,
    });

    const res = await app.request(`/api/barcodes/${VALID_LINK_CODE}/link`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ gameId: game.id }),
    });
    expect(res.status).toBe(201);
    const body = (await res.json()) as { code: string; gameId: string; source: string };
    expect(body).toEqual({ code: VALID_LINK_CODE, gameId: game.id, source: 'manual' });

    await db.delete(gameBarcodes).where(eq(gameBarcodes.code, VALID_LINK_CODE));
  });

  it('rejects a code already linked to a different game (409)', async () => {
    const gameA = await insertGame(`Conflict A ${Date.now()}`);
    const gameB = await insertGame(`Conflict B ${Date.now()}`);
    await db
      .insert(gameBarcodes)
      .values({ code: VALID_CONFLICT_CODE, gameId: gameA.id, source: 'manual' });

    const app = createApp({
      auth: fakeAuth(maintainer),
      rateLimit: false,
      barcodeProvider: undefined,
    });
    const res = await app.request(`/api/barcodes/${VALID_CONFLICT_CODE}/link`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ gameId: gameB.id }),
    });
    expect(res.status).toBe(409);

    await db.delete(gameBarcodes).where(eq(gameBarcodes.code, VALID_CONFLICT_CODE));
  });

  it('forbids a regular user from linking (403)', async () => {
    const game = await insertGame(`No Perm ${Date.now()}`);
    const app = createApp({ auth: fakeAuth(fakeUser('user')), rateLimit: false });
    const res = await app.request(`/api/barcodes/${VALID_LINK_CODE}/link`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ gameId: game.id }),
    });
    expect(res.status).toBe(403);
  });
});
