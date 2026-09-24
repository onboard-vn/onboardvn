import { resolve } from 'node:path';
import { pool } from '../db/client.js';
import { exportDataset } from './export.js';

const outDir = resolve(process.cwd(), process.argv[2] ?? 'dataset-export');

await exportDataset(outDir);
await pool.end();
console.log(`Dataset exported to ${outDir}`);
