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
import { t } from '../../ui/i18n';
import { useAppPreferences } from '../../ui/preferences';

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
  useAppPreferences();
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
          <Body bold>{t('Bàn của {name}', { name: userName(table.host) })}</Body>
          {table.game ? (
            <TextLink to={`/games/${table.game.slug}`}>{gameName(table.game)}</TextLink>
          ) : (
            <Muted>{t('Chưa chọn game')}</Muted>
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
        {clubMeetup ? (
          <LinkBtn small label={t('Tính điểm')} to={`/score/table/${table.id}`} />
        ) : null}
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
              label={t('Rời bàn')}
              onPress={() => void act(() => api(`${base}/seat`, { method: 'DELETE' }))}
            />
          ) : viewerGoing && !viewerTableId && !isFull ? (
            <Btn
              small
              disabled={pending}
              label={t('Ngồi bàn này')}
              onPress={() => void act(() => api(`${base}/seat`, { method: 'POST', body: {} }))}
            />
          ) : null}

          {(isHost || canManage) && !editing ? (
            <>
              <Btn
                small
                variant="outline"
                disabled={pending}
                label={t('Sửa bàn')}
                onPress={() => setEditing(true)}
              />
              <Btn
                small
                variant="danger"
                disabled={pending}
                label={t('Xóa bàn')}
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
              label={t('Đổi game')}
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
            placeholder={t('Số ghế (tính cả host)')}
          />
          <TextField
            value={note}
            onChangeText={setNote}
            maxLength={500}
            placeholder={t('Ghi chú')}
          />
          <Row>
            <Btn small disabled={pending} label={t('Lưu')} onPress={() => void saveEdit()} />
            <Btn small variant="ghost" label={t('Hủy')} onPress={() => setEditing(false)} />
          </Row>
        </View>
      ) : null}

      <FormError message={error} />
    </Box>
  );
}
