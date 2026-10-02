import { useCallback, useEffect, useState } from 'react';

export interface Loaded<T> {
  data: T | undefined;
  error: string | null;
  loading: boolean;
  reload: () => void;
}

interface Result<T> {
  key: string;
  data: T | undefined;
  error: string | null;
}

export function useLoad<T>(load: (() => Promise<T>) | null, deps: unknown[]): Loaded<T> {
  const [nonce, setNonce] = useState(0);
  const [result, setResult] = useState<Result<T>>({ key: '', data: undefined, error: null });
  const reload = useCallback(() => setNonce((n) => n + 1), []);
  const key = JSON.stringify([...deps, nonce]);
  const enabled = load !== null;

  useEffect(() => {
    if (!load) return;
    let live = true;
    load().then(
      (data) => live && setResult({ key, data, error: null }),
      (e: unknown) =>
        live &&
        setResult((r) => ({
          key,
          data: r.data,
          error: e instanceof Error ? e.message : 'Lỗi tải dữ liệu',
        })),
    );
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, enabled]);

  return {
    data: result.data,
    error: result.key === key ? result.error : null,
    loading: enabled && result.key !== key,
    reload,
  };
}
