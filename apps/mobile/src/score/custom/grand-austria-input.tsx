import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Flash, PresenceLabel } from '../cell-flash';
import { NumberField } from '../../ui/number-field';
import { Card, Chip, Heading, Hint } from '../../ui/primitives';
import { colors } from '../../ui/theme';
import type { SheetApi } from '../use-sheet';

const ROOM_SLOTS = 4;
const ROWS = [
  { key: 'roomRow4', label: 'Hàng trên cùng', vp: 4 },
  { key: 'roomRow3', label: 'Hàng 3', vp: 3 },
  { key: 'roomRow2', label: 'Hàng 2', vp: 2 },
  { key: 'roomRow1', label: 'Hàng 1', vp: 1 },
] as const;
const COUNTERS = [
  { key: 'krones', label: 'Krone còn lại', vp: 1 },
  { key: 'kitchen', label: 'Món ăn/đồ uống trong bếp', vp: 1 },
  { key: 'cafeGuests', label: 'Khách còn trong quán cà phê', vp: -5 },
] as const;
const TRACK_CHIPS = [5, 10, 20];

const sign = (n: number) => (n > 0 ? `+${n}` : String(n));

export function GrandAustriaInput({ sheet }: { sheet: SheetApi }) {
  const num = (id: string, key: string) => {
    const v = sheet.state.values[id]?.[key];
    return typeof v === 'number' ? v : 0;
  };

  return (
    <>
      {sheet.state.players.map((p) => {
        const row = sheet.summary.rows.find((r) => r.id === p.id);
        return (
          <Flash key={p.id} sheet={sheet} id={p.id}>
          <Card>
            <View style={styles.header}>
              <View>
                <Heading>{p.name}</Heading>
                <PresenceLabel sheet={sheet} id={p.id} name={p.name} />
              </View>
              <Text style={styles.total}>{row?.total ?? 0} VP</Text>
            </View>

            <Text style={styles.label}>Điểm trên track (trước tính điểm cuối)</Text>
            <NumberField
              value={num(p.id, 'trackVp')}
              step={1}
              width={80}
              onChange={(n) => sheet.setValue(p.id, 'trackVp', n)}
            />
            <View style={styles.wrap}>
              {TRACK_CHIPS.map((q) => (
                <Chip
                  key={q}
                  label={`+${q}`}
                  onPress={() => sheet.setValue(p.id, 'trackVp', num(p.id, 'trackVp') + q)}
                />
              ))}
            </View>

            <Text style={styles.label}>Phòng có khách (chạm để đánh dấu)</Text>
            <View style={styles.hotel}>
              {ROWS.map((r) => {
                const n = num(p.id, r.key);
                return (
                  <View key={r.key} style={styles.floor}>
                    <Text style={styles.floorLabel}>
                      {r.label} · {r.vp} VP
                    </Text>
                    <View style={styles.rooms}>
                      {Array.from({ length: ROOM_SLOTS }, (_, i) => {
                        const filled = i < n;
                        return (
                          <Pressable
                            key={i}
                            accessibilityRole="button"
                            accessibilityLabel={`${r.label}, phòng ${i + 1}`}
                            accessibilityState={{ selected: filled }}
                            onPress={() => sheet.setValue(p.id, r.key, n === i + 1 ? i : i + 1)}
                            style={[styles.room, filled && styles.roomOn]}
                          >
                            <Text style={[styles.roomText, filled && { color: '#fff' }]}>
                              {filled ? r.vp : ''}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                    <Text style={styles.floorSum}>{n * r.vp} VP</Text>
                  </View>
                );
              })}
            </View>

            <Text style={styles.label}>Thẻ nhân viên</Text>
            <View style={styles.line}>
              <Text style={styles.lineText}>VP từ nhân viên cuối game</Text>
              <NumberField
                value={num(p.id, 'staffVp')}
                min={0}
                width={56}
                onChange={(n) => sheet.setValue(p.id, 'staffVp', n)}
              />
            </View>

            <Text style={styles.label}>Tài nguyên còn lại</Text>
            {COUNTERS.map((c) => (
              <View key={c.key} style={styles.line}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.lineText}>{c.label}</Text>
                  <Hint>
                    {sign(c.vp)} VP mỗi cái = {sign(c.vp * num(p.id, c.key))} VP
                  </Hint>
                </View>
                <NumberField
                  value={num(p.id, c.key)}
                  min={0}
                  width={56}
                  onChange={(n) => sheet.setValue(p.id, c.key, n)}
                />
              </View>
            ))}
          </Card>
          </Flash>
        );
      })}
    </>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  total: { fontSize: 22, fontWeight: '800', color: colors.primary },
  label: { fontSize: 13, fontWeight: '700', color: colors.muted, textTransform: 'uppercase' },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  hotel: { gap: 8, padding: 10, borderRadius: 12, backgroundColor: colors.bg },
  floor: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  floorLabel: { width: 108, fontSize: 12, fontWeight: '600', color: colors.text },
  rooms: { flex: 1, flexDirection: 'row', gap: 6 },
  room: {
    flex: 1,
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  roomOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  roomText: { fontWeight: '700', color: colors.text },
  floorSum: { width: 44, textAlign: 'right', fontSize: 12, color: colors.muted },
  line: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  lineText: { fontSize: 15, fontWeight: '600', color: colors.text },
});
