import { createHmac } from 'node:crypto';

export type LoginDigest = string & { readonly __brand: 'LoginDigest' };

export function digestLoginId(raw: string): LoginDigest {
  const key = process.env.CLUB_LOGIN_HMAC_KEY;
  if (!key || key.length < 32) throw new Error('Club login digest key is not configured');

  return createHmac('sha256', key)
    .update(`club-login:v1:${raw.trim()}`)
    .digest('hex') as LoginDigest;
}
