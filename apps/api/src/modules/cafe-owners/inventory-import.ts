import { parse } from 'csv-parse/sync';
import { inArray, sql } from 'drizzle-orm';
import { db } from '../../db/client.js';
import { games } from '../../db/schema/index.js';

export const MAX_IMPORT_ROWS = 500;
const SUGGESTION_THRESHOLD = 0.4;
const SUGGESTION_LIMIT = 3;

export interface InventoryImportRawRow {
  line: number;
  name: string;
  nameEn: string | null;
  bggId: number | null;
  copies: number;
  error: string | null;
}

export interface InventoryImportSuggestion {
  gameId: string;
  name: string;
  similarity: number;
}

export type InventoryImportRowStatus = 'matched' | 'suggested' | 'unmatched' | 'error';

export interface InventoryImportRowResult {
  line: number;
  input: { name: string; nameEn: string | null; bggId: number | null; copies: number };
  status: InventoryImportRowStatus;
  gameId: string | null;
  gameName: string | null;
  suggestions: InventoryImportSuggestion[];
  error: string | null;
}

export interface ParseInventoryCsvResult {
  rows: InventoryImportRawRow[];
  tooManyRows: boolean;
}

function stripBom(content: string): string {
  return content.charCodeAt(0) === 0xfeff ? content.slice(1) : content;
}

/** Excel "Save as CSV (comma)" uses `,`; some VN locales default to `;`. Pick whichever the
 * header line actually uses. */
function detectDelimiter(content: string): ',' | ';' {
  const firstLine = content.split(/\r?\n/, 1)[0] ?? '';
  return firstLine.includes(';') && !firstLine.includes(',') ? ';' : ',';
}

function parseCopies(raw: string | undefined): { copies: number; error: string | null } {
  const trimmed = raw?.trim();
  if (!trimmed) return { copies: 1, error: null };
  const n = Number(trimmed);
  if (!Number.isInteger(n) || n < 1 || n > 99) {
    return { copies: 1, error: 'copies phải là số nguyên từ 1 đến 99' };
  }
  return { copies: n, error: null };
}

function parseBggId(raw: string | undefined): { bggId: number | null; error: string | null } {
  const trimmed = raw?.trim();
  if (!trimmed) return { bggId: null, error: null };
  const n = Number(trimmed);
  if (!Number.isInteger(n) || n <= 0) {
    return { bggId: null, error: 'bggId không hợp lệ' };
  }
  return { bggId: n, error: null };
}

/** CSV column lookup is case-insensitive and tolerates surrounding whitespace in the header
 * (`Name`, ` NameEn `, `BGGID`, ...) since owners export from Excel/Sheets with varying casing. */
function normalizeHeaders(record: Record<string, string>): Record<string, string> {
  const normalized: Record<string, string> = {};
  for (const [key, value] of Object.entries(record)) {
    normalized[key.trim().toLowerCase()] = value;
  }
  return normalized;
}

/** Never throws on a malformed row — it carries its own error for the preview; only row-count
 * and unparsable CSV are fatal (`tooManyRows` / a thrown error). */
export function parseInventoryCsv(content: string): ParseInventoryCsvResult {
  const normalized = stripBom(content);
  const delimiter = detectDelimiter(normalized);
  const records = parse(normalized, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    delimiter,
    bom: true,
    info: true,
  }) as { record: Record<string, string>; info: { lines: number } }[];

  const tooManyRows = records.length > MAX_IMPORT_ROWS;
  const limited = tooManyRows ? records.slice(0, MAX_IMPORT_ROWS) : records;

  const rows: InventoryImportRawRow[] = limited.map(({ record: raw, info }) => {
    const record = normalizeHeaders(raw);
    const name = record.name?.trim() ?? '';
    const nameEn = record.nameen?.trim() || null;
    const { bggId, error: bggIdError } = parseBggId(record.bggid);
    const { copies, error: copiesError } = parseCopies(record.copies);

    const errors = [!name ? 'name (thiếu)' : null, bggIdError, copiesError].filter(
      (e): e is string => Boolean(e),
    );

    return {
      line: info.lines,
      name,
      nameEn,
      bggId,
      copies,
      error: errors.length > 0 ? errors.join('; ') : null,
    };
  });

  return { rows, tooManyRows };
}

interface GameRef {
  id: string;
  nameVi: string | null;
  nameEn: string;
}

function displayName(g: { nameVi: string | null; nameEn: string }): string {
  return g.nameVi || g.nameEn;
}

/** A raw JS array interpolated into a drizzle `sql` tag expands as a comma list, not a single
 * bound value `unnest(...)::type[]` can cast — bind each element via `sql.join` instead. */
function sqlTextArray(values: readonly string[]) {
  return sql`ARRAY[${sql.join(
    values.map((v) => sql`${v}`),
    sql`, `,
  )}]::text[]`;
}

async function findGamesByBggIds(bggIds: number[]): Promise<Map<number, GameRef>> {
  if (bggIds.length === 0) return new Map();
  const rows = await db
    .select({ id: games.id, nameVi: games.nameVi, nameEn: games.nameEn, bggId: games.bggId })
    .from(games)
    .where(inArray(games.bggId, bggIds));
  return new Map(rows.filter((r) => r.bggId !== null).map((r) => [r.bggId!, r]));
}

