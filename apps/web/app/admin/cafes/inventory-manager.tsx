'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';

interface InventoryItem {
  gameId: string;
  slug: string;
  nameVi: string | null;
  nameEn: string;
  copies: number;
}

interface GameSearchResult {
  id: string;
  nameVi: string | null;
  nameEn: string;
}

export function InventoryManager({
  cafeId,
  inventory,
}: {
  cafeId: string;
  inventory: InventoryItem[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [results, setResults] = useState<GameSearchResult[]>([]);
  const inventoryIds = new Set(inventory.map((i) => i.gameId));

  async function onSearch(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const q = String(new FormData(e.currentTarget).get('q') ?? '').trim();
    if (!q) {
      setResults([]);
      return;
    }
    const res = await api.api.games.$get({ query: { q, pageSize: '10' } });
    setResults(res.ok ? (await res.json()).items : []);
  }

  async function onAdd(gameId: string) {
    setPending(true);
    setError(null);
    const res = await api.api.cafes[':id'].games.$post({ param: { id: cafeId }, json: { gameId } });
    setPending(false);
    if (!res.ok) {
      const json = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
      setError(json?.error?.message ?? 'Có lỗi xảy ra, thử lại sau');
      return;
    }
    router.refresh();
  }

  async function onCopiesChange(gameId: string, copies: number) {
    if (!Number.isInteger(copies) || copies < 1) return;
    setPending(true);
    await api.api.cafes[':id'].games[':gameId'].$patch({
      param: { id: cafeId, gameId },
      json: { copies },
    });
    setPending(false);
    router.refresh();
  }

  async function onRemove(gameId: string) {
    setPending(true);
    await api.api.cafes[':id'].games[':gameId'].$delete({ param: { id: cafeId, gameId } });
    setPending(false);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border p-4">
      <h2 className="text-sm font-medium">Kho game ({inventory.length})</h2>

      <ul className="flex flex-col gap-1 text-sm">
        {inventory.map((item) => (
          <li key={item.gameId} className="flex items-center justify-between gap-2">
            <span>{item.nameVi || item.nameEn}</span>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={1}
                defaultValue={item.copies}
                className="h-8 w-16"
                onBlur={(e) => onCopiesChange(item.gameId, Number(e.target.value))}
              />
              <Button
                type="button"
                variant="ghost"
                size="xs"
                disabled={pending}
                onClick={() => onRemove(item.gameId)}
              >
                Xóa
              </Button>
            </div>
          </li>
        ))}
        {inventory.length === 0 ? (
          <li className="text-muted-foreground">Chưa có game nào trong kho.</li>
        ) : null}
      </ul>

      <form onSubmit={onSearch} className="flex items-end gap-2">
        <Input name="q" placeholder="Tìm game để thêm vào kho..." className="flex-1" />
        <Button type="submit">Tìm</Button>
      </form>

      {results.length > 0 ? (
        <ul className="flex flex-col gap-1 text-sm">
          {results.map((g) => (
            <li key={g.id} className="flex items-center justify-between gap-2">
              <span>{g.nameVi || g.nameEn}</span>
              <Button
                type="button"
                size="xs"
                disabled={pending || inventoryIds.has(g.id)}
                onClick={() => onAdd(g.id)}
              >
                {inventoryIds.has(g.id) ? 'Đã có' : 'Thêm'}
              </Button>
            </li>
          ))}
        </ul>
      ) : null}

      {error ? <p className="text-destructive text-sm">{error}</p> : null}
    </div>
  );
}
