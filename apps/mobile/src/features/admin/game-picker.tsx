import type { GameSummaryDto } from '@onboard/shared';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { api } from '../../api/client';
import { Button } from '../../ui/primitives';
import { colors, space } from '../../ui/theme';
import { displayName, type ResolvedGame } from './game-name';
import { Field, SmallButton } from './ui';

type Result = Pick<GameSummaryDto, 'id' | 'nameVi' | 'nameEn'>;

export function GamePicker({
  onPick,
  initialQuery,
}: {
  onPick: (game: ResolvedGame) => void;
  initialQuery?: string;
}) {
  const router = useRouter();
  const [q, setQ] = useState(initialQuery ?? '');
  const [results, setResults] = useState<Result[]>([]);
  const [searched, setSearched] = useState(false);

  async function onSearch() {
    const term = q.trim();
    setSearched(true);
    if (!term) {
      setResults([]);
      return;
    }
    try {
      setResults(
        (await api<{ items: Result[] }>('/games', { query: { q: term, pageSize: 10 } })).items,
      );
    } catch {
      setResults([]);
    }
  }

  return (
    <View style={{ gap: space.sm }}>
      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <Field value={q} onChangeText={setQ} placeholder="Tìm game trong danh mục..." />
        </View>
        <Button label="Tìm" onPress={() => void onSearch()} />
      </View>
      {searched && results.length === 0 ? (
        <View style={styles.row}>
          <Text style={[styles.muted, { flex: 1 }]}>Không tìm thấy.</Text>
          <SmallButton
            label="Tạo game nhanh"
            onPress={() =>
              router.push({ pathname: '/admin/games/new', params: { nameEn: initialQuery ?? '' } })
            }
          />
        </View>
      ) : null}
      {results.map((g) => (
        <View key={g.id} style={styles.row}>
          <Text style={[styles.text, { flex: 1 }]}>{displayName(g)}</Text>
          <SmallButton
            tone="solid"
            label="Chọn"
            onPress={() => onPick({ id: g.id, name: displayName(g) })}
          />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  text: { fontSize: 14, color: colors.text },
  muted: { fontSize: 14, color: colors.muted },
});
