import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { db, pool } from './client.js';
import { users } from './schema/index.js';

const { ADMIN_EMAIL, ADMIN_NAME } = z
  .object({ ADMIN_EMAIL: z.email(), ADMIN_NAME: z.string().default('Admin') })
  .parse(process.env);

await db
  .insert(users)
  .values({
    id: randomUUID(),
    email: ADMIN_EMAIL,
    name: ADMIN_NAME,
    role: 'admin',
    emailVerified: true,
  })
  .onConflictDoUpdate({ target: users.email, set: { role: 'admin' } });

await pool.end();
console.log(`admin ensured: ${ADMIN_EMAIL}`);
