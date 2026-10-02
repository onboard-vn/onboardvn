import { useCallback, useEffect, useState } from 'react';
import { api } from '../../api/client';
import { appOrigin } from '../auth/auth-api';

export const inviteUrl = (code: string) => `${appOrigin()}/invite/${code}`;

export function useFriendCode() {
  const [code, setCode] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    api<{ code: string }>('/me/friend-code').then(
      (r) => live && setCode(r.code),
      () => live && setError('Không tải được mã mời kết bạn'),
    );
    return () => {
      live = false;
    };
  }, []);

  const rotate = useCallback(async () => {
    setPending(true);
    setError(null);
    try {
      setCode(
        (await api<{ code: string }>('/me/friend-code/rotate', { method: 'POST', body: {} })).code,
      );
    } catch {
      setError('Không đổi được mã, thử lại sau');
    } finally {
      setPending(false);
    }
  }, []);

  return { code, pending, error, setError, rotate };
}
