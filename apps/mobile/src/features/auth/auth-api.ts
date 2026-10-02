import { Platform } from 'react-native';
import { api, apiBase } from '../../api/client';

export const appOrigin = (): string =>
  Platform.OS === 'web' && typeof window !== 'undefined' ? window.location.origin : apiBase();

interface UrlResult {
  url?: string;
  redirect?: boolean;
}

const post = <T = unknown>(path: string, body: unknown) => api<T>(path, { method: 'POST', body });

export const signUpEmail = (input: {
  email: string;
  password: string;
  username: string;
  name: string;
  callbackURL: string;
}) => post('/auth/sign-up/email', input);

export const requestPasswordReset = (email: string, redirectTo: string) =>
  post('/auth/request-password-reset', { email, redirectTo });

export const resetPassword = (newPassword: string, token: string) =>
  post('/auth/reset-password', { newPassword, token });

export const changePassword = (currentPassword: string, newPassword: string) =>
  post('/auth/change-password', { currentPassword, newPassword, revokeOtherSessions: true });

export const updateUser = (input: Record<string, unknown>) => post('/auth/update-user', input);

export const listProviders = () =>
  api<{ providerId: string }[]>('/auth/list-accounts').then((a) => a.map((x) => x.providerId));

export async function startSocial(
  kind: 'sign-in/social' | 'link-social',
  callbackURL: string,
): Promise<void> {
  const res = await post<UrlResult>(`/auth/${kind}`, { provider: 'google', callbackURL });
  if (!res.url) throw new Error('Missing redirect url');
  window.location.href = res.url;
}
