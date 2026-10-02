import type { CafeAmenities } from '@onboard/shared';
import { StyleSheet, Text, View } from 'react-native';
import { AMENITY_LABELS } from '../cafes/labels';
import { Segmented } from '../../ui/primitives';
import { colors, space } from '../../ui/theme';
import { Field } from './ui';

type Tri = 'unknown' | 'true' | 'false';

const TRI_OPTIONS: { value: Tri; label: string }[] = [
  { value: 'unknown', label: 'Chưa rõ' },
  { value: 'true', label: 'Có' },
  { value: 'false', label: 'Không' },
];

const toTri = (v: boolean | null | undefined): Tri =>
  v === true ? 'true' : v === false ? 'false' : 'unknown';
const fromTri = (v: Tri): boolean | null => (v === 'true' ? true : v === 'false' ? false : null);

const KEYS = Object.keys(AMENITY_LABELS) as (keyof typeof AMENITY_LABELS)[];

const capacity = (raw: string): number | null => {
  const n = Number(raw);
  return raw.trim() && Number.isFinite(n) ? n : null;
};

export function AmenitiesFields({
  value,
  onChange,
}: {
  value: CafeAmenities;
  onChange: (next: CafeAmenities) => void;
}) {
  const set = (key: keyof CafeAmenities, next: boolean | null | number) =>
    onChange({ ...value, [key]: next });

  return (
    <View style={{ gap: space.md }}>
      {KEYS.map((key) => (
        <View key={key} style={styles.item}>
          <Text style={styles.label}>{AMENITY_LABELS[key]}</Text>
          <Segmented
            options={TRI_OPTIONS}
            value={toTri(value[key])}
            onChange={(v) => set(key, fromTri(v))}
          />
        </View>
      ))}
      <View style={styles.pair}>
        <Field
          label="Sức chứa phòng riêng"
          keyboardType="number-pad"
          value={value.privateRoomCapacity?.toString() ?? ''}
          onChangeText={(t) => set('privateRoomCapacity', capacity(t))}
        />
        <Field
          label="Sức chứa nhóm tối đa"
          keyboardType="number-pad"
          value={value.maxGroupSize?.toString() ?? ''}
          onChangeText={(t) => set('maxGroupSize', capacity(t))}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  item: { gap: 4 },
  label: { fontSize: 13, fontWeight: '600', color: colors.muted },
  pair: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md },
});
