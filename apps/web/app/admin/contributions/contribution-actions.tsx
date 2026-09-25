'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';

async function errorMessage(res: Response): Promise<string | undefined> {
  const json = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
  return json?.error?.message;
}

export function ContributionActions({ userId, userName }: { userId: string; userName: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onBlock() {
    if (!confirm(`Chặn đóng góp cộng đồng của "${userName}"?`)) return;
    setPending(true);
    setError(null);
    try {
      const res = await api.api.admin.users[':userId']['contribution-block'].$post({
        param: { userId },
      });
      if (!res.ok) {
        setError((await errorMessage(res)) ?? 'Không chặn được đóng góp');
        return;
      }
      router.refresh();
    } catch {
      setError('Mất kết nối, thử lại sau');
    } finally {
      setPending(false);
    }
  }

  async function onUnblock() {
    setPending(true);
    setError(null);
    try {
      const res = await api.api.admin.users[':userId']['contribution-block'].$delete({
        param: { userId },
      });
      if (!res.ok) {
        setError((await errorMessage(res)) ?? 'Không bỏ chặn được đóng góp');
        return;
      }
      router.refresh();
    } catch {
      setError('Mất kết nối, thử lại sau');
    } finally {
      setPending(false);
    }
  }

  async function onRemoveAll() {
    if (!confirm(`Gỡ toàn bộ đóng góp của "${userName}"? Không thể hoàn tác.`)) return;
    setPending(true);
    setError(null);
    try {
      const res = await api.api.admin.users[':userId']['community-games'].$delete({
        param: { userId },
      });
      if (!res.ok) {
        setError((await errorMessage(res)) ?? 'Không gỡ được đóng góp');
        return;
      }
      router.refresh();
    } catch {
      setError('Mất kết nối, thử lại sau');
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-2">
        <Button type="button" variant="outline" size="xs" disabled={pending} onClick={onBlock}>
          Chặn đóng góp
        </Button>
        <Button type="button" variant="outline" size="xs" disabled={pending} onClick={onUnblock}>
          Bỏ chặn
        </Button>
        <Button
          type="button"
          variant="destructive"
          size="xs"
          disabled={pending}
          onClick={onRemoveAll}
        >
          Gỡ toàn bộ đóng góp
        </Button>
      </div>
      {error ? <p className="text-destructive text-xs">{error}</p> : null}
    </div>
  );
}
