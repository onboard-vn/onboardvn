'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { FormError } from '@/components/form-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { api } from '@/lib/api';
import { apiErrorMessage } from '@/lib/api-error';

export function ClubJoinForm({ code }: { code: string }) {
  const router = useRouter();
  const [externalId, setExternalId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const res = await api.api.clubs.join[':code'].$post({
        param: { code },
        json: { externalId: externalId.trim() || undefined },
      });
      if (!res.ok) {
        setError(await apiErrorMessage(res, 'Link mời không hợp lệ hoặc đã hết hạn'));
        return;
      }
      const joined = await res.json();
      if (externalId.trim() && !joined.externalMatched) {
        setNotice('Đã tham gia club, nhưng không khớp được ID. Bạn có thể thử lại trong club.');
        setTimeout(() => router.push(`/clubs/${joined.slug}`), 1500);
        return;
      }
      router.push(`/clubs/${joined.slug}`);
    } catch {
      setError('Có lỗi xảy ra, thử lại sau');
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <Label htmlFor="club-external-id">ID trên app club cũ (tùy chọn)</Label>
        <Input
          id="club-external-id"
          maxLength={100}
          autoComplete="off"
          value={externalId}
          onChange={(e) => setExternalId(e.target.value)}
        />
        <p className="text-muted-foreground text-xs">
          Nhập nếu bạn đã có tài khoản ở app club cũ để liên kết lịch sử chơi.
        </p>
      </div>
      <FormError message={error} />
      {notice ? <p className="text-sm">{notice}</p> : null}
      <Button type="submit" disabled={pending}>
        Tham gia
      </Button>
    </form>
  );
}
