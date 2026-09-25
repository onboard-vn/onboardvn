import { readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { pool } from '../db/client.js';
import {
  importCafeGamesCsv,
  importCafesCsv,
  importCategoriesCsv,
  importGamesCsv,
} from './import.js';

interface GenericRow {
  line: number;
  action: string;
  slug?: string;
  name?: string;
  cafeSlug?: string;
  gameSlug?: string;
}

interface GenericResult {
  errors: { line: number; field: string; message: string }[];
  rows: GenericRow[];
  created: number;
  updated: number;
  skipped?: number;
  applied: boolean;
}

function rowLabel(row: GenericRow): string {
  return (
    row.slug ?? row.name ?? (row.cafeSlug && row.gameSlug ? `${row.cafeSlug}/${row.gameSlug}` : '')
  );
}

function printResult(label: string, result: GenericResult): void {
  if (result.errors.length > 0) {
    console.error(`${label}: ${result.errors.length} lỗi:`);
    for (const err of result.errors) {
      console.error(`  line ${err.line}: ${err.field}: ${err.message}`);
    }
    return;
  }
  const mode = result.applied ? 'ĐÃ GHI' : 'dry-run (chưa ghi)';
  const skipPart = result.skipped ? `, ${result.skipped} bỏ qua` : '';
  console.log(
    `${label} (${mode}): ${result.created} tạo mới, ${result.updated} cập nhật${skipPart}.`,
  );
  for (const row of result.rows) {
    console.log(`  line ${row.line}: ${row.action} ${rowLabel(row)}`);
  }
}

function isHeaderOnly(content: string): boolean {
  return content.trim().split('\n').length <= 1;
}

/** Runs stages in dependency order; stops at the first stage with errors so later stages never see a broken prerequisite. */
async function importDirectory(dir: string, apply: boolean): Promise<number> {
  const categoriesContent = await readFile(join(dir, 'facts/categories.csv'), 'utf8');
  const categoriesResult = await importCategoriesCsv(categoriesContent, { apply });
  printResult('facts/categories.csv', categoriesResult);
  if (categoriesResult.errors.length > 0) return 1;

  const gamesContent = await readFile(join(dir, 'facts/games.csv'), 'utf8');
  const gamesResult = await importGamesCsv(gamesContent, { apply });
  printResult('facts/games.csv', gamesResult);
  if (gamesResult.errors.length > 0) return 1;

  console.log('facts/barcodes.csv: bỏ qua (chưa có importer cho barcodes)');

  const cafesContent = await readFile(join(dir, 'cafes/cafes.csv'), 'utf8');
  const cafesResult = await importCafesCsv(cafesContent, { apply });
  printResult('cafes/cafes.csv', cafesResult);
  if (cafesResult.errors.length > 0) return 1;

  const cafeGamesContent = await readFile(join(dir, 'cafes/cafe_games.csv'), 'utf8');
  if (isHeaderOnly(cafeGamesContent)) {
    console.log('cafes/cafe_games.csv: bỏ qua (chỉ có header)');
  } else {
    const cafeGamesResult = await importCafeGamesCsv(cafeGamesContent, { apply });
    printResult('cafes/cafe_games.csv', cafeGamesResult);
    if (cafeGamesResult.errors.length > 0) return 1;
  }

  return 0;
}

const [, , targetPath, ...rest] = process.argv;
const apply = rest.includes('--apply');

if (!targetPath) {
  console.error('Usage: dataset:import <csv|dir> [--apply]');
  process.exit(1);
}

const stats = await stat(targetPath);
let exitCode: number;

if (stats.isDirectory()) {
  exitCode = await importDirectory(targetPath, apply);
} else {
  const content = await readFile(targetPath, 'utf8');
  const result = await importGamesCsv(content, { apply });
  printResult(targetPath, result);
  exitCode = result.errors.length > 0 ? 1 : 0;
}

await pool.end();
process.exit(exitCode);
