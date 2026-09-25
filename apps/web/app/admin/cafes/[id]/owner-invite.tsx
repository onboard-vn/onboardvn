'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';

interface InviteRow {
  id: string;
  createdAt: string;
  expiresAt: string;
  usedAt: string | null;
  revokedAt: string | null;
}

function inviteStatus(invite: InviteRow): string {
  if (invite.usedAt) return 'Đã dùng';
  if (invite.revokedAt) return 'Đã thu hồi';
  if (new Date(invite.expiresAt) < new Date()) return 'Hết hạn';
  return 'Còn hiệu lực';
}

export function OwnerInviteSection({
  cafeId,
  initialInvites,
}: {
  cafeId: string;
  initialInvites: InviteRow[];
}) {
  const [invites, setInvites] = useState(initialInvites);
  const [newUrl, setNewUrl] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refreshInvites() {
    const res = await api.api.cafes[':id']['owner-invites'].$get({ param: { id: cafeId } });
    if (res.ok) setInvites((await res.json()).items);
  }

  async function onCreate() {
    setPending(true);
    setError(null);
    setNewUrl(null);
    const res = await api.api.cafes[':id']['owner-invites'].$post({ param: { id: cafeId } });
    setPending(false);
    if (!res.ok) {
      setError('Không tạo được link mời, thử lại sau');
      return;
    }
    const { url } = await res.json();
    setNewUrl(url);
    await refreshInvites();
  }

  async function onRevoke(inviteId: string) {
    setPending(true);
    await api.api.cafes[':id']['owner-invites'][':inviteId'].$delete({
      param: { id: cafeId, inviteId },
    });
    setPending(false);
    await refreshInvites();
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border p-4">
      <h2 className="text-sm font-medium">Link mời chủ quán</h2>

      <Button type="button" disabled={pending} onClick={onCreate}>
        Tạo link mời mới
      </Button>

      {newUrl ? (
        <div className="flex flex-col gap-1 rounded border bg-muted p-2 text-xs">
          <p className="font-medium">Copy link này ngay — chỉ hiện 1 lần:</p>
          <code className="break-all">{newUrl}</code>
          <Button
            type="button"
            variant="secondary"
            size="xs"
            onClick={() => navigator.clipboard.writeText(newUrl)}
          >
            Copy
          </Button>
        </div>
      ) : null}

      {error ? <p className="text-destructive text-sm">{error}</p> : null}

      <ul className="flex flex-col gap-1 text-xs">
        {invites.map((invite) => (
          <li key={invite.id} className="flex items-center justify-between gap-2">
            <span>
              Tạo {new Date(invite.createdAt).toLocaleDateString('vi-VN')} · {inviteStatus(invite)}
            </span>
            {!invite.usedAt && !invite.revokedAt ? (
              <Button
                type="button"
                variant="ghost"
                size="xs"
                disabled={pending}
                onClick={() => onRevoke(invite.id)}
              >
                Thu hồi
              </Button>
            ) : null}
          </li>
        ))}
        {invites.length === 0 ? (
          <li className="text-muted-foreground">Chưa có link mời nào.</li>
        ) : null}
      </ul>
    </div>
  );
}
