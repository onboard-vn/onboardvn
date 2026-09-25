import { z } from 'zod';

export const bggUsernameSchema = z
  .string()
  .trim()
  .regex(/^[A-Za-z0-9_ -]{3,50}$/, 'Username BGG 3-50 ký tự: chữ, số, _, -, khoảng trắng');

export const publicProfileSchema = z.object({
  username: z.string(),
  displayUsername: z.string().nullable(),
  name: z.string(),
  image: z.string().nullable(),
  bggUsername: z.string().nullable(),
  bggUrl: z.string().nullable(),
});
export type PublicProfile = z.infer<typeof publicProfileSchema>;

export function bggProfileUrl(bggUsername: string): string {
  return `https://boardgamegeek.com/user/${encodeURIComponent(bggUsername)}`;
}
