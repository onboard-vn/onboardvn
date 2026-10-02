'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { FormError } from '@/components/form-error';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { apiErrorMessage } from '@/lib/api-error';

export function LeaveClubButton({ clubId }: { clubId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onLeave() {
    if (!confirm('Rời club này?')) return;
    setPending(true);
    setError(null);
    try {
      const res = await api.api.clubs[':id'].members.me.$delete({ param: { id: clubId } });
      if (!res.ok) {
        setError(await apiErrorMessage(res, 'Không rời được, thử lại sau'));
        return;
      }
      router.push('/clubs');
      router.refresh();
    } catch {
      setError('Không rời được, thử lại sau');
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <Button type="button" variant="destructive" size="sm" disabled={pending} onClick={onLeave}>
        Rời club
      </Button>
      <FormError message={error} />
    </div>
  );
}
