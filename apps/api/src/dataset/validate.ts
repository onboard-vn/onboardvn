import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { gameCreateSchema } from '@onboard/shared';
import {
  ADMIN_UNIT_PROVINCE_COLUMNS,
  ADMIN_UNIT_WARD_COLUMNS,
  CAFE_COLUMNS,
  CAFE_GAME_COLUMNS,
  DESCRIPTION_GAME_COLUMNS,
  FACTS_BARCODE_COLUMNS,
  FACTS_CATEGORY_COLUMNS,
  FACTS_GAME_COLUMNS,
  FORBIDDEN_PII_COLUMNS,
} from './columns.js';
import { parseCsv } from './csv.js';

export interface ValidationIssue {
  file: string;
  line: number;
  message: string;
}

const REQUIRED_FILES = [
  'LICENSE',
  'facts/LICENSE-CC0.txt',
  'facts/games.csv',
  'facts/categories.csv',
  'facts/barcodes.csv',
  'admin-units/LICENSE-MIT.txt',
  'admin-units/provinces.csv',
  'admin-units/wards.csv',
  'descriptions/games.csv',
  'cafes/cafes.csv',
  'cafes/cafe_games.csv',
] as const;

async function readOptional(path: string): Promise<string | undefined> {
  try {
    return await readFile(path, 'utf8');
  } catch {
    return undefined;
  }
}

function checkColumns(
  file: string,
  content: string,
  expected: readonly string[],
): ValidationIssue[] {
  const header = content.split('\n')[0] ?? '';
  const actual = header.split(',');
  const issues: ValidationIssue[] = [];

  for (const forbidden of FORBIDDEN_PII_COLUMNS) {
    if (actual.includes(forbidden)) {
      issues.push({ file, line: 1, message: `cột cấm xuất hiện: ${forbidden}` });
    }
  }
  for (const col of expected) {
    if (!actual.includes(col)) {
      issues.push({ file, line: 1, message: `thiếu cột bắt buộc: ${col}` });
    }
  }
  return issues;
}

function validateGameFactsRows(file: string, content: string): ValidationIssue[] {
  const rows = parseCsv(content);
  const issues: ValidationIssue[] = [];

  rows.forEach((row, index) => {
    const line = index + 2;
    const parsed = gameCreateSchema.safeParse({
      nameVi: row.nameVi || undefined,
      nameEn: row.nameEn || '',
      minPlayers: row.minPlayers ? Number(row.minPlayers) : undefined,
      maxPlayers: row.maxPlayers ? Number(row.maxPlayers) : undefined,
      playMinutes: row.playMinutes ? Number(row.playMinutes) : undefined,
      weight: row.weight ? Number(row.weight) : undefined,
      minAge: row.minAge ? Number(row.minAge) : undefined,
      isVietnamese: row.isVietnamese ? row.isVietnamese === 'true' : undefined,
      bggId: row.bggId ? Number(row.bggId) : undefined,
    });
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        issues.push({
          file,
          line,
          message: `${issue.path.join('.') || '(row)'}: ${issue.message}`,
        });
      }
    }
    if (!row.slug) issues.push({ file, line, message: 'slug: thiếu' });
  });

  return issues;
}

export async function validateDataset(dir: string): Promise<ValidationIssue[]> {
  const issues: ValidationIssue[] = [];

  for (const rel of REQUIRED_FILES) {
    const content = await readOptional(join(dir, rel));
    if (content === undefined) {
      issues.push({ file: rel, line: 0, message: 'file bị thiếu' });
    }
  }
  if (issues.length > 0) return issues;

  const [
    gamesCsv,
    categoriesCsv,
    barcodesCsv,
    provincesCsv,
    wardsCsv,
    descriptionsCsv,
    cafesCsv,
    cafeGamesCsv,
  ] = (await Promise.all(
    [
      'facts/games.csv',
      'facts/categories.csv',
      'facts/barcodes.csv',
      'admin-units/provinces.csv',
      'admin-units/wards.csv',
      'descriptions/games.csv',
      'cafes/cafes.csv',
      'cafes/cafe_games.csv',
    ].map((rel) => readFile(join(dir, rel), 'utf8')),
  )) as [string, string, string, string, string, string, string, string];

  issues.push(...checkColumns('facts/games.csv', gamesCsv, FACTS_GAME_COLUMNS));
  issues.push(...checkColumns('facts/categories.csv', categoriesCsv, FACTS_CATEGORY_COLUMNS));
  issues.push(...checkColumns('facts/barcodes.csv', barcodesCsv, FACTS_BARCODE_COLUMNS));
  issues.push(
    ...checkColumns('admin-units/provinces.csv', provincesCsv, ADMIN_UNIT_PROVINCE_COLUMNS),
  );
  issues.push(...checkColumns('admin-units/wards.csv', wardsCsv, ADMIN_UNIT_WARD_COLUMNS));
  issues.push(...checkColumns('descriptions/games.csv', descriptionsCsv, DESCRIPTION_GAME_COLUMNS));
  issues.push(...checkColumns('cafes/cafes.csv', cafesCsv, CAFE_COLUMNS));
  issues.push(...checkColumns('cafes/cafe_games.csv', cafeGamesCsv, CAFE_GAME_COLUMNS));

  issues.push(...validateGameFactsRows('facts/games.csv', gamesCsv));

  return issues;
}
