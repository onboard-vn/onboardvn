'use client';

import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';

interface ResolvedGame {
  id: string;
  name: string;
}

function displayName(g: { nameVi: string | null; nameEn: string }): string {
  return g.nameVi || g.nameEn;
}

export function GamePicker({
  onPick,
  initialQuery,
}: {
  onPick: (game: ResolvedGame) => void;
  initialQuery?: string;
}) {
  const [results, setResults] = useState<{ id: string; nameVi: string | null; nameEn: string }[]>(
    [],
  );
  const [searched, setSearched] = useState(false);

  async function onSearch(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const q = String(new FormData(e.currentTarget).get('q') ?? '').trim();
    setSearched(true);
    if (!q) {
      setResults([]);
      return;
    }
    const res = await api.api.games.$get({ query: { q, pageSize: '10' } });
    setResults(res.ok ? (await res.json()).items : []);
  }

  return (
    <div className="flex flex-col gap-2">
      <form onSubmit={onSearch} className="flex items-end gap-2">
        <Input
          name="q"
          placeholder="Tìm game trong danh mục..."
          defaultValue={initialQuery}
          className="flex-1"
        />
        <Button type="submit" size="sm">
          Tìm
        </Button>
      </form>
      {searched && results.length === 0 ? (
        <div className="flex items-center justify-between gap-2 text-sm">
          <span className="text-muted-foreground">Không tìm thấy.</span>
          <Button
            size="xs"
            variant="outline"
            render={
              <Link href={`/admin/games/new?nameEn=${encodeURIComponent(initialQuery ?? '')}`} />
            }
          >
            Tạo game nhanh
          </Button>
        </div>
      ) : null}
      {results.length > 0 ? (
        <ul className="flex flex-col gap-1 text-sm">
          {results.map((g) => (
            <li key={g.id} className="flex items-center justify-between gap-2">
              <span>{displayName(g)}</span>
              <Button size="xs" onClick={() => onPick({ id: g.id, name: displayName(g) })}>
                Chọn
              </Button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
