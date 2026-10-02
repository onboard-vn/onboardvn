import { useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Button, Hint } from '../../ui/primitives';
import { colors, space } from '../../ui/theme';
import { Field, formStyles } from './form-bits';
import PinEditorMap, { type RecenterTarget } from './pin-editor-map';

const VN_LAT_RANGE = [8, 24] as const;
const VN_LNG_RANGE = [102, 110] as const;
const SEARCH_MIN_INTERVAL_MS = 1000;

interface NominatimResult {
  lat: string;
  lon: string;
  display_name: string;
}

const fmt = (n: number | null) => (n === null ? '' : String(n));

export function PinEditor({
  lat,
  lng,
  onChange,
}: {
  lat: number | null;
  lng: number | null;
  onChange: (lat: number | null, lng: number | null) => void;
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<NominatimResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [recenterTo, setRecenterTo] = useState<RecenterTarget | null>(null);
  const lastSearchAtRef = useRef(0);

  const [syncedLat, setSyncedLat] = useState(lat);
  const [syncedLng, setSyncedLng] = useState(lng);
  const [latText, setLatText] = useState(fmt(lat));
  const [lngText, setLngText] = useState(fmt(lng));
  if (lat !== syncedLat) {
    setSyncedLat(lat);
    setLatText(fmt(lat));
  }
  if (lng !== syncedLng) {
    setSyncedLng(lng);
    setLngText(fmt(lng));
  }

  const outOfVn =
    lat !== null &&
    lng !== null &&
    (lat < VN_LAT_RANGE[0] ||
      lat > VN_LAT_RANGE[1] ||
      lng < VN_LNG_RANGE[0] ||
      lng > VN_LNG_RANGE[1]);

  const onSearch = async () => {
    const q = query.trim();
    if (!q) return;
    const now = Date.now();
    if (now - lastSearchAtRef.current < SEARCH_MIN_INTERVAL_MS) return;
    lastSearchAtRef.current = now;

    setSearching(true);
    setSearchError(null);
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&countrycodes=vn&limit=5&q=${encodeURIComponent(q)}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('search failed');
      setResults((await res.json()) as NominatimResult[]);
    } catch {
      setSearchError('Không tìm được địa chỉ, thử lại sau');
      setResults([]);
    } finally {
      setSearching(false);
    }
  };

  const onManual = (field: 'lat' | 'lng', value: string) => {
    if (field === 'lat') setLatText(value);
    else setLngText(value);
    const trimmed = value.trim();
    const num = trimmed === '' ? null : Number(trimmed);
    if (num !== null && Number.isNaN(num)) return;
    if (field === 'lat') setSyncedLat(num);
    else setSyncedLng(num);
    onChange(field === 'lat' ? num : lat, field === 'lng' ? num : lng);
  };

  return (
    <View style={styles.stack}>
      <Text style={styles.label}>Vị trí trên bản đồ</Text>

      <View style={formStyles.row}>
        <View style={formStyles.grow}>
          <Field
            label="Tìm địa chỉ"
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={() => void onSearch()}
            placeholder="Tìm địa chỉ để định vị bản đồ (không tự ghim)..."
            returnKeyType="search"
            autoCapitalize="sentences"
          />
        </View>
        <Button label="Tìm" disabled={searching} onPress={() => void onSearch()} />
      </View>
      <Hint>Tìm kiếm © OpenStreetMap/Nominatim</Hint>
      {searchError ? <Text style={styles.error}>{searchError}</Text> : null}
      {results.map((r) => (
        <Text
          key={`${r.lat}-${r.lon}`}
          accessibilityRole="button"
          style={styles.result}
          onPress={() => {
            setRecenterTo({ lat: Number(r.lat), lng: Number(r.lon), zoom: 15 });
            setResults([]);
            setQuery(r.display_name);
          }}
        >
          {r.display_name}
        </Text>
      ))}

      <PinEditorMap
        lat={lat}
        lng={lng}
        onPick={(la, ln) => onChange(la, ln)}
        recenterTo={recenterTo}
      />

      <View style={formStyles.row}>
        <View style={formStyles.grow}>
          <Field
            label="Vĩ độ (lat)"
            value={latText}
            onChangeText={(t) => onManual('lat', t)}
            keyboardType="numbers-and-punctuation"
          />
        </View>
        <View style={formStyles.grow}>
          <Field
            label="Kinh độ (lng)"
            value={lngText}
            onChangeText={(t) => onManual('lng', t)}
            keyboardType="numbers-and-punctuation"
          />
        </View>
      </View>

      {outOfVn ? (
        <Text style={styles.error}>
          Toạ độ nằm ngoài lãnh thổ Việt Nam — hệ thống sẽ từ chối khi lưu.
        </Text>
      ) : null}

      {lat !== null || lng !== null ? (
        <Button label="Xoá vị trí" tone="ghost" onPress={() => onChange(null, null)} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: space.sm },
  label: { fontSize: 13, fontWeight: '600', color: colors.muted },
  result: { color: colors.primary, paddingVertical: 2 },
  error: { color: colors.danger, fontSize: 13 },
});
