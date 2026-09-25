'use client';

import type { ShelfItemDto } from '@onboard/shared';
import { useEffect, useState } from 'react';
import { BarcodeScanner } from '@/components/barcode-scanner';
import { FormError } from '@/components/form-error';
import { GamePicker } from '@/components/game-picker';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';

function displayName(g: { nameVi: string | null; nameEn: string }): string {
  return g.nameVi || g.nameEn;
}

function ShelfRow({
  item,
  onSave,
  onRemove,
}: {
  item: ShelfItemDto;
  onSave: (note: string) => Promise<void>;
  onRemove: () => void;
}) {
  const [note, setNote] = useState(item.note ?? '');
  const [pending, setPending] = useState(false);

  async function save() {
    setPending(true);
    try {
      await onSave(note);
    } finally {
      setPending(false);
    }
  }

  return (
    <li className="flex flex-col gap-2 rounded-lg border p-3 text-sm">
      <div className="flex items-center justify-between gap-2">
        <span className="font-medium">{displayName(item.game)}</span>
        <Button variant="outline" size="xs" onClick={onRemove}>
          Gỡ
        </Button>
      </div>
      <div className="flex items-center gap-2">
        <Input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={200}
          placeholder="Ghi chú (tùy chọn)"
          className="flex-1"
        />
        <Button size="xs" disabled={pending || note === (item.note ?? '')} onClick={save}>
          Lưu
        </Button>
      </div>
    </li>
  );
}

function ScanSection({ onFound }: { onFound: (game: { id: string; name: string }) => void }) {
  const [scanning, setScanning] = useState(false);
  const [status, setStatus] = useState<'idle' | 'loading' | 'hit' | 'miss' | 'error'>('idle');
  const [found, setFound] = useState<{ id: string; name: string } | null>(null);

  async function onDetect(code: string) {
    setStatus('loading');
    try {
      const res = await api.api.barcodes.local[':code'].$get({ param: { code } });
      if (!res.ok) {
        setStatus('error');
        return;
      }
      const body = await res.json();
      if (body.game) {
        setFound({ id: body.game.id, name: displayName(body.game) });
        setStatus('hit');
      } else {
        setStatus('miss');
      }
    } catch {
      setStatus('error');
    }
  }

  if (!scanning) {
    return (
      <Button variant="outline" size="sm" onClick={() => setScanning(true)}>
        Quét mã
      </Button>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <BarcodeScanner onDetect={onDetect} />
      {status === 'loading' ? (
        <p className="text-muted-foreground text-sm">Đang tra cứu...</p>
      ) : null}
      {status === 'hit' && found ? (
        <div className="flex items-center justify-between gap-2 text-sm">
          <span>{found.name}</span>
          <Button
            size="sm"
            onClick={() => {
              onFound(found);
              setStatus('idle');
              setScanning(false);
            }}
          >
            Thêm vào tủ
          </Button>
        </div>
      ) : null}
      {status === 'miss' ? (
        <p className="text-muted-foreground text-sm">
          Chưa có mã này trong hệ thống, thử tìm tên game bên dưới.
        </p>
      ) : null}
      {status === 'error' ? <FormError message="Không tra cứu được, thử lại sau" /> : null}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => {
          setScanning(false);
          setStatus('idle');
        }}
      >
        Đóng
      </Button>
    </div>
  );
}

export function ShelfManager() {
  const [items, setItems] = useState<ShelfItemDto[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.api.me.shelf
      .$get()
      .then(async (res) => {
        if (!res.ok) throw new Error();
        setItems((await res.json()).items);
      })
      .catch(() => setError('Không tải được tủ game'));
  }, []);

  async function add(gameId: string, note?: string) {
    setError(null);
    try {
      const res = await api.api.me.shelf.$post({ json: { gameId, note } });
      if (!res.ok) throw new Error();
      const item = await res.json();
      setItems((prev) => {
        const rest = (prev ?? []).filter((i) => i.game.id !== gameId);
        return [item, ...rest];
      });
    } catch {
      setError('Không thêm được vào tủ, thử lại sau');
    }
  }

  async function saveNote(gameId: string, note: string) {
    // Sent even when blank: an explicit "" clears the note, while omitting the key preserves it.
    await add(gameId, note);
  }

  async function remove(gameId: string) {
    setError(null);
    try {
      const res = await api.api.me.shelf[':gameId'].$delete({ param: { gameId } });
      if (!res.ok) throw new Error();
      setItems((prev) => prev?.filter((i) => i.game.id !== gameId) ?? null);
    } catch {
      setError('Không gỡ được, thử lại sau');
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 rounded-lg border p-4">
        <h2 className="text-sm font-medium">Thêm game</h2>
        <ScanSection onFound={(g) => void add(g.id)} />
        <GamePicker onPick={(g) => void add(g.id)} />
      </div>

      <FormError message={error} />

      {!items ? (
        <p className="text-muted-foreground text-sm">Đang tải…</p>
      ) : items.length === 0 ? (
        <p className="text-muted-foreground text-sm">Tủ game trống, hãy thêm game đầu tiên.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map((item) => (
            <ShelfRow
              key={item.game.id}
              item={item}
              onSave={(note) => saveNote(item.game.id, note)}
              onRemove={() => void remove(item.game.id)}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
