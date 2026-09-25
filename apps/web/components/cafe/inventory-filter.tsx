'use client';

import type { CafeInventoryItemDto } from '@onboard/shared';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

/** Client-side only: the inventory is already loaded with the page, so filtering avoids an
 * extra round-trip. No server pagination — cafés carry small inventories. */
export function InventoryFilter({ inventory }: { inventory: CafeInventoryItemDto[] }) {
  const [players, setPlayers] = useState('');
  const [maxTime, setMaxTime] = useState('');
  const [categoryId, setCategoryId] = useState('');

  const categories = useMemo(() => {
    const seen = new Map<string, string>();
    for (const item of inventory) {
      for (const c of item.categories) seen.set(c.id, c.nameVi ?? c.name);
    }
    return [...seen.entries()];
  }, [inventory]);

  const filtered = useMemo(() => {
    const playersNum = players ? Number(players) : null;
    const maxTimeNum = maxTime ? Number(maxTime) : null;
    return inventory.filter((item) => {
      if (playersNum != null) {
        if (item.minPlayers != null && playersNum < item.minPlayers) return false;
        if (item.maxPlayers != null && playersNum > item.maxPlayers) return false;
      }
      if (maxTimeNum != null && item.playMinutes != null && item.playMinutes > maxTimeNum) {
        return false;
      }
      if (categoryId && !item.categories.some((c) => c.id === categoryId)) return false;
      return true;
    });
  }, [inventory, players, maxTime, categoryId]);

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="flex flex-col gap-1">
          <Label htmlFor="inv-players">Số người</Label>
          <Input
            id="inv-players"
            type="number"
            min={1}
            value={players}
            onChange={(e) => setPlayers(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="inv-maxTime">Tối đa (phút)</Label>
          <Input
            id="inv-maxTime"
            type="number"
            min={1}
            value={maxTime}
            onChange={(e) => setMaxTime(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="inv-category">Thể loại</Label>
          <select
            id="inv-category"
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="border-input h-9 rounded-md border bg-transparent px-3 text-sm dark:bg-input/30"
          >
            <option value="">Tất cả</option>
            {categories.map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="text-muted-foreground text-sm">Không có game nào khớp bộ lọc.</p>
      ) : (
        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {filtered.map((item) => (
            <li key={item.gameId}>
              <Link
                href={`/games/${item.slug}`}
                className="hover:border-foreground/40 flex items-center justify-between gap-2 rounded-lg border p-3 text-sm"
              >
                <span className="flex items-center gap-2">
                  {item.nameVi || item.nameEn}
                  {item.community ? (
                    <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs text-amber-800">
                      Cộng đồng đóng góp
                    </span>
                  ) : null}
                </span>
                {item.copies > 1 ? (
                  <span className="text-muted-foreground text-xs">x{item.copies}</span>
                ) : null}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
