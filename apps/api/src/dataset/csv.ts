import { parse } from 'csv-parse/sync';
import { stringify } from 'csv-stringify/sync';

type CsvValue = string | number | boolean | null | undefined | string[];

function toCell(value: CsvValue): string {
  if (value === null || value === undefined) return '';
  if (Array.isArray(value)) return value.join(';');
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  return String(value);
}

/** RFC4180 CSV with `\n` line endings and a fixed column order, for stable byte-for-byte diffs. */
export function toCsv(columns: readonly string[], rows: Record<string, CsvValue>[]): string {
  const cells = rows.map((row) =>
    Object.fromEntries(columns.map((col) => [col, toCell(row[col])])),
  );
  return stringify(cells, { header: true, columns: [...columns], record_delimiter: '\n' });
}

export function parseCsv(content: string): Record<string, string>[] {
  return parse(content, { columns: true, skip_empty_lines: true, trim: true }) as Record<
    string,
    string
  >[];
}

export interface CsvRecordWithLine {
  record: Record<string, string>;
  /** 1-based source line where the record ends; header is line 1. Accounts for multi-line quoted fields. */
  line: number;
}

export function parseCsvWithLines(content: string): CsvRecordWithLine[] {
  const rows = parse(content, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    info: true,
  }) as { record: Record<string, string>; info: { lines: number } }[];
  return rows.map(({ record, info }) => ({ record, line: info.lines }));
}

export function toJson(data: unknown): string {
  return `${JSON.stringify(data, null, 2)}\n`;
}
