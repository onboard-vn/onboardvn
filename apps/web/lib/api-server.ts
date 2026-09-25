import 'server-only';
import type { AppType } from '@onboard/api';
import type { PrivacyLevel, Role } from '@onboard/shared';
import { hc } from 'hono/client';
import { cookies, headers } from 'next/headers';
import { API_INTERNAL_URL } from './env';

export async function serverApi() {
  const cookieHeader = (await cookies()).toString();
  // Forwarded so the API's rate limiter and Better Auth key by the end-user's IP instead of
  // this SSR request's own socket; the API only trusts this header when TRUST_PROXY is set.
  const forwardedFor = (await headers()).get('x-forwarded-for');
  return hc<AppType>(API_INTERNAL_URL, {
    headers: { cookie: cookieHeader, ...(forwardedFor && { 'x-forwarded-for': forwardedFor }) },
  });
}

export interface CurrentUser {
  id: string;
  name: string;
  email: string;
  image: string | null | undefined;
  role: Role;
  username: string | null;
  displayUsername: string | null;
  bggUsername: string | null;
  profileVisibility: PrivacyLevel;
  playsVisibility: PrivacyLevel;
  friendsVisibility: PrivacyLevel;
  emailOnFriendRequest: boolean;
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  try {
    const res = await (await serverApi()).api.me.$get();
    if (!res.ok) return null;
    const { user } = await res.json();
    return user as CurrentUser;
  } catch {
    return null;
  }
}
