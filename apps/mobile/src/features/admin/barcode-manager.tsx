import type { GameBarcodeDto } from '@onboard/shared';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { api } from '../../api/client';
import { Button } from '../../ui/primitives';
import { colors, space } from '../../ui/theme';
import { errorMessage } from '../errors';
import { ErrorText, Field, Section, SmallButton } from './ui';

export function BarcodeManager({
  gameId,
  barcodes,
  onChanged,
}: {
  gameId: string;
  barcodes: GameBarcodeDto[];
  onChanged: () => void;
}) {
  const [code, setCode] = useState('');
  const [edition, setEdition] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function run(action: () => Promise<unknown>, after?: () => void) {
    setPending(true);
    setError(null);
    try {
      await action();
      after?.();
      onChanged();
    } catch (e) {
      setError(errorMessage(e, 'Có lỗi xảy ra, thử lại sau'));
    } finally {
      setPending(false);
    }
  }

  const onAdd = () => {
    const trimmed = code.trim();
    if (!trimmed) return;
    void run(
      () =>
        api(`/games/${gameId}/barcodes`, {
          method: 'POST',
          body: { code: trimmed, edition: edition.trim() || undefined },
        }),
      () => {
        setCode('');
        setEdition('');
      },
    );
  };

  return (
    <Section title="Mã vạch">
      {barcodes.map((b) => (
        <View key={b.code} style={styles.row}>
          <Text style={styles.text}>
            {b.code}
            {b.edition ? ` (${b.edition})` : ''}
          </Text>
          <SmallButton
            label="Xóa"
            disabled={pending}
            onPress={() =>
              void run(() =>
                api(`/games/${gameId}/barcodes/${encodeURIComponent(b.code)}`, {
                  method: 'DELETE',
                }),
              )
            }
          />
        </View>
      ))}
      {barcodes.length === 0 ? <Text style={styles.muted}>Chưa có mã vạch nào.</Text> : null}
      <View style={styles.form}>
        <Field
          value={code}
          onChangeText={setCode}
          placeholder="Mã vạch (EAN/UPC)"
          keyboardType="number-pad"
        />
        <Field value={edition} onChangeText={setEdition} placeholder="Bản (tuỳ chọn)" />
        <Button label="Thêm" disabled={pending} onPress={onAdd} />
      </View>
      <ErrorText message={error} />
    </Section>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.sm,
  },
  text: { fontSize: 15, color: colors.text, flex: 1 },
  muted: { fontSize: 14, color: colors.muted },
  form: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: space.sm },
});
