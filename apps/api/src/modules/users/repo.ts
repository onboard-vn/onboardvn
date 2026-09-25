import { eq } from 'drizzle-orm';
import { db } from '../../db/client.js';
import { users } from '../../db/schema/index.js';

export async function findPublicUserByUsername(username: string) {
  const [row] = await db
    .select({
      username: users.username,
      displayUsername: users.displayUsername,
      name: users.name,
      image: users.image,
      bggUsername: users.bggUsername,
    })
    .from(users)
    .where(eq(users.username, username))
    .limit(1);
  return row;
}
