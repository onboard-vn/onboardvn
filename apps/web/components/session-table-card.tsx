'use client';

import type { MeetupPublicUser, MeetupTableDto } from '@onboard/shared';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { FormError } from '@/components/form-error';
import { ShelfGamePicker } from '@/components/shelf-game-picker';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';
import { apiErrorMessage } from '@/lib/api-error';

function displayName(u: MeetupPublicUser) {
  return u.id === '' ? u.name : (u.displayUsername ?? u.username ?? u.name);
}

function gameName(g: { nameVi: string | null; nameEn: string }) {
  return g.nameVi || g.nameEn;
}

export function SessionTableCard({
  meetupId,
  table,
  meetupStatus,
  viewerId,
  viewerGoing,
  viewerTableId,
  canManage,
}: {
  meetupId: string;
  table: MeetupTableDto;
  meetupStatus: 'scheduled' | 'cancelled';
  viewerId: string | null;
  viewerGoing: boolean;
  viewerTableId: string | null;
  canManage: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [editing, setEditing] = useState(false);
  const [pickingGame, setPickingGame] = useState(false);
  const [note, setNote] = useState(table.note ?? '');
  const [seats, setSeats] = useState(table.seats ? String(table.seats) : '');
  const [gameId, setGameId] = useState<string | null>(table.game?.id ?? null);
  const [gameLabel, setGameLabel] = useState<string | null>(
    table.game ? gameName(table.game) : null,
  );

  const seatedCount = table.seatedUsers.length;
  const isFull = table.seats != null && seatedCount >= table.seats;
  const viewerSeatedHere = viewerTableId === table.id;
  const isHost = viewerId != null && viewerId === table.host.id;
  const active = meetupStatus === 'scheduled';

  async function withPending(fn: () => Promise<Response>): Promise<boolean> {
    setPending(true);
    setError(null);
    try {
      const res = await fn();
      if (!res.ok) {
        setError(await apiErrorMessage(res, 'Thao tác thất bại, thử lại sau'));
        return false;
      }
      router.refresh();
      return true;
    } catch {
      setError('Thao tác thất bại, thử lại sau');
      return false;
    } finally {
      setPending(false);
    }
  }

  function sit() {
    return withPending(() =>
      api.api.events[':id'].tables[':tableId'].seat.$post({
        param: { id: meetupId, tableId: table.id },
      }),
    );
  }

  function leave() {
    return withPending(() =>
      api.api.events[':id'].tables[':tableId'].seat.$delete({
        param: { id: meetupId, tableId: table.id },
      }),
    );
  }

  function remove() {
    if (!confirm('Xóa bàn này?')) return;
    void withPending(() =>
      api.api.events[':id'].tables[':tableId'].$delete({
        param: { id: meetupId, tableId: table.id },
      }),
    );
  }

  async function saveEdit() {
    const ok = await withPending(() =>
      api.api.events[':id'].tables[':tableId'].$patch({
        param: { id: meetupId, tableId: table.id },
        json: {
          gameId,
          seats: seats ? Number(seats) : null,
          note: note || null,
        },
      }),
    );
    // Keep the edit form open on failure so the error is visible and the fields aren't lost.
    if (ok) setEditing(false);
  }

  return (
    <li className="flex flex-col gap-2 rounded-lg border p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-medium">Bàn của {displayName(table.host)}</p>
          {table.game ? (
            <Link href={`/games/${table.game.slug}`} className="text-sm underline">
              {gameName(table.game)}
            </Link>
          ) : (
            <p className="text-muted-foreground text-sm">Chưa chọn game</p>
          )}
        </div>
        <span className="text-muted-foreground shrink-0 text-xs">
          {seatedCount}/{table.seats ?? '∞'} ghế
        </span>
      </div>

      {table.broughtBy ? (
        <p className="text-muted-foreground text-xs">
          Game mang bởi {displayName(table.broughtBy)}
        </p>
      ) : null}
      {table.note ? <p className="text-sm">{table.note}</p> : null}

      <div className="flex flex-wrap gap-1 text-xs text-muted-foreground">
        {table.seatedUsers.map((u, i) => (
          <span key={u.id || i}>
            {displayName(u)}
            {i < table.seatedUsers.length - 1 ? ',' : ''}
          </span>
        ))}
      </div>

      {active ? (
        <div className="flex flex-wrap items-center gap-2">
          {viewerSeatedHere ? (
            <Button size="sm" variant="outline" disabled={pending} onClick={leave}>
              Rời bàn
            </Button>
          ) : viewerGoing && !viewerTableId && !isFull ? (
            <Button size="sm" disabled={pending} onClick={sit}>
              Ngồi bàn này
            </Button>
          ) : null}

          {(isHost || canManage) && !editing ? (
            <>
              <Button
                size="sm"
                variant="outline"
                disabled={pending}
                onClick={() => setEditing(true)}
              >
                Sửa bàn
              </Button>
              <Button size="sm" variant="destructive" disabled={pending} onClick={remove}>
                Xóa bàn
              </Button>
            </>
          ) : null}
        </div>
      ) : null}

      {editing ? (
        <div className="flex flex-col gap-2 border-t pt-2">
          <div className="flex items-center gap-2 text-sm">
            <span>Game: {gameLabel ?? 'chưa chọn'}</span>
            <Button size="xs" variant="outline" onClick={() => setPickingGame((v) => !v)}>
              Đổi game
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
            value={seats}
            onChange={(e) => setSeats(e.target.value)}
            type="number"
            min={2}
            max={20}
            placeholder="Số ghế (tính cả host)"
          />
          <Input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={500}
            placeholder="Ghi chú"
          />
          <div className="flex gap-2">
            <Button size="sm" disabled={pending} onClick={saveEdit}>
              Lưu
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
              Hủy
            </Button>
          </div>
        </div>
      ) : null}

      <FormError message={error} />
    </li>
  );
}
