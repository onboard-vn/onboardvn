'use client';

import type { ShelfItemDto } from '@onboard/shared';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';

function displayName(g: { nameVi: string | null; nameEn: string }): string {
  return g.nameVi || g.nameEn;
}

/** Picks a game from a shelf: the current user's own (`/me/shelf`) when `username` is omitted,
 * or another user's public shelf (`/users/:username/shelf`) — used when a host brings a game from
 * a seated player's shelf. */
export function ShelfGamePicker({
  username,
  onPick,
  onCancel,
}: {
  username?: string;
  onPick: (game: { id: string; name: string }) => void;
  onCancel?: () => void;
}) {
  const [state, setState] = useState<'loading' | 'hidden' | 'empty' | 'ready'>('loading');
  const [items, setItems] = useState<ShelfItemDto[]>([]);

  useEffect(() => {
    const request = username
      ? api.api.users[':username'].shelf.$get({ param: { username } })
      : api.api.me.shelf.$get();
    request
      .then(async (res) => {
        if (!res.ok) {
          setState('hidden');
          return;
        }
        const body = await res.json();
        if ('hidden' in body && body.hidden) {
          setState('hidden');
          return;
        }
        const shelfItems = 'items' in body ? body.items : [];
        setItems(shelfItems);
        setState(shelfItems.length === 0 ? 'empty' : 'ready');
      })
      .catch(() => setState('hidden'));
  }, [username]);

  if (state === 'loading')
    return <p className="text-muted-foreground text-sm">Đang tải tủ game…</p>;
  if (state === 'hidden')
    return <p className="text-muted-foreground text-sm">Không xem được tủ game.</p>;
  if (state === 'empty') return <p className="text-muted-foreground text-sm">Tủ game trống.</p>;

  return (
    <div className="flex flex-col gap-2">
      <ul className="flex flex-col gap-1 text-sm">
        {items.map((item) => (
          <li key={item.game.id} className="flex items-center justify-between gap-2">
            <span>{displayName(item.game)}</span>
            <Button
              size="xs"
              onClick={() => onPick({ id: item.game.id, name: displayName(item.game) })}
            >
              Chọn
            </Button>
          </li>
        ))}
      </ul>
      {onCancel ? (
        <Button variant="ghost" size="xs" onClick={onCancel} className="self-start">
          Đóng
        </Button>
      ) : null}
    </div>
  );
}
