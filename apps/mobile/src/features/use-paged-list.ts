import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../api/client';
import { errorMessage } from './errors';

interface Paged<T> {
  items: T[];
  total: number;
}

interface State<T> {
  key: string | null;
  items: T[];
  total: number;
  page: number;
  error: string | null;
  more: boolean;
}

type Query = Record<string, string | number>;

export function usePagedList<T>(path: string, query: Query, pageSize = 20) {
  const [nonce, setNonce] = useState(0);
  const [state, setState] = useState<State<T>>({
    key: null,
    items: [],
    total: 0,
    page: 1,
    error: null,
    more: false,
  });
  const key = `${path}?${JSON.stringify(query)}#${nonce}`;
  const queryRef = useRef(query);
  useEffect(() => {
    queryRef.current = query;
  });

  const fetchPage = useCallback(
    (page: number, signal?: AbortSignal) =>
      api<Paged<T>>(path, { query: { ...queryRef.current, page, pageSize }, signal }),
    [path, pageSize],
  );

  useEffect(() => {
    const ctrl = new AbortController();
    fetchPage(1, ctrl.signal)
      .then((res) => {
        if (ctrl.signal.aborted) return;
        setState({ key, items: res.items, total: res.total, page: 1, error: null, more: false });
      })
      .catch((e: unknown) => {
        if (ctrl.signal.aborted) return;
        setState({ key, items: [], total: 0, page: 1, error: errorMessage(e), more: false });
      });
    return () => ctrl.abort();
  }, [fetchPage, key]);

  const current = state.key === key;
  const loading = !current || state.more;
  const error = current ? state.error : null;

  const fetchMore = useCallback(() => {
    const page = state.page + 1;
    setState((s) => ({ ...s, more: true, error: null }));
    fetchPage(page)
      .then((res) =>
        setState((s) =>
          s.key !== key ? s : { ...s, items: [...s.items, ...res.items], page, more: false },
        ),
      )
      .catch((e: unknown) =>
        setState((s) => (s.key !== key ? s : { ...s, more: false, error: errorMessage(e) })),
      );
  }, [fetchPage, key, state.page]);

  const loadMore = useCallback(() => {
    if (!loading && !error && state.items.length < state.total) fetchMore();
  }, [loading, error, state.items.length, state.total, fetchMore]);

  const retry = useCallback(() => {
    if (state.items.length === 0) setNonce((n) => n + 1);
    else fetchMore();
  }, [state.items.length, fetchMore]);

  return {
    items: state.items,
    total: state.total,
    loading,
    error,
    loadMore,
    retry,
  };
}
