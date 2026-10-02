import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { api, ApiError, session } from '../api/client';

export interface MeUser {
  id: string;
  name: string;
  email: string;
  image: string | null;
  role: string;
  username: string | null;
  displayUsername: string | null;
  bggUsername: string | null;
  cafeMembershipCount: number;
  provinceCode?: string | null;
}

interface SessionState {
  user: MeUser | null;
  loading: boolean;
  signInPassword(login: string, password: string): Promise<void>;
  sendOtp(email: string): Promise<void>;
  signInOtp(email: string, otp: string): Promise<void>;
  signOut(): Promise<void>;
  refresh(): Promise<void>;
}

const SessionContext = createContext<SessionState | null>(null);

const fetchMe = () => api<{ user: MeUser }>('/me').then((r) => r.user);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<MeUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      setUser(await fetchMe());
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) await session.clear();
      setUser(null);
    }
  }, []);

  useEffect(() => {
    session.onUnauthorized(() => {
      void session.clear();
      setUser(null);
    });
    void session
      .load()
      .then(() => refresh())
      .finally(() => setLoading(false));
    return () => session.onUnauthorized(null);
  }, [refresh]);

  const value = useMemo<SessionState>(
    () => ({
      user,
      loading,
      refresh,
      async signInPassword(login, password) {
        const byEmail = login.includes('@');
        await api(byEmail ? '/auth/sign-in/email' : '/auth/sign-in/username', {
          body: byEmail ? { email: login, password } : { username: login, password },
        });
        await refresh();
      },
      async sendOtp(email) {
        await api('/auth/email-otp/send-verification-otp', { body: { email, type: 'sign-in' } });
      },
      async signInOtp(email, otp) {
        await api('/auth/sign-in/email-otp', { body: { email, otp } });
        await refresh();
      },
      async signOut() {
        await api('/auth/sign-out', { body: {} }).catch(() => undefined);
        await session.clear();
        setUser(null);
      },
    }),
    [user, loading, refresh],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionState {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession outside SessionProvider');
  return ctx;
}
