import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { uuid } from '../api/uuid';
import { Button, Card, Heading, Hint } from '../ui/primitives';
import { themeStyles, colors } from '../ui/theme';
import { playerBounds } from './model';
import type { SheetApi } from './use-sheet';
import { scorePlayerName, scoreText } from './localization';
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
        {scoreText("Người chơi (")}{players.length}/{max})
      </Heading>
      {players.map((player) => (
        <View key={player.id} style={styles.row}>
          <Text style={styles.name}>{scorePlayerName(player)}</Text>
          <Button
            label={scoreText('Xóa {name}', { name: scorePlayerName(player) })}
            tone="ghost"
            onPress={() => sheet.removePlayer(player.id)}
          />
        </View>
      ))}
      {!players.length ? <Hint>{scoreText("Thêm người chơi để bắt đầu tính điểm.")}</Hint> : null}
      {full ? (
        <Hint>{scoreText("Đã đạt tối đa")}{" "}{max} {scoreText("người chơi.")}</Hint>
      ) : (
        <>
          <TextInput
            accessibilityLabel={scoreText("Tên người chơi")}
            placeholder={scoreText("Tên người chơi")}
            value={name}
            onChangeText={setName}
            onSubmitEditing={add}
            maxLength={100}
            style={styles.input}
          />
          <Button label={scoreText("Thêm người chơi")} onPress={add} disabled={!name.trim()} />
        </>
      )}
      {players.length < min ? <Hint>{scoreText("Cần ít nhất")}{" "}{min} {scoreText("người chơi.")}</Hint> : null}
    </Card>
  );
}
const styles = themeStyles(() => StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  name: { flex: 1, color: colors.text, fontSize: 16 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 12,
    color: colors.text,
  },
}));
