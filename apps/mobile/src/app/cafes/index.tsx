import type {
  CafePublicSummaryDto,
  ProvinceListResponse,
  VenueType,
  WardListResponse,
} from '@onboard/shared';
import { Link, Stack, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, View } from 'react-native';
import { api } from '../../api/client';
import { CafeCard } from '../../features/cafe-card';
import {
  CAFE_TOGGLES,
  VENUE_TYPE_LABELS,
  buildCafeQuery,
  parseCafeParams,
  type CafeFilterState,
} from '../../features/cafes/labels';
import { SearchInput } from '../../features/search-input';
import { TypeAhead } from '../../features/type-ahead';
import { useDebounced } from '../../features/use-debounced';
import { useFetch } from '../../features/use-fetch';
import { usePagedList } from '../../features/use-paged-list';
import { Button, Chip, Collapsible, Hint } from '../../ui/primitives';
import { useLoad } from '../../ui/use-load';
import { colors, space } from '../../ui/theme';

const loadProvinces = (signal: AbortSignal) =>
  api<ProvinceListResponse>('/locations/provinces', { signal });

const VENUE_TYPES = Object.keys(VENUE_TYPE_LABELS) as VenueType[];

export default function CafeList() {
  const params = useLocalSearchParams<Record<string, string>>();
  const [filters, setFilters] = useState<CafeFilterState>(() => parseCafeParams(params));
  const [provinceText, setProvinceText] = useState('');
  const [wardText, setWardText] = useState('');
  const [seeded, setSeeded] = useState(false);
  const debounced = useDebounced(filters);
  const query = useMemo(() => buildCafeQuery(debounced), [debounced]);
  const list = usePagedList<CafePublicSummaryDto>('/cafes', query);
  const provinces = useFetch(loadProvinces);
  const provinceOptions = useMemo(
    () => (provinces.data?.items ?? []).map((p) => ({ id: p.slug, label: p.name })),
    [provinces.data],
  );

  const province = provinces.data?.items.find((p) => p.slug === filters.provinceSlug);
  const wards = useLoad(
    province ? () => api<WardListResponse>(`/locations/provinces/${province.code}/wards`) : null,
    [province?.code],
  );
  const wardOptions = useMemo(
    () => (wards.data?.items ?? []).map((w) => ({ id: w.slug, label: w.name })),
    [wards.data],
  );

  if (!seeded && provinces.data && (!filters.wardSlug || (province && wards.data))) {
    setSeeded(true);
    if (province) setProvinceText(province.name);
    const ward = wards.data?.items.find((w) => w.slug === filters.wardSlug);
    if (ward) setWardText(ward.name);
  }

  const patch = (next: Partial<CafeFilterState>) => setFilters((f) => ({ ...f, ...next }));
  const active =
    !!filters.provinceSlug ||
    !!filters.wardSlug ||
    !!filters.venueType ||
    Object.keys(filters.toggles).length > 0;

  const header = (
    <View style={styles.header}>
      <SearchInput
        value={filters.q}
        onChangeText={(q) => patch({ q })}
        placeholder="Tìm địa điểm theo tên"
        label="Tìm địa điểm"
      />
      <Collapsible title={active ? 'Bộ lọc (đang áp dụng)' : 'Bộ lọc'}>
        {provinceOptions.length > 0 ? (
          <TypeAhead
            label="Tỉnh/thành"
            placeholder="Gõ để tìm tỉnh/thành..."
            options={provinceOptions}
            text={provinceText}
            onTextChange={setProvinceText}
            onSelect={(provinceSlug) => {
              if (provinceSlug !== filters.provinceSlug) setWardText('');
              patch({ provinceSlug, wardSlug: undefined });
            }}
          />
        ) : null}
        {filters.provinceSlug && wardOptions.length > 0 ? (
          <TypeAhead
            label="Phường/xã"
            placeholder="Gõ để tìm phường/xã..."
            options={wardOptions}
            text={wardText}
            onTextChange={setWardText}
            onSelect={(wardSlug) => patch({ wardSlug })}
          />
        ) : null}
        <View style={styles.chips}>
          {VENUE_TYPES.map((t) => (
            <Chip
              key={t}
              label={VENUE_TYPE_LABELS[t]}
              selected={filters.venueType === t}
              onPress={() => patch({ venueType: filters.venueType === t ? undefined : t })}
            />
          ))}
        </View>
        <View style={styles.chips}>
          {CAFE_TOGGLES.map(({ key, label }) => (
            <Chip
              key={key}
              label={label}
              selected={!!filters.toggles[key]}
              onPress={() => {
                const toggles = { ...filters.toggles };
                if (toggles[key]) delete toggles[key];
                else toggles[key] = true;
                patch({ toggles });
              }}
            />
          ))}
        </View>
        <Button
          label="Xóa bộ lọc"
          tone="ghost"
          onPress={() => {
            setFilters((f) => ({ q: f.q, toggles: {} }));
            setProvinceText('');
            setWardText('');
          }}
        />
      </Collapsible>
      <Link
        href={{
          pathname: '/map',
          params: filters.provinceSlug ? { province: filters.provinceSlug } : {},
        }}
        style={styles.mapLink}
      >
        Xem trên bản đồ
      </Link>
    </View>
  );

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ title: 'Địa điểm chơi' }} />
      <View style={styles.column}>
        <FlatList
          data={list.items}
          keyExtractor={(c) => c.id}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.list}
          ListHeaderComponent={header}
          ListEmptyComponent={
            list.loading ? null : <Hint>{list.error ?? 'Chưa có địa điểm nào phù hợp.'}</Hint>
          }
          ListFooterComponent={
            list.loading ? (
              <ActivityIndicator style={styles.spinner} />
            ) : list.error && list.items.length > 0 ? (
              <Button label="Thử lại" tone="ghost" onPress={list.retry} />
            ) : null
          }
          onEndReached={list.loadMore}
          onEndReachedThreshold={0.5}
          renderItem={({ item }) => <CafeCard cafe={item} />}
        />
        {list.error && list.items.length === 0 ? (
          <View style={styles.retry}>
            <Button label="Thử lại" tone="ghost" onPress={list.retry} />
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, alignItems: 'center' },
  column: { flex: 1, width: '100%', maxWidth: 720 },
  list: { gap: space.md, padding: space.lg, paddingBottom: space.xl },
  header: { gap: space.md },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  mapLink: { color: colors.primary, fontWeight: '600' },
  spinner: { marginVertical: space.lg },
  retry: { padding: space.lg },
});
