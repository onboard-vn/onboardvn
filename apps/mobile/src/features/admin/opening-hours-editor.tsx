import { t } from '../../ui/i18n';
import { useAppPreferences } from '../../ui/preferences';
import type { CafeDayKey, CafeHourRange, CafeOpeningHours } from '@onboard/shared';
import { CAFE_DAY_KEYS } from '@onboard/shared';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { DAY_LABELS } from '../cafes/labels';
import { themeStyles, colors, radius, space } from '../../ui/theme';
import { inputStyle } from '../search-input';
import { Field, SmallButton } from './ui';

const DEFAULT_RANGE: CafeHourRange = { open: '08:00', close: '22:00' };

export function OpeningHoursEditor({
  value,
  onChange,
}: {
  value: CafeOpeningHours;
  onChange: (next: CafeOpeningHours) => void;
}) {
  useAppPreferences();
  const hours = value ?? {};

  const setRanges = (day: CafeDayKey, ranges: CafeHourRange[]) =>
    onChange({ ...hours, [day]: ranges });

  const updateRange = (day: CafeDayKey, index: number, field: 'open' | 'close', time: string) =>
    setRanges(
      day,
      (hours[day] ?? []).map((r, i) => (i === index ? { ...r, [field]: time } : r)),
    );

  const copyToAllDays = (day: CafeDayKey) => {
    const ranges = hours[day] ?? [];
    const next = { ...hours };
    for (const d of CAFE_DAY_KEYS) next[d] = ranges;
    onChange(next);
  };

  return (
    <View style={{ gap: space.md }}>
      {CAFE_DAY_KEYS.map((day) => {
        const ranges = hours[day] ?? [];
        return (
          <View key={day} style={styles.day}>
            <View style={styles.head}>
              <Text style={styles.dayName}>{t(DAY_LABELS[day])}</Text>
              <View style={styles.actions}>
                <SmallButton
                  label={t('+ Thêm khung giờ')}
                  onPress={() => setRanges(day, [...ranges, DEFAULT_RANGE])}
                />
                {ranges.length > 0 ? (
                  <SmallButton
                    label={t('Áp dụng cho mọi ngày')}
                    onPress={() => copyToAllDays(day)}
                  />
                ) : null}
              </View>
            </View>
            {ranges.length === 0 ? (
              <Text style={styles.muted}>
                {hours[day] === undefined ? t('Chưa có giờ mở cửa') : t('Đóng cửa')}
              </Text>
            ) : (
              ranges.map((range, index) => (
                <View key={index} style={styles.range}>
                  <TextInput
                    accessibilityLabel={t('Giờ mở cửa {day}', { day: t(DAY_LABELS[day]) })}
                    value={range.open}
                    onChangeText={(t) => updateRange(day, index, 'open', t)}
                    placeholder="08:00"
                    maxLength={5}
                    style={[inputStyle, styles.time]}
                  />
                  <Text style={styles.muted}>{t('đến')}</Text>
                  <TextInput
                    accessibilityLabel={t('Giờ đóng cửa {day}', { day: t(DAY_LABELS[day]) })}
                    value={range.close}
                    onChangeText={(t) => updateRange(day, index, 'close', t)}
                    placeholder="22:00"
                    maxLength={5}
                    style={[inputStyle, styles.time]}
                  />
                  <SmallButton
                    label="×"
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
        label={t('Ghi chú giờ mở cửa')}
        value={hours.note ?? ''}
        onChangeText={(t) => onChange({ ...hours, note: t || undefined })}
        placeholder={t('Vd: nghỉ lễ Tết, gọi trước khi tới…')}
      />
    </View>
  );
}

const styles = themeStyles(() =>
  StyleSheet.create({
    day: {
      gap: 6,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius,
      padding: space.md,
    },
    head: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      gap: space.sm,
    },
    dayName: { fontSize: 15, fontWeight: '600', color: colors.text },
    actions: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
    range: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
    time: { width: 90, textAlign: 'center' },
    muted: { fontSize: 12, color: colors.muted },
  }),
);
