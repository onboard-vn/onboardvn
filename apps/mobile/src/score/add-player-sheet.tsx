import { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { avatarColorFor, listClubMembers } from '../mock/club';
import { Avatar, Button, Heading, Hint } from '../ui/primitives';
import { colors } from '../ui/theme';
import type { Player } from './model';

const normalize = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/gi, 'd')
    .toLowerCase();

export function AddPlayerSheet({
  visible,
  seatedIds,
  onPick,
  onClose,
}: {
  visible: boolean;
  seatedIds: string[];
  onPick: (p: Player) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState('');
  const [guestMode, setGuestMode] = useState(false);
  const [guestName, setGuestName] = useState('');
  const [birthYear, setBirthYear] = useState('');

  const options = useMemo(() => {
    const q = normalize(query.trim());
    return listClubMembers().filter(
      (m) => !seatedIds.includes(m.identityId) && normalize(m.displayName).includes(q),
    );
  }, [query, seatedIds]);

  const year = birthYear.trim() === '' ? undefined : Number(birthYear);
  const yearOk = year === undefined || (Number.isInteger(year) && year >= 1900 && year <= 2026);
  const guestOk = guestName.trim().length > 0 && yearOk;

  const close = () => {
    setQuery('');
    setGuestMode(false);
    setGuestName('');
    setBirthYear('');
    onClose();
  };

  const addGuest = () => {
    if (!guestOk) return;
    const name = guestName.trim();
    onPick({
      id: `guest-${Date.now().toString(36)}`,
      name,
      kind: 'guest',
      avatarColor: avatarColorFor(name),
      ...(year !== undefined ? { birthYear: year } : {}),
    });
    close();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={close}>
      <View style={styles.backdrop}>
        <Pressable style={styles.dismiss} onPress={close} accessibilityLabel="Đóng" />
        <View style={styles.sheet}>
          <Heading>{guestMode ? 'Thêm khách' : 'Chọn người chơi'}</Heading>
          {guestMode ? (
            <View style={{ gap: 10 }}>
              <TextInput
                value={guestName}
                onChangeText={setGuestName}
                placeholder="Tên hiển thị"
                style={styles.input}
                autoFocus
              />
              <TextInput
                value={birthYear}
                onChangeText={setBirthYear}
                placeholder="Năm sinh (không bắt buộc)"
                keyboardType="number-pad"
                maxLength={4}
                style={styles.input}
              />
              {!yearOk ? <Hint>Năm sinh không hợp lệ.</Hint> : null}
              <Button label="Thêm khách" onPress={addGuest} disabled={!guestOk} />
              <Button label="Quay lại danh sách" tone="ghost" onPress={() => setGuestMode(false)} />
            </View>
          ) : (
            <>
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Tìm thành viên CLB"
                style={styles.input}
              />
              <ScrollView style={styles.list} keyboardShouldPersistTaps="handled">
                {options.map((m) => (
                  <Pressable
                    key={m.identityId}
                    accessibilityRole="button"
                    onPress={() => {
                      onPick({
                        id: m.identityId,
                        name: m.displayName,
                        kind: m.kind,
                        avatarColor: m.avatarColor,
                      });
                      close();
                    }}
                    style={styles.option}
                  >
                    <Avatar name={m.displayName} color={m.avatarColor} />
                    <Text style={styles.optionName}>{m.displayName}</Text>
                  </Pressable>
                ))}
                {options.length === 0 ? <Hint>Không có thành viên phù hợp.</Hint> : null}
              </ScrollView>
              <Button label="Thêm khách" tone="ghost" onPress={() => setGuestMode(true)} />
            </>
          )}
          <Button label="Đóng" tone="ghost" onPress={close} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.35)' },
  dismiss: { flex: 1 },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    padding: 16,
    gap: 12,
    maxHeight: '80%',
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
  },
  input: {
    height: 42,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    backgroundColor: '#fff',
    fontSize: 15,
  },
  list: { maxHeight: 280 },
  option: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
  optionName: { fontSize: 16, color: colors.text, fontWeight: '500' },
});
