'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { FormError } from '@/components/form-error';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';

export function AcceptInviteButton({ token }: { token: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function accept() {
    setPending(true);
    setError(null);
    const res = await api.api['owner-invites'][':token'].accept.$post({ param: { token } });
    if (!res.ok) {
      setPending(false);
      setError(
        res.status === 410
          ? 'Link mời đã hết hạn hoặc không còn hiệu lực'
          : 'Không xác nhận được, thử lại sau',
      );
      return;
    }
    const { cafeId } = await res.json();
    router.push(`/my-cafes/${cafeId}/consent`);
  }

  return (
    <div className="flex flex-col gap-2">
      <Button type="button" disabled={pending} onClick={accept}>
        Xác nhận là chủ quán
      </Button>
      <FormError message={error} />
    </div>
  );
}
