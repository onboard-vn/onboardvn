import { useCallback, useEffect, useRef } from 'react';
import { playsApi } from '../api/plays';
import type { SheetApi } from './use-sheet';

const FLUSH_DELAY_MS = 400;
const RETRY_MS = 3000;

export function usePlaySync(playId: string | undefined, sheet: SheetApi) {
  const { applyRemote, setPresence, ackOps } = sheet;
  const pending = sheet.state.pendingOps;
  const pendingRef = useRef(pending);
  useEffect(() => {
    pendingRef.current = pending;
  }, [pending]);
  const inflight = useRef(new Set<string>());

  const flush = useCallback(async () => {
    if (!playId) return;
    const batch = pendingRef.current.filter((o) => !inflight.current.has(o.opId));
    if (batch.length === 0) return;
    batch.forEach((o) => inflight.current.add(o.opId));
    try {
      const res = await playsApi.sendOps(playId, batch);
      ackOps(res.appliedOpIds);
    } finally {
      batch.forEach((o) => inflight.current.delete(o.opId));
    }
  }, [playId, ackOps]);

  useEffect(() => {
    if (!playId) return;
    return playsApi.subscribe(playId, (e) => {
      if (e.type === 'op') applyRemote(e.op);
      else setPresence(e.identityId, e.typing);
    });
  }, [playId, applyRemote, setPresence]);

  useEffect(() => {
    if (!playId || pending.length === 0) return;
    let retry: ReturnType<typeof setTimeout> | undefined;
    const run = () => {
      flush().catch(() => {
        retry = setTimeout(run, RETRY_MS);
      });
    };
    const t = setTimeout(run, FLUSH_DELAY_MS);
    return () => {
      clearTimeout(t);
      if (retry) clearTimeout(retry);
    };
  }, [playId, pending, flush]);

  return { flush, unsynced: pending.length };
}
