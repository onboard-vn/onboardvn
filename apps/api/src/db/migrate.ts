import { resolve } from 'node:path';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { db, pool } from './client.js';

// Resolves to apps/api/drizzle from both src/db and dist/db.
const migrationsFolder = resolve(import.meta.dirname, '../../drizzle');

await migrate(db, { migrationsFolder });
await pool.end();
console.log('migrations applied');
