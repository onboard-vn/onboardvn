'use client';

import { useState, type FormEvent } from 'react';
import { FormError } from '@/components/form-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';

export function StaffForm({ cafeId }: { cafeId: string }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);
    setDone(false);
    const username = String(new FormData(e.currentTarget).get('username') ?? '').trim();
    const res = await api.api.me.cafes[':id'].staff.$post({
      param: { id: cafeId },
      json: { username },
    });
    setPending(false);
    if (!res.ok) {
      setError('Không tìm thấy người dùng hoặc có lỗi xảy ra');
      return;
    }
    setDone(true);
    e.currentTarget.reset();
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-2 rounded-lg border p-4">
      <h2 className="text-sm font-medium">Thêm nhân viên</h2>
      <div className="flex gap-2">
        <Input name="username" placeholder="Tên đăng nhập" required className="flex-1" />
        <Button type="submit" disabled={pending}>
          Thêm
        </Button>
      </div>
      {done ? <p className="text-sm">Đã thêm nhân viên.</p> : null}
      <FormError message={error} />
    </form>
  );
}
