'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { FormError } from '@/components/form-error';
import { ShelfGamePicker } from '@/components/shelf-game-picker';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';
import { apiErrorMessage } from '@/lib/api-error';

export function CreateTableForm({ meetupId }: { meetupId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pickingGame, setPickingGame] = useState(false);
  const [gameId, setGameId] = useState<string | null>(null);
  const [gameLabel, setGameLabel] = useState<string | null>(null);
  const [seats, setSeats] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function create() {
    setPending(true);
    setError(null);
    try {
      const res = await api.api.events[':id'].tables.$post({
        param: { id: meetupId },
        json: { gameId: gameId ?? undefined, seats: seats ? Number(seats) : undefined },
      });
      if (!res.ok) {
        setError(await apiErrorMessage(res, 'Không tạo được bàn, thử lại sau'));
        return;
      }
      setOpen(false);
      setGameId(null);
      setGameLabel(null);
      setSeats('');
      router.refresh();
    } catch {
      setError('Không tạo được bàn, thử lại sau');
    } finally {
      setPending(false);
    }
  }

  if (!open) {
    return (
      <Button size="sm" onClick={() => setOpen(true)}>
        Tạo bàn mới
      </Button>
    );
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border p-3">
      <div className="flex items-center gap-2 text-sm">
        <span>Game: {gameLabel ?? 'chưa chọn'}</span>
        <Button type="button" size="xs" variant="outline" onClick={() => setPickingGame((v) => !v)}>
          Chọn từ tủ game
        </Button>
      </div>
      {pickingGame ? (
        <ShelfGamePicker
          onPick={(g) => {
            setGameId(g.id);
            setGameLabel(g.name);
            setPickingGame(false);
          }}
          onCancel={() => setPickingGame(false)}
        />
      ) : null}
      <Input
        type="number"
        min={2}
        max={20}
        placeholder="Số ghế (tính cả host, tùy chọn)"
        value={seats}
        onChange={(e) => setSeats(e.target.value)}
      />
      <FormError message={error} />
      <div className="flex gap-2">
        <Button size="sm" disabled={pending} onClick={() => void create()}>
          Tạo bàn
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>
          Hủy
        </Button>
      </div>
    </div>
  );
}
