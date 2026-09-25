'use client';

import type { FriendSummary } from '@onboard/shared';
import { useEffect, useState } from 'react';
import { FormError } from '@/components/form-error';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';

function displayName(u: Pick<FriendSummary, 'displayUsername' | 'username' | 'name'>) {
  return u.displayUsername ?? u.username ?? u.name;
}

export function InviteFriendsPicker({
  meetupId,
  onDone,
}: {
  meetupId: string;
  onDone: () => void;
}) {
  const [friends, setFriends] = useState<FriendSummary[] | null>(null);
  const [invited, setInvited] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.api.friends.$get().then(async (res) => {
      setFriends(res.ok ? (await res.json()).items : []);
    });
  }, []);

  async function invite(userId: string) {
    setError(null);
    const res = await api.api.events[':id'].invite.$post({
      param: { id: meetupId },
      json: { userIds: [userId] },
    });
    if (!res.ok) {
      setError('Không mời được, thử lại sau');
      return;
    }
    setInvited((prev) => new Set(prev).add(userId));
  }

  if (!friends) return <p className="text-muted-foreground text-sm">Đang tải...</p>;
  if (friends.length === 0)
    return <p className="text-muted-foreground text-sm">Bạn chưa có bạn bè nào.</p>;

  return (
    <div className="flex flex-col gap-2">
      <ul className="flex flex-col gap-1 text-sm">
        {friends.map((f) => (
          <li key={f.id} className="flex items-center justify-between gap-2">
            <span>{displayName(f)}</span>
            <Button size="xs" disabled={invited.has(f.id)} onClick={() => void invite(f.id)}>
              {invited.has(f.id) ? 'Đã mời' : 'Mời'}
            </Button>
          </li>
        ))}
      </ul>
      <FormError message={error} />
      <Button size="sm" variant="ghost" className="self-start" onClick={onDone}>
        Xong
      </Button>
    </div>
  );
}
