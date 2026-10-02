import type { GameListResponse, GameSummaryDto, LocalBarcodeLookupResult } from '@onboard/shared';
import { useCallback, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, View } from 'react-native';
import { api } from '../../api/client';
import { errorMessage } from '../errors';
import { inputStyle, SearchInput } from '../search-input';
import { useDebounced } from '../use-debounced';
import { useFetch } from '../use-fetch';
import { Button, Card, Heading, Hint } from '../../ui/primitives';
import { colors, space } from '../../ui/theme';
import { gameName } from './logic';

export function AddGame({
  onAdd,
}: {
  onAdd: (game: Pick<GameSummaryDto, 'id' | 'nameVi' | 'nameEn'>) => void;
}) {
  const [text, setText] = useState('');
  const [code, setCode] = useState('');
  const [codeStatus, setCodeStatus] = useState<string | null>(null);
  const [found, setFound] = useState<GameSummaryDto | null>(null);
  const q = useDebounced(text.trim());

  const search = useCallback(
    (signal: AbortSignal) =>
      q
        ? api<GameListResponse>('/games', { query: { q, pageSize: 8 }, signal })
        : Promise.resolve<GameListResponse | null>(null),
    [q],
  );
  const results = useFetch(search);

  const lookup = async () => {
    const value = code.trim();
    if (!value) return;
    setCodeStatus('Đang tra cứu...');
    setFound(null);
    try {
      const res = await api<LocalBarcodeLookupResult>(
        `/barcodes/local/${encodeURIComponent(value)}`,
      );
      setFound(res.game);
      setCodeStatus(res.game ? null : 'Chưa có mã này trong hệ thống, thử tìm theo tên game.');
    } catch (e) {
      setCodeStatus(errorMessage(e, 'Không tra cứu được, thử lại sau'));
    }
  };

  return (
    <Card>
      <Heading>Thêm game</Heading>
      <SearchInput
        value={text}
        onChangeText={setText}
        placeholder="Tìm game trong danh mục..."
        label="Tìm game để thêm"
      />
      {results.loading && q ? <ActivityIndicator /> : null}
      {results.error ? <Text style={styles.error}>{results.error}</Text> : null}
      {q && !results.loading && !results.error && results.data?.items.length === 0 ? (
        <Hint>Không tìm thấy.</Hint>
      ) : null}
      {(results.data?.items ?? []).map((g) => (
        <View key={g.id} style={styles.rowHead}>
          <Text style={styles.name}>{gameName(g)}</Text>
          <Button label="Chọn" onPress={() => onAdd(g)} />
        </View>
      ))}
      <View style={styles.noteRow}>
        <TextInput
          style={styles.noteInput}
          value={code}
          onChangeText={setCode}
          placeholder="Hoặc nhập mã vạch"
          placeholderTextColor={colors.muted}
          keyboardType="number-pad"
          accessibilityLabel="Mã vạch"
        />
        <Button
          label="Tra cứu"
          tone="ghost"
          disabled={!code.trim()}
          onPress={() => void lookup()}
        />
      </View>
      {codeStatus ? <Hint>{codeStatus}</Hint> : null}
      {found ? (
        <View style={styles.rowHead}>
          <Text style={styles.name}>{gameName(found)}</Text>
          <Button
            label="Thêm vào tủ"
            onPress={() => {
              onAdd(found);
              setFound(null);
              setCode('');
            }}
          />
        </View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  rowHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.sm,
  },
  name: { flex: 1, fontSize: 16, fontWeight: '600', color: colors.text },
  noteRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  noteInput: { ...inputStyle, flex: 1, paddingVertical: 8, fontSize: 15 },
  error: { color: colors.danger },
});
