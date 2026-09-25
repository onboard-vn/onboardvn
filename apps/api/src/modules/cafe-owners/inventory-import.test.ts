import { eq, inArray } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { db, pool } from '../../db/client.js';
import { games } from '../../db/schema/index.js';
import { matchInventoryRow, MAX_IMPORT_ROWS, parseInventoryCsv } from './inventory-import.js';

const suffix = Date.now();
const gameIds: string[] = [];

let catan: { id: string };
let coLon: { id: string };

beforeAll(async () => {
  const inserted = await db
    .insert(games)
    .values([
      {
        slug: `catan-${suffix}`,
        nameEn: 'Catan',
        nameVi: 'Đảo Catan',
        bggId: 900_000 + (suffix % 100_000),
      },
      { slug: `colon-${suffix}`, nameEn: 'Colonists', nameVi: 'Cờ Lon' },
    ])
    .returning();
  catan = inserted[0]!;
  coLon = inserted[1]!;
  gameIds.push(catan.id, coLon.id);
});

afterAll(async () => {
  await db.delete(games).where(inArray(games.id, gameIds));
  await pool.end();
});

describe('parseInventoryCsv', () => {
  it('parses a comma-delimited CSV with header and defaults copies to 1', () => {
    const { rows, tooManyRows } = parseInventoryCsv('name,nameEn,bggId,copies\nĐảo Catan,,,\n');
    expect(tooManyRows).toBe(false);
    expect(rows).toEqual([
      { line: 2, name: 'Đảo Catan', nameEn: null, bggId: null, copies: 1, error: null },
    ]);
  });

  it('autodetects a semicolon delimiter (Excel VN locale)', () => {
    const { rows } = parseInventoryCsv('name;nameEn;bggId;copies\nCatan;Settlers;123;3\n');
    expect(rows).toEqual([
      { line: 2, name: 'Catan', nameEn: 'Settlers', bggId: 123, copies: 3, error: null },
    ]);
  });

  it('strips a UTF-8 BOM', () => {
    const { rows } = parseInventoryCsv('﻿name,copies\nCatan,2\n');
    expect(rows[0]?.name).toBe('Catan');
  });

  it('flags a missing name as a row error without throwing', () => {
    const { rows } = parseInventoryCsv('name,copies\n,5\n');
    expect(rows[0]?.error).toContain('name');
  });

  it('flags an out-of-range copies as a row error', () => {
    const { rows } = parseInventoryCsv('name,copies\nCatan,100\n');
    expect(rows[0]?.error).toContain('copies');
  });

  it('accounts for a blank line and a multiline quoted cell when computing line numbers', () => {
    const csv = 'name,nameEn,bggId,copies\n"Catan quoted",,,1\n\n"Multi\nline name",,,2\n';
    const { rows } = parseInventoryCsv(csv);
    expect(rows).toEqual([
      { line: 2, name: 'Catan quoted', nameEn: null, bggId: null, copies: 1, error: null },
      { line: 5, name: 'Multi\nline name', nameEn: null, bggId: null, copies: 2, error: null },
    ]);
  });

  it('reads headers case-insensitively and trims surrounding whitespace', () => {
    const { rows } = parseInventoryCsv(' Name , NameEn , BGGID , Copies \nCatan,Settlers,123,2\n');
    expect(rows[0]).toMatchObject({ name: 'Catan', nameEn: 'Settlers', bggId: 123, copies: 2 });
  });

  it('marks tooManyRows and caps at MAX_IMPORT_ROWS when the file exceeds the limit', () => {
    const body = Array.from({ length: MAX_IMPORT_ROWS + 5 }, (_, i) => `game ${i}`).join('\n');
    const { rows, tooManyRows } = parseInventoryCsv(`name\n${body}\n`);
    expect(tooManyRows).toBe(true);
    expect(rows.length).toBe(MAX_IMPORT_ROWS);
  });
});

describe('matchInventoryRow', () => {
  it('matches an accented catalog name against an unaccented CSV name', async () => {
    const result = await matchInventoryRow({
      line: 2,
      name: 'dao catan',
      nameEn: null,
      bggId: null,
      copies: 1,
      error: null,
    });
    expect(result.status).toBe('matched');
    expect(result.gameId).toBe(catan.id);
  });

  it('matches by exact case-insensitive name', async () => {
    const result = await matchInventoryRow({
      line: 2,
      name: 'CATAN',
      nameEn: null,
      bggId: null,
      copies: 1,
      error: null,
    });
    expect(result.status).toBe('matched');
    expect(result.gameId).toBe(catan.id);
  });

  it('suggests near-name matches above the similarity threshold', async () => {
    const result = await matchInventoryRow({
      line: 2,
      name: 'Co Lonn', // close, but not exactly equal, to "Cờ Lon" once unaccented
      nameEn: null,
      bggId: null,
      copies: 1,
      error: null,
    });
    expect(result.status).toBe('suggested');
    expect(result.suggestions.some((s) => s.gameId === coLon.id)).toBe(true);
  });

  it('returns unmatched for a name with no catalog hit', async () => {
    const result = await matchInventoryRow({
      line: 2,
      name: 'Some Totally Unknown Board Game Title Xyz',
      nameEn: null,
      bggId: null,
      copies: 1,
      error: null,
    });
    expect(result.status).toBe('unmatched');
    expect(result.gameId).toBeNull();
    expect(result.suggestions).toEqual([]);
  });

  it('passes through a parse error as status error without querying the catalog', async () => {
    const result = await matchInventoryRow({
      line: 2,
      name: '',
      nameEn: null,
      bggId: null,
      copies: 1,
      error: 'name (thiếu)',
    });
    expect(result.status).toBe('error');
    expect(result.error).toBe('name (thiếu)');
  });
});

describe('matchInventoryRow by bggId', () => {
  it('matches by bggId even when the name is unrelated', async () => {
    const row = await db.query.games.findFirst({ where: eq(games.id, catan.id) });
    const result = await matchInventoryRow({
      line: 2,
      name: 'completely different text',
      nameEn: null,
      bggId: row!.bggId,
      copies: 1,
      error: null,
    });
    expect(result.status).toBe('matched');
    expect(result.gameId).toBe(catan.id);
  });
});
