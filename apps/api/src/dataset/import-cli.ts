import { readFile } from 'node:fs/promises';
import { pool } from '../db/client.js';
import { importGamesCsv } from './import.js';

const [, , filePath, ...rest] = process.argv;
const apply = rest.includes('--apply');

if (!filePath) {
  console.error('Usage: dataset:import <csv> [--apply]');
  process.exit(1);
}

const content = await readFile(filePath, 'utf8');
const result = await importGamesCsv(content, { apply });

if (result.errors.length > 0) {
  console.error(`${result.errors.length} lỗi:`);
  for (const err of result.errors) {
    console.error(`line ${err.line}: ${err.field}: ${err.message}`);
  }
} else {
  const mode = apply ? 'ĐÃ GHI' : 'dry-run (chưa ghi)';
  console.log(`${mode}: ${result.created} tạo mới, ${result.updated} cập nhật.`);
  for (const row of result.rows) {
    console.log(`line ${row.line}: ${row.action} ${row.slug}`);
  }
}

await pool.end();
process.exit(result.errors.length > 0 ? 1 : 0);
