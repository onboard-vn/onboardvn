import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Avatar, Button, Card, Heading, Hint } from '../ui/primitives';
import { colors } from '../ui/theme';
import { PresenceLabel } from './cell-flash';
import { AddPlayerSheet } from './add-player-sheet';
import { playerBounds } from './model';
import type { SheetApi } from './use-sheet';

const KIND_LABEL = { member: '', guest: 'Khách', external: 'Ngoài CLB' } as const;

export function PlayerEditor({ sheet }: { sheet: SheetApi }) {
  const { players } = sheet.state;
  const { min, max } = playerBounds(sheet.template);
  const [open, setOpen] = useState(false);
  const full = players.length >= max;

  return (
    <Card>
      <Heading>
        Người chơi ({players.length}/{max})
      </Heading>
      {players.map((p) => (
        <View key={p.id} style={styles.row}>
          <Avatar name={p.name} color={p.avatarColor ?? colors.muted} />
          <View style={{ flex: 1 }}>
            <Text style={styles.name} numberOfLines={1}>
              {p.name}
            </Text>
            <PresenceLabel sheet={sheet} id={p.id} name={p.name} />
          </View>
          {p.kind && KIND_LABEL[p.kind] ? (
            <Text style={styles.kind}>{KIND_LABEL[p.kind]}</Text>
          ) : null}
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
        <Button label="Thêm người chơi" tone="ghost" onPress={() => setOpen(true)} />
      )}
      {players.length < min ? <Hint>Cần ít nhất {min} người chơi.</Hint> : null}
      <AddPlayerSheet
        visible={open}
        seatedIds={players.map((p) => p.id)}
        onPick={sheet.addPlayer}
        onClose={() => setOpen(false)}
      />
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  name: { fontSize: 15, fontWeight: '600', color: colors.text },
  kind: { fontSize: 12, color: colors.muted },
  remove: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    backgroundColor: colors.dangerSoft,
  },
  removeText: { color: colors.danger, fontWeight: '700' },
});
