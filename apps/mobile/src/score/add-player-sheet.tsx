import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import type { RosterApi, RosterPlayer } from '../api/plays-types';
import { Avatar, Button, Heading, Hint } from '../ui/primitives';
import { colors } from '../ui/theme';
import type { Player } from './model';

const normalize = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd').toLowerCase();

export function AddPlayerSheet({
  visible,
  seatedIds,
  roster,
  onPick,
  onClose,
}: {
  visible: boolean;
  seatedIds: string[];
  roster: Pick<RosterApi, 'search' | 'createGuest'>;
  onPick: (p: Player) => Promise<void>;
  onClose: () => void;
}) {
  const [query, setQuery] = useState('');
  const [guestMode, setGuestMode] = useState(false);
  const [guestName, setGuestName] = useState('');
  const [birthYear, setBirthYear] = useState('');

  const [found, setFound] = useState<RosterPlayer[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible || guestMode) return;
    let live = true;
    const t = setTimeout(() => {
      roster
        .search(query.trim())
        .then((list) => live && setFound(list))
        .catch(() => live && setFound([]));
    }, 250);
    return () => {
      live = false;
      clearTimeout(t);
    };
  }, [visible, guestMode, query, roster]);

  const q = normalize(query.trim());
  const options = found.filter((m) => !seatedIds.includes(m.id) && normalize(m.name).includes(q));

  const year = birthYear.trim() === '' ? undefined : Number(birthYear);
  const yearOk = year === undefined || (Number.isInteger(year) && year >= 1900 && year <= 2026);
  const guestOk = guestName.trim().length > 0 && yearOk;

  const close = () => {
    setQuery('');
    setGuestMode(false);
    setGuestName('');
    setBirthYear('');
    setError(null);
    onClose();
  };

  const pick = async (load: () => Promise<Player>) => {
    setBusy(true);
    setError(null);
    try {
      await onPick(await load());
      close();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không thêm được người chơi');
    } finally {
      setBusy(false);
    }
  };

  const addGuest = () => {
    if (!guestOk) return;
    void pick(() =>
      roster.createGuest({
        displayName: guestName.trim(),
        ...(year !== undefined ? { birthYear: year } : {}),
      }),
    );
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
              <Button label="Thêm khách" onPress={addGuest} disabled={!guestOk || busy} />
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
                    key={m.id}
                    accessibilityRole="button"
                    disabled={busy}
                    onPress={() => void pick(async () => m)}
                    style={styles.option}
                  >
                    <Avatar name={m.name} color={m.avatarColor} />
                    <Text style={styles.optionName}>{m.name}</Text>
                  </Pressable>
                ))}
                {options.length === 0 ? <Hint>Không có thành viên phù hợp.</Hint> : null}
              </ScrollView>
              <Button label="Thêm khách" tone="ghost" onPress={() => setGuestMode(true)} />
            </>
          )}
          {error ? <Text style={styles.error}>{error}</Text> : null}
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
  error: { color: colors.danger },
  optionName: { fontSize: 16, color: colors.text, fontWeight: '500' },
});
