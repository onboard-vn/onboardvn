import { useCallback, useState } from 'react';
import { authErrorMessage } from './auth-errors';

export function useAuthAction() {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const run = useCallback(async (action: () => Promise<unknown>): Promise<boolean> => {
    setPending(true);
    setError(null);
    try {
      await action();
      return true;
    } catch (e) {
      setError(authErrorMessage(e));
      return false;
    } finally {
      setPending(false);
    }
  }, []);

  return { error, pending, run, setError };
}
