import type { CafeOpeningHours, CafeOpenStatus } from '@onboard/shared';
import { StyleSheet, Text, View } from 'react-native';
import { Card, Heading, Hint } from '../../ui/primitives';
import { colors, space } from '../../ui/theme';
import { DAY_KEYS, DAY_LABELS, formatRanges, openStatusLabel, todayDayKey } from './labels';

const STATUS_COLOR: Record<string, string> = {
  open: colors.success,
  closing_soon: colors.warn,
  closed: colors.muted,
};

export function HoursTable({
  hours,
  openStatus,
}: {
  hours: CafeOpeningHours;
  openStatus?: CafeOpenStatus;
}) {
  if (!hours || DAY_KEYS.every((d) => (hours[d]?.length ?? 0) === 0)) return null;
  const today = todayDayKey();
  const status = openStatusLabel(openStatus);
  return (
    <Card>
      <Heading>Giờ mở cửa</Heading>
      {status && openStatus ? (
        <Text style={[styles.status, { color: STATUS_COLOR[openStatus.state] ?? colors.muted }]}>
          {status}
        </Text>
      ) : null}
      {DAY_KEYS.map((d) => (
        <View key={d} style={styles.row}>
          <Text style={[styles.cell, d === today && styles.today]}>{DAY_LABELS[d]}</Text>
          <Text style={[styles.cell, d === today && styles.today]}>{formatRanges(hours[d])}</Text>
        </View>
      ))}
      {hours.note ? <Hint>{hours.note}</Hint> : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  status: { fontWeight: '600' },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: space.md },
  cell: { color: colors.muted },
  today: { fontWeight: '700', color: colors.text },
});
