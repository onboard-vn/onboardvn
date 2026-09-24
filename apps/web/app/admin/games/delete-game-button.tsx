'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';

export function DeleteGameButton({ id, name }: { id: string; name: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function onDelete() {
    if (!confirm(`Xóa game "${name}"?`)) return;
    setPending(true);
    const res = await api.api.games[':id'].$delete({ param: { id } });
    setPending(false);
    if (res.ok) router.refresh();
  }

  return (
    <Button type="button" variant="destructive" size="sm" disabled={pending} onClick={onDelete}>
      Xóa
    </Button>
  );
}
