'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { FormError } from '@/components/form-error';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { api } from '@/lib/api';

export function ConsentForm({ cafeId, consentStatus }: { cafeId: string; consentStatus: string }) {
  const router = useRouter();
  const [reason, setReason] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function decide(decision: 'granted' | 'declined') {
    setPending(true);
    setError(null);
    const res = await api.api.me.cafes[':id'].consent.$post({
      param: { id: cafeId },
      json: { decision, reason: reason.trim() || undefined },
    });
    setPending(false);
    if (!res.ok) {
      setError('Không lưu được, thử lại sau');
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border p-4">
      <p className="text-sm">
        Trạng thái hiện tại: <span className="font-medium">{consentStatus}</span>
      </p>
      <div className="flex flex-col gap-1">
        <Textarea
          placeholder="Lý do (tùy chọn, chỉ nội bộ)"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={2}
        />
      </div>
      <div className="flex gap-2">
        <Button type="button" disabled={pending} onClick={() => decide('granted')}>
          Đồng ý hiển thị
        </Button>
        <Button
          type="button"
          variant="destructive"
          disabled={pending}
          onClick={() => decide('declined')}
        >
          Từ chối hiển thị
        </Button>
      </div>
      <FormError message={error} />
    </div>
  );
}
