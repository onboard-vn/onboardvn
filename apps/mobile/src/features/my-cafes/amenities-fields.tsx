import type { CafeAmenities } from '@onboard/shared';
import { StyleSheet, View } from 'react-native';
import { space } from '../../ui/theme';
import { AMENITY_KEYS, AMENITY_LABELS } from '../cafes/labels';
import { ChoiceRow, Field } from './form-bits';

type Tri = 'unknown' | 'true' | 'false';

const TRI_OPTIONS: { value: Tri; label: string }[] = [
  { value: 'unknown', label: 'Chưa rõ' },
  { value: 'true', label: 'Có' },
  { value: 'false', label: 'Không' },
];

const toTri = (v: boolean | null | undefined): Tri =>
  v === true ? 'true' : v === false ? 'false' : 'unknown';
const fromTri = (v: Tri): boolean | null => (v === 'true' ? true : v === 'false' ? false : null);

const capacity = (raw: string): number | null => {
  const n = Number(raw.replace(/[^0-9]/g, ''));
  return n >= 1 ? Math.min(200, n) : null;
};

export function AmenitiesFields({
  value,
  onChange,
}: {
  value: CafeAmenities;
  onChange: (next: CafeAmenities) => void;
}) {
  return (
    <View style={styles.stack}>
      {AMENITY_KEYS.map((key) => (
        <ChoiceRow<Tri>
          key={key}
          label={AMENITY_LABELS[key]}
          options={TRI_OPTIONS}
          value={toTri(value[key])}
          onChange={(v) => onChange({ ...value, [key]: fromTri(v) })}
        />
      ))}
      <Field
        label="Sức chứa phòng riêng"
        keyboardType="number-pad"
        value={value.privateRoomCapacity?.toString() ?? ''}
        onChangeText={(t) => onChange({ ...value, privateRoomCapacity: capacity(t) })}
      />
      <Field
        label="Sức chứa nhóm tối đa"
        keyboardType="number-pad"
        value={value.maxGroupSize?.toString() ?? ''}
        onChangeText={(t) => onChange({ ...value, maxGroupSize: capacity(t) })}
      />
    </View>
  );
}

const styles = StyleSheet.create({ stack: { gap: space.md } });
