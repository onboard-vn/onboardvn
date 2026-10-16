import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { uuid } from '../api/uuid';
import { Button, Card, Heading, Hint } from '../ui/primitives';
import { colors } from '../ui/theme';
import { playerBounds } from './model';
import type { SheetApi } from './use-sheet';

/** Standalone scoring keeps user-entered players in this sheet, without a club roster. */
export function LocalPlayerEditor({ sheet }: { sheet: SheetApi }) {
  const [name, setName] = useState('');
  const { players } = sheet.state;
  const { min, max } = playerBounds(sheet.template);
  const full = players.length >= max;
  const add = () => {
    if (!name.trim() || full) return;
    sheet.addPlayer({ id: uuid(), name: name.trim(), kind: 'guest' });
    setName('');
  };
  return (
    <Card>
      <Heading>
        Người chơi ({players.length}/{max})
      </Heading>
      {players.map((player) => (
        <View key={player.id} style={styles.row}>
          <Text style={styles.name}>{player.name}</Text>
          <Button
            label={`Xóa ${player.name}`}
            tone="ghost"
            onPress={() => sheet.removePlayer(player.id)}
          />
        </View>
      ))}
      {!players.length ? <Hint>Thêm người chơi để bắt đầu tính điểm.</Hint> : null}
      {full ? (
        <Hint>Đã đạt tối đa {max} người chơi.</Hint>
      ) : (
        <>
          <TextInput
            accessibilityLabel="Tên người chơi"
            placeholder="Tên người chơi"
            value={name}
            onChangeText={setName}
            onSubmitEditing={add}
            maxLength={100}
            style={styles.input}
          />
          <Button label="Thêm người chơi" onPress={add} disabled={!name.trim()} />
        </>
      )}
      {players.length < min ? <Hint>Cần ít nhất {min} người chơi.</Hint> : null}
    </Card>
  );
}
const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  name: { flex: 1, color: colors.text, fontSize: 16 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 12,
    color: colors.text,
  },
});
