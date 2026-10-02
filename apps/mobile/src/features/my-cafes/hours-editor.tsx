import { CAFE_DAY_KEYS, type CafeHourRange, type CafeOpeningHours } from '@onboard/shared';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { Button, Hint } from '../../ui/primitives';
import { colors, radius, space } from '../../ui/theme';
import { DAY_LABELS } from '../cafes/labels';
import { inputStyle } from '../search-input';
import { Field } from './form-bits';

type Day = (typeof CAFE_DAY_KEYS)[number];

const DEFAULT_RANGE: CafeHourRange = { open: '08:00', close: '22:00' };

export function HoursEditor({
  value,
  onChange,
}: {
  value: CafeOpeningHours;
  onChange: (next: CafeOpeningHours) => void;
}) {
  const hours = value ?? {};

  const setRanges = (day: Day, ranges: CafeHourRange[]) => onChange({ ...hours, [day]: ranges });

  const updateRange = (day: Day, index: number, field: 'open' | 'close', time: string) =>
    setRanges(
      day,
      (hours[day] ?? []).map((r, i) => (i === index ? { ...r, [field]: time } : r)),
    );

  const copyToAllDays = (day: Day) => {
    const ranges = hours[day] ?? [];
    const next = { ...hours };
    for (const d of CAFE_DAY_KEYS) next[d] = ranges;
    onChange(next);
  };

  return (
    <View style={styles.stack}>
      {CAFE_DAY_KEYS.map((day) => {
        const ranges = hours[day] ?? [];
        return (
          <View key={day} style={styles.day}>
            <View style={styles.dayHead}>
              <Text style={styles.dayName}>{DAY_LABELS[day]}</Text>
              <View style={styles.dayActions}>
                <Text
                  accessibilityRole="button"
                  style={styles.action}
                  onPress={() => setRanges(day, [...ranges, DEFAULT_RANGE])}
                >
                  + Thêm khung giờ
                </Text>
                {ranges.length > 0 ? (
                  <Text
                    accessibilityRole="button"
                    style={styles.action}
                    onPress={() => copyToAllDays(day)}
                  >
                    Áp dụng cho mọi ngày
                  </Text>
                ) : null}
              </View>
            </View>
            {ranges.length === 0 ? (
              <Hint>{hours[day] === undefined ? 'Chưa có giờ mở cửa' : 'Đóng cửa'}</Hint>
            ) : (
              ranges.map((range, index) => (
                <View key={index} style={styles.range}>
                  <TextInput
                    style={[inputStyle, styles.time]}
                    value={range.open}
                    onChangeText={(t) => updateRange(day, index, 'open', t)}
                    placeholder="08:00"
                    placeholderTextColor={colors.muted}
                    accessibilityLabel={`Giờ mở cửa ${DAY_LABELS[day]}`}
                    maxLength={5}
                  />
                  <Text style={styles.to}>đến</Text>
                  <TextInput
                    style={[inputStyle, styles.time]}
                    value={range.close}
                    onChangeText={(t) => updateRange(day, index, 'close', t)}
                    placeholder="22:00"
                    placeholderTextColor={colors.muted}
                    accessibilityLabel={`Giờ đóng cửa ${DAY_LABELS[day]}`}
                    maxLength={5}
                  />
                  <Button
                    label="×"
                    tone="ghost"
                    onPress={() =>
                      setRanges(
                        day,
                        ranges.filter((_, i) => i !== index),
                      )
                    }
                  />
                </View>
              ))
            )}
          </View>
        );
      })}
      <Field
        label="Ghi chú giờ mở cửa"
        value={hours.note ?? ''}
        onChangeText={(t) => onChange({ ...hours, note: t || undefined })}
        placeholder="Vd: nghỉ lễ Tết, gọi trước khi tới…"
        autoCapitalize="sentences"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: space.md },
  day: {
    gap: 6,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius,
    padding: space.md,
  },
  dayHead: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: space.sm,
  },
  dayName: { fontWeight: '600', color: colors.text },
  dayActions: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md },
  action: { color: colors.primary, fontSize: 13 },
  range: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  time: { width: 96, textAlign: 'center' },
  to: { color: colors.muted, fontSize: 13 },
});
