import type { MeetupCalendarDay } from '@onboard/shared';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, space } from '../../ui/theme';
import { buildCalendarGrid } from './calendar';
import { shiftMonth, todayVnDateKey } from './time';
import { Btn, Muted, href } from './ui';

const WEEKDAY_LABELS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

export function SessionCalendar({
  month,
  days,
  baseHref,
}: {
  month: string;
  days: MeetupCalendarDay[];
  baseHref: string;
}) {
  const router = useRouter();
  const weeks = buildCalendarGrid(month, days);
  const joiner = baseHref.includes('?') ? '&' : '?';
  const today = todayVnDateKey();

  return (
    <View style={{ gap: space.md }}>
      <View style={styles.nav}>
        <Btn
          small
          variant="outline"
          label="← Tháng trước"
          onPress={() => router.push(href(`${baseHref}${joiner}month=${shiftMonth(month, -1)}`))}
        />
        <Text style={styles.month}>Tháng {month}</Text>
        <Btn
          small
          variant="outline"
          label="Tháng sau →"
          onPress={() => router.push(href(`${baseHref}${joiner}month=${shiftMonth(month, 1)}`))}
        />
      </View>

      <View style={styles.week}>
        {WEEKDAY_LABELS.map((label) => (
          <View key={label} style={styles.cellWrap}>
            <Muted small>{label}</Muted>
          </View>
        ))}
      </View>

      <View accessibilityLabel={`Lịch tháng ${month}`} style={{ gap: 4 }}>
        {weeks.map((week, weekIndex) => (
          <View key={weekIndex} style={styles.week}>
            {week.map((cell, i) => {
              const busy = cell.inCurrentMonth && (cell.tables > 0 || cell.players > 0);
              const label = cell.date
                ? `${cell.date}${busy ? `: ${cell.players} người, ${cell.tables} bàn` : ': không có Kèo'}`
                : undefined;
              return (
                <View key={cell.date ?? `pad-${i}`} style={styles.cellWrap}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={label}
                    disabled={!cell.inCurrentMonth}
                    onPress={() =>
                      cell.date &&
                      router.push(href(`${baseHref}${joiner}month=${month}&date=${cell.date}`))
                    }
                    style={[
                      styles.cell,
                      busy && styles.cellBusy,
                      cell.date === today && styles.cellToday,
                      !cell.inCurrentMonth && { opacity: 0.3 },
                    ]}
                  >
                    {cell.date ? (
                      <Text style={styles.day}>{Number(cell.date.slice(-2))}</Text>
                    ) : null}
                    {busy ? (
                      <Text style={styles.count}>
                        {cell.players}n · {cell.tables}b
                      </Text>
                    ) : null}
                  </Pressable>
                </View>
              );
            })}
          </View>
        ))}
      </View>
      <Muted small>n = người, b = bàn</Muted>
    </View>
  );
}

const styles = StyleSheet.create({
  nav: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 4 },
  month: { fontSize: 14, fontWeight: '600', color: colors.text },
  week: { flexDirection: 'row', gap: 4 },
  cellWrap: { flex: 1, alignItems: 'center' },
  cell: {
    width: '100%',
    minHeight: 56,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'transparent',
    padding: 4,
    gap: 2,
  },
  cellBusy: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  cellToday: { borderWidth: 2, borderColor: colors.primary },
  day: { fontSize: 13, fontWeight: '600', color: colors.text },
  count: { fontSize: 10, color: colors.muted },
});
