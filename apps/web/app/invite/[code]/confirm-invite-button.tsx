'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { FormError } from '@/components/form-error';
import { Button, buttonVariants } from '@/components/ui/button';
import { api } from '@/lib/api';

export function ConfirmInviteButton({ code }: { code: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function confirm() {
    setPending(true);
    setError(null);
    try {
      const res = await api.api.friends.invite[':code'].$post({ param: { code } });
      if (!res.ok) throw new Error();
      setDone(true);
      router.refresh();
    } catch {
      setError('Không xác nhận được, thử lại sau');
    } finally {
      setPending(false);
    }
  }

  if (done) {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-sm">Đã kết bạn.</p>
        <Link href="/friends" className={buttonVariants()}>
          Xem danh sách bạn bè
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <Button type="button" disabled={pending} onClick={confirm}>
        Xác nhận kết bạn
      </Button>
      <FormError message={error} />
    </div>
  );
}
