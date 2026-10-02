import { useState } from 'react';
import { View } from 'react-native';
import { api } from '../../api/client';
import { space } from '../../ui/theme';
import { ShelfGamePicker } from './shelf-game-picker';
import { Body, Box, Btn, FormError, Row, TextField, useAction } from './ui';

export function CreateTableForm({
  meetupId,
  onCreated,
}: {
  meetupId: string;
  onCreated: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [pickingGame, setPickingGame] = useState(false);
  const [gameId, setGameId] = useState<string | null>(null);
  const [gameLabel, setGameLabel] = useState<string | null>(null);
  const [seats, setSeats] = useState('');
  const { pending, error, run } = useAction();

  async function create() {
    const ok = await run(
      () =>
        api(`/events/${meetupId}/tables`, {
          method: 'POST',
          body: { gameId: gameId ?? undefined, seats: seats ? Number(seats) : undefined },
        }),
      'Không tạo được bàn, thử lại sau',
    );
    if (!ok) return;
    setOpen(false);
    setGameId(null);
    setGameLabel(null);
    setSeats('');
    onCreated();
  }

  if (!open) return <Btn small label="Tạo bàn mới" onPress={() => setOpen(true)} />;

  return (
    <Box style={{ alignSelf: 'stretch' }}>
      <Row>
        <Body>Game: {gameLabel ?? 'chưa chọn'}</Body>
        <Btn
          small
          variant="outline"
          label="Chọn từ tủ game"
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
        keyboardType="number-pad"
        placeholder="Số ghế (tính cả host, tùy chọn)"
        value={seats}
        onChangeText={setSeats}
      />
      <FormError message={error} />
      <View style={{ flexDirection: 'row', gap: space.sm }}>
        <Btn small disabled={pending} label="Tạo bàn" onPress={() => void create()} />
        <Btn small variant="ghost" label="Hủy" onPress={() => setOpen(false)} />
      </View>
    </Box>
  );
}
