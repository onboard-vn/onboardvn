'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { InviteFriendsPicker } from '@/components/events/invite-friends-picker';
import { InviteShare } from '@/components/events/invite-share';
import { Button, buttonVariants } from '@/components/ui/button';
import { api } from '@/lib/api';

export function CreatorActions({
  meetupId,
  slug,
  title,
}: {
  meetupId: string;
  slug: string;
  title: string;
}) {
  const router = useRouter();
  const [inviting, setInviting] = useState(false);
  const [rotated, setRotated] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function rotate() {
    setPending(true);
    try {
      const res = await api.api.events[':id']['invite-code'].rotate.$post({
        param: { id: meetupId },
      });
      if (res.ok) setRotated((await res.json()).inviteUrl);
    } finally {
      setPending(false);
    }
  }

  async function cancelMeetup() {
    if (!confirm('Hủy Kèo này? Người tham gia sẽ thấy trạng thái đã hủy.')) return;
    setPending(true);
    try {
      const res = await api.api.events[':id'].$delete({ param: { id: meetupId } });
      if (res.ok) router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border p-3">
      <p className="text-sm font-medium">Quản lý Kèo</p>
      <div className="flex flex-wrap gap-2">
        <a
          href={`/events/${slug}/edit`}
          className={buttonVariants({ variant: 'outline', size: 'sm' })}
        >
          Sửa Kèo
        </a>
        <Button
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={() => setInviting((v) => !v)}
        >
          Mời bạn bè
        </Button>
        <Button size="sm" variant="outline" disabled={pending} onClick={() => void rotate()}>
          Tạo lại link mời
        </Button>
        <Button
          size="sm"
          variant="destructive"
          disabled={pending}
          onClick={() => void cancelMeetup()}
        >
          Hủy Kèo
        </Button>
      </div>
      {inviting ? (
        <InviteFriendsPicker meetupId={meetupId} onDone={() => setInviting(false)} />
      ) : null}
      {rotated ? <InviteShare inviteUrl={rotated} title={title} /> : null}
    </div>
  );
}
