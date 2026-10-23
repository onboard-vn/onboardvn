import { t, translateKnown } from '../../ui/i18n';
import { useAppPreferences } from '../../ui/preferences';
import type { CategoryDto, GameSummaryDto } from '@onboard/shared';
import { Link, Stack, useLocalSearchParams, useRouter } from 'expo-router';
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
import { games, searchGames } from '../../games/catalog';
import { Button, Chip, Collapsible, Hint } from '../../ui/primitives';
import { themeStyles, colors, radius, space } from '../../ui/theme';

import {
  capabilityOptions,
  capabilitySlugs,
  hasCapability,
  parseCapability,
} from '../../games/capabilities';

const loadCategories = (signal: AbortSignal) =>
  api<{ items: CategoryDto[] }>('/categories', { signal });

export default function GameLibrary() {
  useAppPreferences();
  const params = useLocalSearchParams<{ capability?: string; sort?: string }>();
  const router = useRouter();
  const capability = parseCapability(params.capability);
  const setCapability = (value: string) => router.setParams({ capability: value });
  const [filters, setFilters] = useState(initialGameFilters);
  const [categoryText, setCategoryText] = useState('');
  const debounced = useDebounced(filters);
  const query = useMemo(
    () => ({
      ...buildGameQuery(debounced),
      ...(capability !== 'all' ? { slugs: capabilitySlugs(capability).join(',') } : {}),
      ...(params.sort === 'updated' ? { sort: 'updated' } : {}),
    }),
    [debounced, capability, params.sort],
  );
  const list = usePagedList<GameSummaryDto>('/games', query);
  const categories = useFetch(loadCategories);
  const categoryOptions = (categories.data?.items ?? []).map(categoryOption);

  const offline = !!list.error && list.items.length === 0;
  const rows = offline
    ? searchGames(debounced.q, capability === 'all' ? 100 : games.length)
        .filter(
          (g) => localMatchesPlayers(g, debounced.players) && hasCapability(g.slug, capability),
        )
        .map(rowFromLocal)
    : list.items.map(rowFromSummary);

  const patch = (next: Partial<typeof filters>) => setFilters((f) => ({ ...f, ...next }));
  const reset = () => {
    setFilters((f) => ({ ...initialGameFilters(), q: f.q }));
    setCategoryText('');
    setCapability('all');
  };

  const header = (
    <View style={styles.header}>
      <Link href="/suggest" style={styles.banner}>
        <Text style={styles.bannerText}>
          {t('Hôm nay chơi gì? Mở hộp để chọn game ngẫu nhiên')}
        </Text>
      </Link>
      <SearchInput
        value={filters.q}
        onChangeText={(q) => patch({ q })}
        placeholder={t('Tìm game (không cần gõ dấu)')}
        label={t('Tìm game')}
      />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
        {capabilityOptions.map((option) => (
          <Chip
            key={option.value}
            label={t(option.label)}
            selected={capability === option.value}
            onPress={() => setCapability(option.value)}
          />
        ))}
      </View>
      <Collapsible title={hasActiveFilters(filters) ? t('Bộ lọc (đang áp dụng)') : t('Bộ lọc')}>
        {categoryOptions.length > 0 ? (
          <TypeAhead
            label={t('Thể loại')}
            placeholder={t('Gõ để tìm thể loại...')}
            options={categoryOptions}
            text={categoryText}
            onTextChange={setCategoryText}
            onSelect={(categoryId) => patch({ categoryId })}
          />
        ) : null}
        <RangeStepper
          label={t('Số người chơi')}
          unit={t('người')}
          bounds={PLAYERS_BOUNDS}
          value={filters.players}
          onChange={(players) => patch({ players })}
        />
        <RangeStepper
          label={t('Thời gian')}
          unit={t('phút')}
          bounds={TIME_BOUNDS}
          value={filters.time}
          onChange={(time) => patch({ time })}
        />
        <RangeStepper
          label={t('Độ khó')}
          unit=""
          bounds={WEIGHT_BOUNDS}
          value={filters.weight}
          onChange={(weight) => patch({ weight })}
        />
        <Button label={t('Xóa bộ lọc')} tone="ghost" onPress={reset} />
      </Collapsible>
      {offline ? (
        <Hint>
          {translateKnown(list.error ?? '')}
          {t('. Đang dùng danh mục offline (lọc theo tên, số người chơi và tính điểm/công cụ).')}
        </Hint>
      ) : null}
    </View>
  );

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ title: t('Danh mục game') }} />
      <View style={styles.column}>
        <FlatList
          data={rows}
          keyExtractor={(g) => g.slug}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.list}
          ListHeaderComponent={header}
          ListEmptyComponent={
            list.loading ? null : <Hint>{t('Không tìm thấy game phù hợp.')}</Hint>
          }
          ListFooterComponent={list.loading ? <ActivityIndicator style={styles.spinner} /> : null}
          onEndReached={list.loadMore}
          onEndReachedThreshold={0.5}
          renderItem={({ item }) => <GameRowCard row={item} capability={capability} />}
        />
      </View>
    </View>
  );
}

const styles = themeStyles(() =>
  StyleSheet.create({
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
  }),
);
