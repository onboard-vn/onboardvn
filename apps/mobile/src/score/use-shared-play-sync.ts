import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import type {
  PlayDto,
  PlayPollResponse,
  PlayStreamEvent,
  PlayValuesResponse,
} from '@onboard/shared';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError, api, apiRaw } from '../api/client';
import { QUICK_KEY, ROUND_KEY, TEAM_ID, type PlayOp } from '../api/plays-types';
import { sharedTeamIdentity, sheetStateFromPlay } from './shared-play-state';
import type { SheetApi } from './use-sheet';

const DEBOUNCE_MS = 350;
const RETRY_MS = 2500;
const POLL_MS = 1800;

const pendingKey = (playId: string, userId: string) =>
  `onboard:shared-pending:v1:${userId}:${playId}`;

function isPlayDto(value: unknown): value is PlayDto {
  return (
    !!value && typeof value === 'object' && 'id' in value && 'players' in value && 'rev' in value
  );
}

function storedOps(raw: string | null): PlayOp[] {
  if (!raw) return [];
  try {
    const value: unknown = JSON.parse(raw);
    if (!Array.isArray(value)) return [];
    return value.filter(
      (op): op is PlayOp =>
        !!op &&
        typeof op === 'object' &&
        typeof op.opId === 'string' &&
        typeof op.actorId === 'string' &&
        typeof op.identityId === 'string' &&
        typeof op.categoryKey === 'string' &&
        (op.inputKey === undefined || typeof op.inputKey === 'string') &&
        'value' in op,
    );
  } catch {
    return [];
  }
}

function toServerOps(ops: PlayOp[], play: PlayDto, template: SheetApi['template']) {
  const teamIdentity = sharedTeamIdentity(play);
  const roundCategory = template.categories.find((category) => category.input === 'perRound')?.key;
  return ops.flatMap((op) => {
    const identityId = op.identityId === TEAM_ID ? teamIdentity : op.identityId;
    if (!identityId) return [];
    const categoryKey =
      op.categoryKey === QUICK_KEY
        ? 'total'
        : op.categoryKey === ROUND_KEY
          ? roundCategory
          : op.categoryKey;
    if (!categoryKey) return [];
    return [
      {
        opId: op.opId,
        identityId,
        categoryKey,
        ...(op.categoryKey === ROUND_KEY && op.roundIndex !== undefined
          ? { roundIndex: op.roundIndex }
          : {}),
        ...(op.inputKey !== undefined ? { inputKey: op.inputKey } : {}),
        value: op.value,
      },
    ];
  });
}

