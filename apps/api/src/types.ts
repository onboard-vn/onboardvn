import type { AuthSession } from './auth/better-auth.js';

export type SessionUser = AuthSession['user'];

export interface AppEnv {
  Variables: {
    requestId: string;
    user: SessionUser | null;
    session: AuthSession['session'] | null;
  };
}
