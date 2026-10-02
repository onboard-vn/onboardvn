import { StyleSheet, Text, View } from 'react-native';
import { Card, Heading } from '../ui/primitives';
import { colors } from '../ui/theme';
import { isCoop } from './model';
import type { SheetApi } from './use-sheet';

const fmt = (n: number) => n.toLocaleString('vi-VN');

export function SummaryCard({ sheet }: { sheet: SheetApi }) {
  const { template, summary, state } = sheet;
  const coop = isCoop(template);
  const rows = [...summary.rows].sort((a, b) => (a.rank ?? 99) - (b.rank ?? 99));
  const ranked = rows.some((r) => r.rank !== null);

  return (
    <Card>
      <Heading>Kết quả</Heading>
      {coop ? (
        <View
          style={[
            styles.banner,
            state.outcome === 'win' && { backgroundColor: colors.successSoft },
            state.outcome === 'loss' && { backgroundColor: colors.dangerSoft },
          ]}
        >
          <Text style={styles.bannerText}>
            {state.outcome === 'win'
              ? 'Cả đội thắng'
              : state.outcome === 'loss'
                ? 'Cả đội thua'
                : 'Chưa chọn kết quả'}
          </Text>
        </View>
      ) : null}
      {summary.error ? <Text style={styles.error}>{summary.error}</Text> : null}
      {!coop &&
        rows.map((r) => {
          const won = summary.winners.includes(r.id);
          return (
            <View key={r.id} style={[styles.row, won && styles.rowWin]}>
              <Text style={styles.rank}>{ranked && r.rank ? `#${r.rank}` : ''}</Text>
              <Text style={styles.name} numberOfLines={1}>
                {r.name}
                {won ? '  🏆' : ''}
              </Text>
              <Text style={styles.total}>{fmt(r.total)}</Text>
            </View>
          );
        })}
      {summary.note ? <Text style={styles.note}>{summary.note}</Text> : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
  },
  rowWin: { backgroundColor: colors.successSoft },
  rank: { width: 30, fontWeight: '700', color: colors.muted },
  name: { flex: 1, fontSize: 16, color: colors.text },
  total: { fontSize: 20, fontWeight: '800', color: colors.text },
  note: {
    backgroundColor: colors.warnSoft,
    color: colors.warn,
    padding: 10,
    borderRadius: 10,
    fontSize: 13,
  },
  error: { color: colors.danger, fontSize: 14 },
  banner: { padding: 14, borderRadius: 10, backgroundColor: '#eef0f3', alignItems: 'center' },
  bannerText: { fontSize: 18, fontWeight: '700', color: colors.text },
});
