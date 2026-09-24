import { resolve } from 'node:path';
import { validateDataset } from './validate.js';

const dir = process.argv[2];
if (!dir) {
  console.error('Usage: dataset:validate <dir>');
  process.exit(1);
}

const issues = await validateDataset(resolve(dir));

if (issues.length === 0) {
  console.log('Dataset hợp lệ.');
  process.exit(0);
}

for (const issue of issues) {
  console.error(`${issue.file}${issue.line ? `:${issue.line}` : ''}: ${issue.message}`);
}
process.exit(1);
