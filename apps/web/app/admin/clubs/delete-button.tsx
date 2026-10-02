'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { FormError } from '@/components/form-error';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { apiErrorMessage } from '@/lib/api-error';

export function AdminClubDeleteButton({ id, name }: { id: string; name: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onDelete() {
    if (!confirm(`Xóa club "${name}"? Kèo của club sẽ chuyển sang riêng tư.`)) return;
    setPending(true);
    setError(null);
    try {
      const res = await api.api['clubs-admin'][':id'].$delete({ param: { id } });
      if (!res.ok) {
        setError(await apiErrorMessage(res, 'Không xóa được, thử lại sau'));
        return;
      }
      router.refresh();
    } catch {
      setError('Không xóa được, thử lại sau');
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button type="button" variant="destructive" size="sm" disabled={pending} onClick={onDelete}>
        Xóa
      </Button>
      <FormError message={error} />
    </div>
  );
}
