import type { MeetupPublicUser, MeetupTableDto } from '@onboard/shared';
import { useState } from 'react';
import { View } from 'react-native';
import { api } from '../../api/client';
import { gameModules } from '../../games/modules';
import { space } from '../../ui/theme';
import { ShelfGamePicker } from './shelf-game-picker';
import {
  Body,
  Box,
  Btn,
  FormError,
  LinkBtn,
  Muted,
  Row,
  TextField,
  TextLink,
  confirmAsync,
  gameName,
  useAction,
} from './ui';

const userName = (u: MeetupPublicUser) =>
  u.id === '' ? u.name : (u.displayUsername ?? u.username ?? u.name);

export function SessionTableCard({
  meetupId,
  table,
  meetupStatus,
  viewerId,
  viewerGoing,
  viewerTableId,
  canManage,
  clubMeetup,
  onChanged,
}: {
  meetupId: string;
  table: MeetupTableDto;
  meetupStatus: 'scheduled' | 'cancelled';
  viewerId: string | null;
  viewerGoing: boolean;
  viewerTableId: string | null;
  canManage: boolean;
  clubMeetup: boolean;
  onChanged: () => void;
}) {
  const { pending, error, run } = useAction();
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
  const base = `/events/${meetupId}/tables/${table.id}`;
  const modules = table.game ? (gameModules[table.game.slug] ?? []) : [];

  async function act(fn: () => Promise<unknown>): Promise<boolean> {
    const ok = await run(fn, 'Thao tác thất bại, thử lại sau');
    if (ok) onChanged();
    return ok;
  }

  async function remove() {
    if (!(await confirmAsync('Xóa bàn này?'))) return;
    await act(() => api(base, { method: 'DELETE' }));
  }

  async function saveEdit() {
    const ok = await act(() =>
      api(base, {
        method: 'PATCH',
        body: { gameId, seats: seats ? Number(seats) : null, note: note || null },
      }),
    );
    if (ok) setEditing(false);
  }

  return (
    <Box style={{ padding: space.lg }}>
      <Row
        style={{ justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'nowrap' }}
      >
        <View style={{ flex: 1, gap: 2 }}>
          <Body bold>Bàn của {userName(table.host)}</Body>
          {table.game ? (
            <TextLink to={`/games/${table.game.slug}`}>{gameName(table.game)}</TextLink>
          ) : (
            <Muted>Chưa chọn game</Muted>
          )}
        </View>
        <Muted small>
          {seatedCount}/{table.seats ?? '∞'} ghế
        </Muted>
      </Row>

      {table.broughtBy ? <Muted small>Game mang bởi {userName(table.broughtBy)}</Muted> : null}
      {table.note ? <Body>{table.note}</Body> : null}
      {seatedCount > 0 ? <Muted small>{table.seatedUsers.map(userName).join(', ')}</Muted> : null}

      <Row>
        {clubMeetup ? <LinkBtn small label="Tính điểm" to={`/score/table/${table.id}`} /> : null}
        {modules.map((m) => (
          <LinkBtn key={m.key} small variant="outline" label={m.title} to={m.href} />
        ))}
      </Row>

      {active ? (
        <Row>
          {viewerSeatedHere ? (
            <Btn
              small
              variant="outline"
              disabled={pending}
              label="Rời bàn"
              onPress={() => void act(() => api(`${base}/seat`, { method: 'DELETE' }))}
            />
          ) : viewerGoing && !viewerTableId && !isFull ? (
            <Btn
              small
              disabled={pending}
              label="Ngồi bàn này"
              onPress={() => void act(() => api(`${base}/seat`, { method: 'POST', body: {} }))}
            />
          ) : null}

          {(isHost || canManage) && !editing ? (
            <>
              <Btn
                small
                variant="outline"
                disabled={pending}
                label="Sửa bàn"
                onPress={() => setEditing(true)}
              />
              <Btn
                small
                variant="danger"
                disabled={pending}
                label="Xóa bàn"
                onPress={() => void remove()}
              />
            </>
          ) : null}
        </Row>
      ) : null}

      {editing ? (
        <View style={{ gap: space.sm }}>
          <Row>
            <Body>Game: {gameLabel ?? 'chưa chọn'}</Body>
            <Btn
              small
              variant="outline"
              label="Đổi game"
              onPress={() => setPickingGame((v) => !v)}
            />
          </Row>
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
          <TextField
            value={seats}
            onChangeText={setSeats}
            keyboardType="number-pad"
            placeholder="Số ghế (tính cả host)"
          />
          <TextField value={note} onChangeText={setNote} maxLength={500} placeholder="Ghi chú" />
          <Row>
            <Btn small disabled={pending} label="Lưu" onPress={() => void saveEdit()} />
            <Btn small variant="ghost" label="Hủy" onPress={() => setEditing(false)} />
          </Row>
        </View>
      ) : null}

      <FormError message={error} />
    </Box>
  );
}
