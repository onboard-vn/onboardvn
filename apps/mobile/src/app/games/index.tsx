import type { CategoryDto, GameSummaryDto } from '@onboard/shared';
import { Link, Stack } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';
import { api } from '../../api/client';
import { GameRowCard } from '../../features/game-row-card';
import {
  PLAYERS_BOUNDS,
  TIME_BOUNDS,
  WEIGHT_BOUNDS,
  buildGameQuery,
  categoryOption,
  hasActiveFilters,
  initialGameFilters,
  localMatchesPlayers,
  rowFromLocal,
  rowFromSummary,
} from '../../features/games/filters';
import { RangeStepper } from '../../features/range-stepper';
import { SearchInput } from '../../features/search-input';
import { TypeAhead } from '../../features/type-ahead';
import { useDebounced } from '../../features/use-debounced';
import { useFetch } from '../../features/use-fetch';
import { usePagedList } from '../../features/use-paged-list';
import { searchGames } from '../../games/catalog';
import { Button, Collapsible, Hint } from '../../ui/primitives';
import { colors, radius, space } from '../../ui/theme';

const loadCategories = (signal: AbortSignal) =>
  api<{ items: CategoryDto[] }>('/categories', { signal });

export default function GameLibrary() {
  const [filters, setFilters] = useState(initialGameFilters);
  const [categoryText, setCategoryText] = useState('');
  const debounced = useDebounced(filters);
  const query = useMemo(() => buildGameQuery(debounced), [debounced]);
  const list = usePagedList<GameSummaryDto>('/games', query);
  const categories = useFetch(loadCategories);
  const categoryOptions = useMemo(
    () => (categories.data?.items ?? []).map(categoryOption),
    [categories.data],
  );

  const offline = !!list.error && list.items.length === 0;
  const rows = useMemo(
    () =>
      offline
        ? searchGames(debounced.q, 100)
            .filter((g) => localMatchesPlayers(g, debounced.players))
            .map(rowFromLocal)
        : list.items.map(rowFromSummary),
    [offline, debounced.q, debounced.players, list.items],
  );

  const patch = (next: Partial<typeof filters>) => setFilters((f) => ({ ...f, ...next }));
  const reset = () => {
    setFilters((f) => ({ ...initialGameFilters(), q: f.q }));
    setCategoryText('');
  };

  const header = (
    <View style={styles.header}>
      <Link href="/suggest" style={styles.banner}>
        <Text style={styles.bannerText}>Hôm nay chơi gì? Mở hộp để chọn game ngẫu nhiên</Text>
      </Link>
      <SearchInput
        value={filters.q}
        onChangeText={(q) => patch({ q })}
        placeholder="Tìm game (không cần gõ dấu)"
        label="Tìm game"
      />
      <Collapsible title={hasActiveFilters(filters) ? 'Bộ lọc (đang áp dụng)' : 'Bộ lọc'}>
        {categoryOptions.length > 0 ? (
          <TypeAhead
            label="Thể loại"
            placeholder="Gõ để tìm thể loại..."
            options={categoryOptions}
            text={categoryText}
            onTextChange={setCategoryText}
            onSelect={(categoryId) => patch({ categoryId })}
          />
        ) : null}
        <RangeStepper
          label="Số người chơi"
          unit="người"
          bounds={PLAYERS_BOUNDS}
          value={filters.players}
          onChange={(players) => patch({ players })}
        />
        <RangeStepper
          label="Thời gian"
          unit="phút"
          bounds={TIME_BOUNDS}
          value={filters.time}
          onChange={(time) => patch({ time })}
        />
        <RangeStepper
          label="Độ khó"
          unit=""
          bounds={WEIGHT_BOUNDS}
          value={filters.weight}
          onChange={(weight) => patch({ weight })}
        />
        <Button label="Xóa bộ lọc" tone="ghost" onPress={reset} />
      </Collapsible>
      {offline ? (
        <Hint>{list.error}. Đang dùng danh mục offline (chỉ lọc theo tên và số người chơi).</Hint>
      ) : null}
    </View>
  );

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ title: 'Danh mục game' }} />
      <View style={styles.column}>
        <FlatList
          data={rows}
          keyExtractor={(g) => g.slug}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.list}
          ListHeaderComponent={header}
          ListEmptyComponent={list.loading ? null : <Hint>Không tìm thấy game phù hợp.</Hint>}
          ListFooterComponent={list.loading ? <ActivityIndicator style={styles.spinner} /> : null}
          onEndReached={list.loadMore}
          onEndReachedThreshold={0.5}
          renderItem={({ item }) => <GameRowCard row={item} />}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, alignItems: 'center' },
  column: { flex: 1, width: '100%', maxWidth: 720 },
  list: { gap: space.md, padding: space.lg, paddingBottom: space.xl },
  header: { gap: space.md },
  spinner: { marginVertical: space.lg },
  banner: {
    backgroundColor: colors.accentSoft,
    borderRadius: radius,
    padding: space.md,
    overflow: 'hidden',
  },
  bannerText: { color: colors.warn, fontWeight: '700' },
});
