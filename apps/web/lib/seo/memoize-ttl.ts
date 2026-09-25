/** Caches the resolved value for `ttlMs` and shares in-flight calls; failures are not cached. */
export function memoizeTtl<T>(load: () => Promise<T>, ttlMs: number): () => Promise<T> {
  let entry: { value: Promise<T>; expiresAt: number } | undefined;
  return () => {
    const now = Date.now();
    if (!entry || entry.expiresAt <= now) {
      const value = load();
      const current = { value, expiresAt: now + ttlMs };
      entry = current;
      value.catch(() => {
        if (entry === current) entry = undefined;
      });
    }
    return entry.value;
  };
}
