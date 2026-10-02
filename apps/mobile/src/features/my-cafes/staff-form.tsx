import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { api } from '../../api/client';
import { Button, Card, Heading } from '../../ui/primitives';
import { colors, space } from '../../ui/theme';
import { Field, FormError } from './form-bits';

export function StaffForm({ cafeId }: { cafeId: string }) {
  const [username, setUsername] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const submit = async () => {
    const value = username.trim();
    if (!value) return;
    setPending(true);
    setError(null);
    setDone(false);
    try {
      await api(`/me/cafes/${encodeURIComponent(cafeId)}/staff`, {
        method: 'POST',
        body: { username: value },
      });
      setDone(true);
      setUsername('');
    } catch {
      setError('Không tìm thấy người dùng hoặc có lỗi xảy ra');
    } finally {
      setPending(false);
    }
  };

  return (
    <Card>
      <Heading>Thêm nhân viên</Heading>
      <View style={styles.row}>
        <View style={styles.grow}>
          <Field
            label="Tên đăng nhập"
            value={username}
            onChangeText={setUsername}
            onSubmitEditing={() => void submit()}
            placeholder="Tên đăng nhập"
          />
        </View>
        <Button label="Thêm" disabled={pending || !username.trim()} onPress={() => void submit()} />
      </View>
      {done ? <Text style={styles.done}>Đã thêm nhân viên.</Text> : null}
      <FormError message={error} />
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: space.sm },
  grow: { flex: 1 },
  done: { color: colors.text, fontSize: 14 },
});
