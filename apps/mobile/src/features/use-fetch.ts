import { useCallback, useEffect, useState } from 'react';
import { ApiError } from '../api/client';
import { errorMessage } from './errors';

interface FetchState<T> {
  data: T | null;
  error: string | null;
  status: number | null;
  loading: boolean;
}

export function useFetch<T>(load: (signal: AbortSignal) => Promise<T>) {
  const [state, setState] = useState<FetchState<T>>({
    data: null,
    error: null,
    status: null,
    loading: true,
  });
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    const ctrl = new AbortController();
    load(ctrl.signal)
      .then((data) => {
        if (!ctrl.signal.aborted) setState({ data, error: null, status: null, loading: false });
      })
      .catch((e: unknown) => {
        if (ctrl.signal.aborted) return;
        setState({
          data: null,
          error: errorMessage(e),
          status: e instanceof ApiError ? e.status : null,
          loading: false,
        });
      });
    return () => ctrl.abort();
  }, [load, nonce]);

  const reload = useCallback(() => {
    setState((s) => ({ ...s, loading: true, error: null }));
    setNonce((n) => n + 1);
  }, []);

  const setData = useCallback(
    (update: (prev: T) => T) =>
      setState((s) => (s.data === null ? s : { ...s, data: update(s.data) })),
    [],
  );

  return { ...state, reload, setData };
}