export function useSharedPlaySync(
  playId: string,
  userId: string,
  initialPlay: PlayDto,
  sheet: SheetApi,
  onPlayChange?: (play: PlayDto) => void,
) {
  const { applySnapshot, ackOps, restorePending, replaceSnapshot, state } = sheet;
  const onPlayChangeRef = useRef(onPlayChange);
  const pending = state.pendingOps;
  const pendingRef = useRef(pending);
  const serverPlayRef = useRef(initialPlay);
  const latestRev = useRef(initialPlay.rev);
  const flushTask = useRef<Promise<void> | null>(null);
  const outcomeInflight = useRef<'win' | 'loss' | null | undefined>(undefined);
  const [serverPlay, setServerPlay] = useState(initialPlay);
  const [restored, setRestored] = useState(false);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [blockedSync, setBlockedSync] = useState<string | null>(null);

  const hasPermissionForPending = useCallback(
    (play: PlayDto, ops: PlayOp[]) => {
      const seatedIds = new Set(play.players.map((row) => row.identity.id));
      return ops.every((op) => {
        if (op.actorId !== userId) return true;
        if (op.identityId === TEAM_ID) return play.canManage;
        return (
          seatedIds.has(op.identityId) &&
          (play.canManage || play.editableIdentityIds.includes(op.identityId))
        );
      });
    },
    [userId],
  );

  useEffect(() => {
    pendingRef.current = pending;
  }, [pending]);
  useEffect(() => {
    onPlayChangeRef.current = onPlayChange;
  }, [onPlayChange]);

  const applyServerPlay = useCallback(
    (play: PlayDto, notifyParent = false) => {
      if (play.id !== playId || play.rev < latestRev.current) return;
      const previous = serverPlayRef.current;
      const permissionsChanged =
        previous.canManage !== play.canManage ||
        previous.editableIdentityIds.join('|') !== play.editableIdentityIds.join('|');
      const changed =
        previous.rev !== play.rev || previous.status !== play.status || permissionsChanged;
      latestRev.current = play.rev;
      serverPlayRef.current = play;
      setServerPlay(play);
      applySnapshot(sheetStateFromPlay(sheet.template, play));
      const queued = pendingRef.current;
      if (queued.length > 0 && !hasPermissionForPending(play, queued)) {
        setBlockedSync(
          'Quyền sửa hàng điểm đã thay đổi. Các chỉnh sửa chưa đồng bộ vẫn được giữ trên thiết bị.',
        );
      }
      if (notifyParent && changed) onPlayChangeRef.current?.(play);
    },
    [applySnapshot, hasPermissionForPending, playId, sheet.template],
  );

  useEffect(() => {
    applyServerPlay(initialPlay);
  }, [applyServerPlay, initialPlay]);

  useEffect(() => {
    let live = true;
    void AsyncStorage.getItem(pendingKey(playId, userId))
      .then((raw) => {
        if (!live) return;
        const ops = storedOps(raw).filter((op) => op.actorId === userId);
        restorePending(ops);
        if (ops.length > 0 && !hasPermissionForPending(serverPlayRef.current, ops)) {
          setBlockedSync(
            'Quyền sửa hàng điểm đã thay đổi. Các chỉnh sửa chưa đồng bộ vẫn được giữ trên thiết bị.',
          );
        }
        setRestored(true);
      })
      .catch((err: unknown) => {
        if (!live) return;
        setError(err instanceof Error ? err.message : 'Không khôi phục được thay đổi đang chờ.');
        setRestored(true);
      });
    return () => {
      live = false;
    };
  }, [hasPermissionForPending, playId, restorePending, userId]);

  useEffect(() => {
    if (!restored) return;
    if (pending.length === 0) {
      void AsyncStorage.removeItem(pendingKey(playId, userId)).catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Không lưu được thay đổi đang chờ.');
      });
    } else {
      void AsyncStorage.setItem(pendingKey(playId, userId), JSON.stringify(pending)).catch(
        (err: unknown) => {
          setError(err instanceof Error ? err.message : 'Không lưu được thay đổi đang chờ.');
        },
      );
    }
  }, [pending, playId, restored, userId]);

  const flush = useCallback(async () => {
    while (true) {
      const activeTask = flushTask.current;
      if (activeTask) {
        await activeTask;
        continue;
      }

      const batch = pendingRef.current;
      if (batch.length === 0) return;
      const task = (async () => {
        const ops = toServerOps(batch, serverPlayRef.current, sheet.template);
        if (ops.length === 0) {
          const message = 'Không tìm thấy người chơi cho thay đổi đang chờ.';
          setBlockedSync(message);
          throw new Error(message);
        }
        const response = await api<PlayValuesResponse>(`/plays/${playId}/values`, {
          method: 'PATCH',
          body: { ops },
        });
        const applied = new Set(response.applied);
        pendingRef.current = pendingRef.current.filter((op) => !applied.has(op.opId));
        ackOps(response.applied);
        applyServerPlay(response.play, true);
        setError(null);
        setBlockedSync(null);
        if (applied.size < batch.length) {
          const message =
            'Một số thay đổi chưa được máy chủ áp dụng. Các chỉnh sửa vẫn được giữ trên thiết bị.';
          setBlockedSync(message);
          throw new Error(message);
        }
      })();
      flushTask.current = task;
      try {
        await task;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Không đồng bộ được điểm.');
        if (err instanceof ApiError && [400, 401, 403, 404, 409, 422].includes(err.status)) {
          setBlockedSync(err.message || 'Máy chủ từ chối các chỉnh sửa đang chờ.');
        }
        throw err;
      } finally {
        if (flushTask.current === task) flushTask.current = null;
      }
    }
  }, [ackOps, applyServerPlay, playId, sheet.template]);

  useEffect(() => {
    if (
      !restored ||
      pending.length === 0 ||
      serverPlayRef.current.status !== 'draft' ||
      blockedSync
    )
      return;
    let retry: ReturnType<typeof setTimeout> | undefined;
    const run = () => {
      void flush().catch(() => {
        retry = setTimeout(run, RETRY_MS);
      });
    };
    const timer = setTimeout(run, DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
      if (retry) clearTimeout(retry);
    };
  }, [blockedSync, flush, pending, restored]);

  useEffect(() => {
    if (Platform.OS !== 'web') {
      let live = true;
      let timer: ReturnType<typeof setTimeout> | undefined;
      const poll = async () => {
        if (!live) return;
        try {
          const response = await api<PlayPollResponse>(
            `/plays/${playId}?sinceRev=${latestRev.current}`,
          );
          if (!live) return;
          if (response.play) applyServerPlay(response.play, true);
          setConnected(true);
          setError(null);
        } catch (err) {
          if (live) {
            setConnected(false);
            setError(err instanceof Error ? err.message : 'Mất kết nối với bàn.');
          }
        } finally {
          if (live) timer = setTimeout(poll, POLL_MS);
        }
      };
      void poll();
      return () => {
        live = false;
        if (timer) clearTimeout(timer);
      };
    }

    const controller = new AbortController();
    let live = true;
    const stream = async () => {
      try {
        const response = await apiRaw(`/plays/${playId}/stream`, {
          signal: controller.signal,
        });
        if (!response.ok) throw new ApiError(response.status, 'Không mở được luồng cập nhật.');
        if (!response.body) throw new Error('Luồng cập nhật không khả dụng.');
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        setConnected(true);
        setError(null);
        while (live) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          let boundary = buffer.indexOf('\n\n');
          while (boundary >= 0) {
            const block = buffer.slice(0, boundary).replace(/\r/g, '');
            buffer = buffer.slice(boundary + 2);
            const data = block
              .split('\n')
              .filter((line) => line.startsWith('data:'))
              .map((line) => line.slice(5).trim())
              .join('\n');
            if (data) {
              const event = JSON.parse(data) as PlayDto | PlayStreamEvent;
              if (isPlayDto(event)) applyServerPlay(event, true);
              else if (event.state) applyServerPlay(event.state, true);
            }
            boundary = buffer.indexOf('\n\n');
          }
        }
        if (live) throw new Error('Bàn đã ngắt kết nối.');
      } catch (err) {
        if (live) {
          setConnected(false);
          setError(err instanceof Error ? err.message : 'Mất kết nối với bàn.');
          await new Promise<void>((resolve) => setTimeout(resolve, RETRY_MS));
          if (live) void stream();
        }
      }
    };
    void stream();
    return () => {
      live = false;
      controller.abort();
    };
  }, [applyServerPlay, playId]);

  const canManage = sheet.canManage;
  useEffect(() => {
    if (!canManage || serverPlay.status !== 'draft' || state.outcome === serverPlay.outcome) return;
    if (outcomeInflight.current === state.outcome) return;
    const desired = state.outcome;
    outcomeInflight.current = desired;
    void api<PlayDto>(`/plays/${playId}`, {
      method: 'PATCH',
      body: { outcome: desired },
    })
      .then((play) => {
        outcomeInflight.current = undefined;
        applyServerPlay(play);
      })
      .catch((err: unknown) => {
        outcomeInflight.current = undefined;
        setError(err instanceof Error ? err.message : 'Không đồng bộ được kết quả.');
      });
  }, [applyServerPlay, canManage, playId, serverPlay.outcome, serverPlay.status, state.outcome]);

  const syncError =
    restored && serverPlay.status === 'final' && pending.length > 0
      ? 'Ván đã được chốt trước khi các thay đổi trên thiết bị này được đồng bộ.'
      : (blockedSync ?? error);
  const discardPending = useCallback(() => {
    replaceSnapshot(sheetStateFromPlay(sheet.template, serverPlayRef.current));
    pendingRef.current = [];
    setBlockedSync(null);
    setError(null);
    void AsyncStorage.removeItem(pendingKey(playId, userId)).catch((err: unknown) => {
      setError(err instanceof Error ? err.message : 'Không xóa được thay đổi đã bỏ khỏi thiết bị.');
    });
  }, [playId, replaceSnapshot, sheet.template, userId]);
  const retrySync = useCallback(() => {
    setBlockedSync(null);
    setError(null);
    void flush().catch(() => undefined);
  }, [flush]);
  return {
    flush,
    unsynced: pending.length,
    connected,
    error: syncError,
    serverPlay,
    restored,
    blocked: !!blockedSync || (serverPlay.status === 'final' && pending.length > 0),
    discardPending,
    retrySync,
  };
}
