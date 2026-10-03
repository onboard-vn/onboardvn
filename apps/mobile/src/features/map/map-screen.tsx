import type {
  CafeListResponse,
  CafeMapPinDto,
  GameDetailDto,
  GameListResponse,
  GameSummaryDto,
  ProvinceListResponse,
  VenueType,
} from '@onboard/shared';
import { Link, Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { api } from '../../api/client';
import { Button, Chip, Heading, Hint } from '../../ui/primitives';
import { useLoad } from '../../ui/use-load';
import { colors, radius, space } from '../../ui/theme';
import { CafeCard } from '../cafe-card';
import { VENUE_TYPE_LABELS } from '../cafes/labels';
import { errorMessage } from '../errors';
import { inputStyle } from '../search-input';
import { TypeAhead } from '../type-ahead';
import { CafeMap } from './cafe-map';
import {
  mapFiltersToParams,
  mapFiltersToQuery,
  parseMapSearchParams,
  type MapFilterValues,
} from './filters';

type Criterion = 'byog' | 'food' | 'free' | 'openNow';

const CRITERIA_CHIPS: { key: Criterion; label: string }[] = [
  { key: 'openNow', label: 'Đang mở' },
  { key: 'byog', label: 'Cho mang game tới' },
  { key: 'food', label: 'Có đồ ăn' },
  { key: 'free', label: 'Miễn phí ngồi' },
];

const PARAM_KEYS = ['province', 'game', 'venueType', 'byog', 'food', 'free', 'openNow'] as const;
const VENUE_TYPES = Object.keys(VENUE_TYPE_LABELS) as VenueType[];
const WIDE = 768;

const gameName = (g: { nameVi: string | null; nameEn: string }) => g.nameVi || g.nameEn;

function PinList({ pins }: { pins: CafeMapPinDto[] }) {
  return (
    <View style={styles.pinList}>
      {pins.map((pin) => (
        <View key={pin.slug} style={styles.pin}>
          <Link
            href={{ pathname: '/cafes/[slug]', params: { slug: pin.slug } }}
            style={styles.pinName}
          >
            {pin.name}
          </Link>
          <Hint>{VENUE_TYPE_LABELS[pin.venueType]}</Hint>
        </View>
      ))}
    </View>
  );
}

export function MapScreen() {
  const params = useLocalSearchParams<Record<string, string>>();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const wide = width >= WIDE;

  const [filters, setFilters] = useState<MapFilterValues>(() => parseMapSearchParams(params));
  const [showList, setShowList] = useState(false);
  const [provinceText, setProvinceText] = useState('');
  const [seeded, setSeeded] = useState(false);
  const [gameQuery, setGameQuery] = useState('');
  const [gameResults, setGameResults] = useState<GameSummaryDto[]>([]);
  const [gameError, setGameError] = useState<string | null>(null);
  const [pickedGame, setPickedGame] = useState<string | null>(null);

  const provinces = useLoad(() => api<ProvinceListResponse>('/locations/provinces'), []);
  const query = useMemo(() => mapFiltersToQuery(filters), [filters]);
  const pins = useLoad(() => api<CafeMapPinDto[]>('/cafes/map', { query }), [query]);
  const listQuery = useMemo(() => {
    const { gameSlug, ...rest } = query;
    return gameSlug ? null : { ...rest, pageSize: '50' };
  }, [query]);
  const cafes = useLoad(
    listQuery ? () => api<CafeListResponse>('/cafes', { query: listQuery }) : null,
    [listQuery],
  );
  const initialGame = useLoad(
    filters.gameSlug && !pickedGame
      ? () => api<GameDetailDto>(`/games/${encodeURIComponent(filters.gameSlug!)}`)
      : null,
    [filters.gameSlug, pickedGame],
  );
  const selectedGameName = pickedGame ?? (initialGame.data ? gameName(initialGame.data) : null);

  const provinceOptions = useMemo(
    () => (provinces.data?.items ?? []).map((p) => ({ id: p.slug, label: p.name })),
    [provinces.data],
  );

  if (!seeded && provinces.data) {
    setSeeded(true);
    const initial = provinces.data.items.find((p) => p.slug === filters.province);
    if (initial) setProvinceText(initial.name);
  }

  const apply = (next: MapFilterValues) => {
    setFilters(next);
    const urlParams = Object.fromEntries(mapFiltersToParams(next).entries());
    router.setParams(
      Object.fromEntries(PARAM_KEYS.map((k) => [k, urlParams[k]])) as Record<string, string>,
    );
  };

  const searchGames = async () => {
    const q = gameQuery.trim();
    if (!q) {
      setGameResults([]);
      return;
    }
    try {
      const res = await api<GameListResponse>('/games', { query: { q, pageSize: 8 } });
      setGameResults(res.items);
      setGameError(null);
    } catch (e) {
      setGameError(errorMessage(e));
    }
  };

  const pinItems = pins.data ?? [];
  const fitToPins = Boolean(filters.province);

  const panel = (
    <View style={styles.panel}>
      <Heading>Bản đồ quán</Heading>

      {provinceOptions.length > 0 ? (
        <TypeAhead
          label="Tỉnh/thành"
          placeholder="Tất cả"
          options={provinceOptions}
          text={provinceText}
          onTextChange={setProvinceText}
          onSelect={(province) => apply({ ...filters, province })}
        />
      ) : null}

      <View style={styles.field}>
        <Text style={styles.label}>Loại địa điểm</Text>
        <View style={styles.chips}>
          {VENUE_TYPES.map((t) => (
            <Chip
              key={t}
              label={VENUE_TYPE_LABELS[t]}
              selected={filters.venueType === t}
              onPress={() =>
                apply({ ...filters, venueType: filters.venueType === t ? undefined : t })
              }
            />
          ))}
        </View>
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Có game</Text>
        {selectedGameName ? (
          <View style={styles.picked}>
            <Text style={styles.pickedName}>{selectedGameName}</Text>
            <Text
              accessibilityRole="button"
              style={styles.clear}
              onPress={() => {
                setPickedGame(null);
                apply({ ...filters, gameSlug: undefined });
              }}
            >
              Xoá
            </Text>
          </View>
        ) : (
          <View style={styles.searchRow}>
            <TextInput
              style={[inputStyle, styles.searchInput]}
              value={gameQuery}
              onChangeText={setGameQuery}
              onSubmitEditing={() => void searchGames()}
              placeholder="Tên game..."
              placeholderTextColor={colors.muted}
              accessibilityLabel="Có game"
              returnKeyType="search"
            />
            <Button label="Tìm" onPress={() => void searchGames()} />
          </View>
        )}
        {gameError ? <Text style={styles.error}>{gameError}</Text> : null}
        {gameResults.map((g) => (
          <Text
            key={g.slug}
            accessibilityRole="button"
            style={styles.result}
            onPress={() => {
              setPickedGame(gameName(g));
              setGameResults([]);
              setGameQuery('');
              apply({ ...filters, gameSlug: g.slug });
            }}
          >
            {gameName(g)}
          </Text>
        ))}
      </View>

      <View style={styles.chips}>
        {CRITERIA_CHIPS.map(({ key, label }) => (
          <Chip
            key={key}
            label={label}
            selected={Boolean(filters[key])}
            onPress={() => apply({ ...filters, [key]: !filters[key] || undefined })}
          />
        ))}
      </View>

      {!wide ? (
        <Button
          label={showList ? 'Xem bản đồ' : 'Xem danh sách'}
          tone="ghost"
          onPress={() => setShowList((v) => !v)}
        />
      ) : null}

      {pins.loading ? <Hint>Đang tải…</Hint> : null}
      {pins.error ? (
        <View style={styles.field}>
          <Text style={styles.error}>Không tải được ghim bản đồ.</Text>
          <Button label="Thử lại" tone="ghost" onPress={pins.reload} />
        </View>
      ) : null}
      {pinItems.length === 0 && !pins.loading && !pins.error ? (
        <Hint>
          Chưa có quán nào được ghim trên bản đồ với bộ lọc này. Đội ngũ và chủ quán đang ghim dần
          vị trí — danh sách quán vẫn có cả quán chưa ghim.
        </Hint>
      ) : null}
      {wide || showList ? (
        listQuery ? (
          <View style={styles.field}>
            <Text style={styles.label}>
              Danh sách quán{cafes.data ? ` (${cafes.data.total})` : ''}
            </Text>
            {cafes.loading ? <Hint>Đang tải…</Hint> : null}
            {cafes.error ? <Text style={styles.error}>Không tải được danh sách quán.</Text> : null}
            {cafes.data?.items.length === 0 ? <Hint>Không có quán nào khớp bộ lọc.</Hint> : null}
            {cafes.data?.items.map((c) => (
              <CafeCard key={c.id} cafe={c} />
            ))}
          </View>
        ) : pinItems.length > 0 ? (
          <View style={styles.field}>
            <Text style={styles.label}>Quán có game này ({pinItems.length})</Text>
            <PinList pins={pinItems} />
          </View>
        ) : null
      ) : null}
    </View>
  );

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ title: 'Bản đồ quán' }} />
      {wide ? (
        <View style={styles.row}>
          <ScrollView style={styles.sidebar} keyboardShouldPersistTaps="handled">
            {panel}
          </ScrollView>
          <View style={styles.mapBox}>
            <CafeMap pins={pinItems} fitToPins={fitToPins} />
          </View>
        </View>
      ) : (
        <ScrollView keyboardShouldPersistTaps="handled">
          {panel}
          {showList ? null : (
            <View style={styles.mapBoxNarrow}>
              <CafeMap pins={pinItems} fitToPins={fitToPins} />
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  row: { flex: 1, flexDirection: 'row' },
  sidebar: { width: 320, flexGrow: 0, borderRightWidth: 1, borderRightColor: colors.border },
  mapBox: { flex: 1, minHeight: 320 },
  mapBoxNarrow: { height: 420 },
  panel: { padding: space.lg, gap: space.md },
  field: { gap: space.xs },
  label: { fontSize: 13, fontWeight: '600', color: colors.muted },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  searchRow: { flexDirection: 'row', gap: space.sm, alignItems: 'center' },
  searchInput: { flex: 1 },
  picked: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius,
    paddingHorizontal: space.md,
    paddingVertical: 8,
    backgroundColor: colors.card,
  },
  pickedName: { color: colors.text, flex: 1 },
  clear: { color: colors.muted, fontSize: 12 },
  result: { color: colors.primary, paddingVertical: 4 },
  error: { color: colors.danger, fontSize: 13 },
  pinList: { gap: space.sm },
  pin: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: space.sm,
    backgroundColor: colors.card,
  },
  pinName: { fontWeight: '600', color: colors.text },
});
