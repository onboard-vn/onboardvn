'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';

interface Barcode {
  code: string;
  edition: string | null;
}

export function BarcodeManager({ gameId, barcodes }: { gameId: string; barcodes: Barcode[] }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onAdd(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const data = new FormData(e.currentTarget);
    const code = String(data.get('code') ?? '').trim();
    const edition = String(data.get('edition') ?? '').trim() || undefined;

    const res = await api.api.games[':id'].barcodes.$post({
      param: { id: gameId },
      json: { code, edition },
    });
    setPending(false);
    if (!res.ok) {
      const json = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
      setError(json?.error?.message ?? 'Có lỗi xảy ra, thử lại sau');
      return;
    }
    e.currentTarget.reset();
    router.refresh();
  }

  async function onRemove(code: string) {
    setPending(true);
    await api.api.games[':id'].barcodes[':code'].$delete({ param: { id: gameId, code } });
    setPending(false);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border p-4">
      <h2 className="text-sm font-medium">Mã vạch</h2>
      <ul className="flex flex-col gap-1 text-sm">
        {barcodes.map((b) => (
          <li key={b.code} className="flex items-center justify-between gap-2">
            <span>
              {b.code}
              {b.edition ? ` (${b.edition})` : ''}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="xs"
              disabled={pending}
              onClick={() => onRemove(b.code)}
            >
              Xóa
            </Button>
          </li>
        ))}
        {barcodes.length === 0 ? (
          <li className="text-muted-foreground">Chưa có mã vạch nào.</li>
        ) : null}
      </ul>
      <form onSubmit={onAdd} className="flex items-end gap-2">
        <Input name="code" placeholder="Mã vạch (EAN/UPC)" required className="flex-1" />
        <Input name="edition" placeholder="Bản (tuỳ chọn)" className="flex-1" />
        <Button type="submit" disabled={pending}>
          Thêm
        </Button>
      </form>
      {error ? <p className="text-destructive text-sm">{error}</p> : null}
    </div>
  );
}
