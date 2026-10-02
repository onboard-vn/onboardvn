import { useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Button } from '../../ui/primitives';
import { colors, space } from '../../ui/theme';
import PinEditorMap, { pinMapAvailable } from './pin-editor-map';
import { isOutsideVietnam, type RecenterTarget } from './pin-types';
import { ErrorText, Field, SmallButton } from './ui';

interface NominatimResult {
  lat: string;
  lon: string;
  display_name: string;
}

const SEARCH_MIN_INTERVAL_MS = 1000;

function CoordInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number | null;
  onChange: (v: number | null) => void;
}) {
  const [text, setText] = useState(value?.toString() ?? '');
  const [seen, setSeen] = useState(value);
  if (seen !== value) {
    setSeen(value);
    if ((text.trim() === '' ? null : Number(text.replace(',', '.'))) !== value) {
      setText(value?.toString() ?? '');
    }
  }

  return (
    <Field
      label={label}
      keyboardType="numbers-and-punctuation"
      value={text}
      onChangeText={(t) => {
        setText(t);
        if (t.trim() === '') return onChange(null);
        const n = Number(t.replace(',', '.'));
        if (Number.isFinite(n)) onChange(n);
      }}
    />
  );
}

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
  const lastSearchAt = useRef(0);

  async function onSearch() {
    const q = query.trim();
    if (!q) return;
    const now = Date.now();
    if (now - lastSearchAt.current < SEARCH_MIN_INTERVAL_MS) return;
    lastSearchAt.current = now;

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
  }

  return (
    <View style={{ gap: space.sm }}>
      <Text style={styles.label}>Vị trí trên bản đồ</Text>

      {pinMapAvailable ? (
        <>
          <View style={styles.searchRow}>
            <View style={{ flex: 1 }}>
              <Field
                value={query}
                onChangeText={setQuery}
                placeholder="Tìm địa chỉ để định vị bản đồ (không tự ghim)..."
              />
            </View>
            <Button label="Tìm" disabled={searching} onPress={() => void onSearch()} />
          </View>
          <Text style={styles.hint}>Tìm kiếm © OpenStreetMap/Nominatim</Text>
          <ErrorText message={searchError} />
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
        </>
      ) : null}

      <PinEditorMap
        lat={lat}
        lng={lng}
        onPick={(la, ln) => onChange(la, ln)}
        recenterTo={recenterTo}
      />

      <View style={styles.coords}>
        <CoordInput label="Vĩ độ (lat)" value={lat} onChange={(v) => onChange(v, lng)} />
        <CoordInput label="Kinh độ (lng)" value={lng} onChange={(v) => onChange(lat, v)} />
      </View>

      {isOutsideVietnam(lat, lng) ? (
        <ErrorText message="Toạ độ nằm ngoài lãnh thổ Việt Nam — hệ thống sẽ từ chối khi lưu." />
      ) : null}

      {lat !== null || lng !== null ? (
        <View style={{ alignSelf: 'flex-start' }}>
          <SmallButton label="Xoá vị trí" onPress={() => onChange(null, null)} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 13, fontWeight: '600', color: colors.muted },
  hint: { fontSize: 12, color: colors.muted },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  result: { fontSize: 14, color: colors.primary, paddingVertical: 4 },
  coords: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md },
});
