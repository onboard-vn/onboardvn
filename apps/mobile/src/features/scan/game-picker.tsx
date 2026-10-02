import type { GameListResponse } from '@onboard/shared';
import { Link, type Href } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { api } from '../../api/client';
import { Button, Hint } from '../../ui/primitives';
import { colors, space } from '../../ui/theme';
import { errorMessage } from '../errors';
import { inputStyle } from '../search-input';

export interface ResolvedGame {
  id: string;
  name: string;
}

type GameResult = GameListResponse['items'][number];

const displayName = (g: { nameVi: string | null; nameEn: string }) => g.nameVi || g.nameEn;

export function GamePicker({
  onPick,
  initialQuery,
  actionLabel = 'Chọn',
  allowCreate = true,
  isPicked,
  pickedLabel = 'Đã chọn',
  disabled,
}: {
  onPick: (game: ResolvedGame) => void;
  initialQuery?: string;
  actionLabel?: string;
  allowCreate?: boolean;
  isPicked?: (gameId: string) => boolean;
  pickedLabel?: string;
  disabled?: boolean;
}) {
  const [text, setText] = useState(initialQuery ?? '');
  const [results, setResults] = useState<GameResult[]>([]);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = async () => {
    const q = text.trim();
    setSearched(true);
    setError(null);
    if (!q) {
      setResults([]);
      return;
    }
    try {
      const res = await api<GameListResponse>('/games', { query: { q, pageSize: 10 } });
      setResults(res.items);
    } catch (e) {
      setResults([]);
      setError(errorMessage(e));
    }
  };

  return (
    <View style={styles.stack}>
      <View style={styles.row}>
        <TextInput
          style={[inputStyle, styles.input]}
          value={text}
          onChangeText={setText}
          onSubmitEditing={() => void search()}
          placeholder="Tìm game trong danh mục..."
          placeholderTextColor={colors.muted}
          accessibilityLabel="Tìm game trong danh mục"
          returnKeyType="search"
        />
        <Button label="Tìm" onPress={() => void search()} />
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {searched && !error && results.length === 0 ? (
        <View style={styles.row}>
          <View style={styles.input}>
            <Hint>Không tìm thấy.</Hint>
          </View>
          {allowCreate ? (
            <Link
              href={`/admin/games/new?nameEn=${encodeURIComponent(initialQuery ?? '')}` as Href}
              style={styles.link}
            >
              Tạo game nhanh
            </Link>
          ) : null}
        </View>
      ) : null}
      {results.map((g) => (
        <View key={g.id} style={styles.result}>
          <Text style={styles.name}>{displayName(g)}</Text>
          <Button
            label={isPicked?.(g.id) ? pickedLabel : actionLabel}
            disabled={disabled || isPicked?.(g.id)}
            onPress={() => onPick({ id: g.id, name: displayName(g) })}
          />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: space.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  input: { flex: 1 },
  result: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.sm,
  },
  name: { flex: 1, color: colors.text },
  link: { color: colors.primary, textDecorationLine: 'underline' },
  error: { color: colors.danger, fontSize: 13 },
});
