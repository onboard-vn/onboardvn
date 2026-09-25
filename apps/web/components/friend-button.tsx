'use client';

import { useEffect, useState } from 'react';
import { FormError } from '@/components/form-error';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';

type FriendState = 'loading' | 'none' | 'outgoing' | 'incoming' | 'friends';

export function FriendButton({ username }: { username: string }) {
  const [state, setState] = useState<FriendState>('loading');
  const [fromUserId, setFromUserId] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const [friendsRes, incomingRes, outgoingRes] = await Promise.all([
        api.api.friends.$get(),
        api.api.friends.requests.$get({ query: { dir: 'in' } }),
        api.api.friends.requests.$get({ query: { dir: 'out' } }),
      ]);
      if (!friendsRes.ok || !incomingRes.ok || !outgoingRes.ok) throw new Error();
      const friends = (await friendsRes.json()).items;
      if (friends.some((f) => f.username === username)) return { state: 'friends' as const };

      const incoming = (await incomingRes.json()).items;
      const incomingMatch = incoming.find((r) => r.user.username === username);
      if (incomingMatch) {
        return { state: 'incoming' as const, fromUserId: incomingMatch.fromUserId };
      }

      const outgoing = (await outgoingRes.json()).items;
      if (outgoing.some((r) => r.user.username === username)) return { state: 'outgoing' as const };

      return { state: 'none' as const };
    }

    load()
      .then((result) => {
        if (cancelled) return;
        setState(result.state);
        setFromUserId('fromUserId' in result ? (result.fromUserId ?? null) : null);
      })
      .catch(() => !cancelled && setState('none'));

    return () => {
      cancelled = true;
    };
  }, [username]);

  async function send() {
    setPending(true);
    setError(null);
    try {
      const res = await api.api.friends.requests.$post({ json: { username } });
      if (!res.ok) throw new Error();
      const body = await res.json();
      setState(body.status === 'accepted' ? 'friends' : 'outgoing');
    } catch {
      setError('Không gửi được lời mời, thử lại sau');
    } finally {
      setPending(false);
    }
  }

  async function accept() {
    if (!fromUserId) return;
    setPending(true);
    setError(null);
    try {
      const res = await api.api.friends.requests[':fromUserId'].accept.$post({
        param: { fromUserId },
      });
      if (!res.ok) throw new Error();
      setState('friends');
    } catch {
      setError('Không chấp nhận được, thử lại sau');
    } finally {
      setPending(false);
    }
  }

  if (state === 'loading') return null;

  if (state === 'friends') {
    return (
      <Button variant="outline" size="sm" disabled>
        Bạn bè
      </Button>
    );
  }

  if (state === 'outgoing') {
    return (
      <Button variant="outline" size="sm" disabled>
        Đã gửi lời mời
      </Button>
    );
  }

  if (state === 'incoming') {
    return (
      <div className="flex flex-col gap-1">
        <Button size="sm" disabled={pending} onClick={accept}>
          Chấp nhận lời mời
        </Button>
        <FormError message={error} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <Button size="sm" disabled={pending} onClick={send}>
        Kết bạn
      </Button>
      <FormError message={error} />
    </div>
  );
}