/** Exact match is case/accent-insensitive but doesn't need the trigram index (not fuzzy). */
async function findGamesByExactNames(names: string[]): Promise<Map<string, GameRef>> {
  if (names.length === 0) return new Map();
  const result = await db.execute<{
    id: string;
    name_vi: string | null;
    name_en: string;
    input_name: string;
  }>(sql`
    select g.id, g.name_vi, g.name_en, n.name as input_name
    from unnest(${sqlTextArray(names)}) as n(name)
    join ${games} g
      on unaccent_immutable(lower(g.name_en)) = unaccent_immutable(lower(n.name))
      or unaccent_immutable(lower(coalesce(g.name_vi, ''))) = unaccent_immutable(lower(n.name))
  `);
  const map = new Map<string, GameRef>();
  for (const row of result.rows) {
    map.set(row.input_name, { id: row.id, nameVi: row.name_vi, nameEn: row.name_en });
  }
  return map;
}

/** Matches the `games_name_*_trgm_idx` expressions (drizzle/0002, no `lower()`) so `%` can use the
 * GIN index; `set_limit` must run on the same connection as the query, hence the transaction. */
async function findGameSuggestionsBatch(
  names: string[],
): Promise<Map<string, InventoryImportSuggestion[]>> {
  if (names.length === 0) return new Map();

  return db.transaction(async (tx) => {
    await tx.execute(sql`select set_limit(${SUGGESTION_THRESHOLD})`);

    const result = await tx.execute<{
      input_name: string;
      id: string;
      name_vi: string | null;
      name_en: string;
      sim: number;
    }>(sql`
      select input_name, id, name_vi, name_en, sim from (
        select
          n.name as input_name,
          g.id,
          g.name_vi,
          g.name_en,
          greatest(
            similarity(unaccent_immutable(g.name_en), unaccent_immutable(n.name)),
            similarity(unaccent_immutable(coalesce(g.name_vi, '')), unaccent_immutable(n.name))
          ) as sim,
          row_number() over (
            partition by n.name
            order by greatest(
              similarity(unaccent_immutable(g.name_en), unaccent_immutable(n.name)),
              similarity(unaccent_immutable(coalesce(g.name_vi, '')), unaccent_immutable(n.name))
            ) desc
          ) as rn
        from unnest(${sqlTextArray(names)}) as n(name)
        join ${games} g
          on unaccent_immutable(g.name_en) % unaccent_immutable(n.name)
          or unaccent_immutable(coalesce(g.name_vi, '')) % unaccent_immutable(n.name)
      ) ranked
      where rn <= ${SUGGESTION_LIMIT}
      order by input_name, sim desc
    `);

    const map = new Map<string, InventoryImportSuggestion[]>();
    for (const row of result.rows) {
      const list = map.get(row.input_name) ?? [];
      list.push({
        gameId: row.id,
        name: row.name_vi || row.name_en,
        similarity: Number(row.sim),
      });
      map.set(row.input_name, list);
    }
    return map;
  });
}

function matchedResult(row: InventoryImportRawRow, game: GameRef): InventoryImportRowResult {
  return {
    line: row.line,
    input: { name: row.name, nameEn: row.nameEn, bggId: row.bggId, copies: row.copies },
    status: 'matched',
    gameId: game.id,
    gameName: displayName(game),
    suggestions: [],
    error: null,
  };
}

/** Never creates games, same rule as barcode scanning. Order: bggId -> exact name -> trigram
 * suggestions; each step is one batched query regardless of row count. */
export async function matchInventoryRows(
  rows: InventoryImportRawRow[],
): Promise<InventoryImportRowResult[]> {
  const results = new Map<number, InventoryImportRowResult>();
  const pending: InventoryImportRawRow[] = [];

  for (const row of rows) {
    if (row.error) {
      results.set(row.line, {
        line: row.line,
        input: { name: row.name, nameEn: row.nameEn, bggId: row.bggId, copies: row.copies },
        status: 'error',
        gameId: null,
        gameName: null,
        suggestions: [],
        error: row.error,
      });
      continue;
    }
    pending.push(row);
  }

  const bggIds = [...new Set(pending.filter((r) => r.bggId !== null).map((r) => r.bggId!))];
  const byBggId = await findGamesByBggIds(bggIds);

  const afterBggId: InventoryImportRawRow[] = [];
  for (const row of pending) {
    const game = row.bggId !== null ? byBggId.get(row.bggId) : undefined;
    if (game) results.set(row.line, matchedResult(row, game));
    else afterBggId.push(row);
  }

  const exactNames = [...new Set(afterBggId.map((r) => r.name))];
  const byExactName = await findGamesByExactNames(exactNames);

  const afterExact: InventoryImportRawRow[] = [];
  for (const row of afterBggId) {
    const game = byExactName.get(row.name);
    if (game) results.set(row.line, matchedResult(row, game));
    else afterExact.push(row);
  }

  const suggestNames = [...new Set(afterExact.map((r) => r.name))];
  const suggestionsByName = await findGameSuggestionsBatch(suggestNames);

  for (const row of afterExact) {
    const suggestions = suggestionsByName.get(row.name) ?? [];
    const input = { name: row.name, nameEn: row.nameEn, bggId: row.bggId, copies: row.copies };
    results.set(row.line, {
      line: row.line,
      input,
      status: suggestions.length > 0 ? 'suggested' : 'unmatched',
      gameId: null,
      gameName: null,
      suggestions,
      error: null,
    });
  }

  return rows.map((r) => results.get(r.line)!);
}

export async function matchInventoryRow(
  row: InventoryImportRawRow,
): Promise<InventoryImportRowResult> {
  return (await matchInventoryRows([row]))[0]!;
}
