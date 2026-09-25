'use client';

import { useState } from 'react';
import { authErrorMessage, type AuthClientError } from './auth-errors';

type AuthResult = { error: AuthClientError | null };

export function useAuthAction() {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function run(action: () => Promise<AuthResult>): Promise<boolean> {
    setPending(true);
    setError(null);
    try {
      const { error } = await action();
      if (error) setError(authErrorMessage(error));
      return !error;
    } finally {
      setPending(false);
    }
  }

  return { error, pending, run, setError };
}
