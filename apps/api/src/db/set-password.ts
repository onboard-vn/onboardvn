import { randomBytes, randomUUID } from 'node:crypto';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { auth } from '../auth/better-auth.js';
import { db, pool } from './client.js';
import { accounts, users } from './schema/index.js';

const { EMAIL, PASSWORD } = z
  .object({ EMAIL: z.email(), PASSWORD: z.string().min(12).optional() })
  .parse(process.env);

const user = await db.query.users.findFirst({ where: eq(users.email, EMAIL) });
if (!user) {
  console.error(`no user with email ${EMAIL}`);
  process.exit(1);
}

const password = PASSWORD ?? randomBytes(18).toString('base64url');
const ctx = await auth.$context;
const hash = await ctx.password.hash(password);

const existing = await db.query.accounts.findFirst({
  where: and(eq(accounts.userId, user.id), eq(accounts.providerId, 'credential')),
});
if (existing) {
  await db.update(accounts).set({ password: hash }).where(eq(accounts.id, existing.id));
} else {
  await db.insert(accounts).values({
    id: randomUUID(),
    accountId: user.id,
    providerId: 'credential',
    userId: user.id,
    password: hash,
  });
}
await db.update(users).set({ emailVerified: true }).where(eq(users.id, user.id));
await pool.end();

// Printed once so it can be redirected into a 0600 file; never logged elsewhere.
process.stdout.write(PASSWORD ? `password updated for ${EMAIL}\n` : `${password}\n`);
