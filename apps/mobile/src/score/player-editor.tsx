import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Button, Card, Heading, Hint } from '../ui/primitives';
import { colors } from '../ui/theme';
import { playerBounds } from './model';
import type { SheetApi } from './use-sheet';

export function PlayerEditor({ sheet }: { sheet: SheetApi }) {
  const { players } = sheet.state;
  const { min, max } = playerBounds(sheet.template);
  const [draft, setDraft] = useState('');
  const full = players.length >= max;

  const add = () => {
    if (!draft.trim() || full) return;
    sheet.addPlayer(draft);
    setDraft('');
  };

  return (
    <Card>
      <Heading>
        Người chơi ({players.length}/{max})
      </Heading>
      {players.map((p) => (
        <View key={p.id} style={styles.row}>
          <TextInput
            value={p.name}
            onChangeText={(v) => sheet.renamePlayer(p.id, v)}
            style={styles.name}
            placeholder="Tên người chơi"
          />
          <Pressable
            accessibilityLabel={`Xóa ${p.name}`}
            accessibilityRole="button"
            disabled={players.length <= min}
            onPress={() => sheet.removePlayer(p.id)}
            style={[styles.remove, players.length <= min && { opacity: 0.3 }]}
          >
            <Text style={styles.removeText}>✕</Text>
          </Pressable>
        </View>
      ))}
      {full ? (
        <Hint>Đã đạt tối đa {max} người chơi.</Hint>
      ) : (
        <View style={styles.row}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            onSubmitEditing={add}
            placeholder="Thêm người chơi theo tên"
            style={styles.name}
          />
          <Button label="Thêm" onPress={add} disabled={!draft.trim()} />
        </View>
      )}
      {players.length < min ? <Hint>Cần ít nhất {min} người chơi.</Hint> : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  name: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    backgroundColor: '#fff',
    fontSize: 15,
  },
  remove: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    backgroundColor: colors.dangerSoft,
  },
  removeText: { color: colors.danger, fontWeight: '700' },
});
