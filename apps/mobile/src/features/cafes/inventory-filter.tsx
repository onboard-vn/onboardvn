import type { CafeInventoryItemDto } from '@onboard/shared';
import { Link } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Badge, Card, Chip, Heading, Hint } from '../../ui/primitives';
import { colors, space } from '../../ui/theme';
import { inputStyle } from '../search-input';

export function InventoryFilter({ inventory }: { inventory: CafeInventoryItemDto[] }) {
  const [players, setPlayers] = useState('');
  const [maxTime, setMaxTime] = useState('');
  const [categoryId, setCategoryId] = useState('');

  const categories = useMemo(() => {
    const seen = new Map<string, string>();
    for (const item of inventory) {
      for (const c of item.categories) seen.set(c.id, c.nameVi ?? c.name);
    }
    return [...seen.entries()];
  }, [inventory]);

  const filtered = useMemo(() => {
    const playersNum = players ? Number(players) : null;
    const maxTimeNum = maxTime ? Number(maxTime) : null;
    return inventory.filter((item) => {
      if (playersNum != null) {
        if (item.minPlayers != null && playersNum < item.minPlayers) return false;
        if (item.maxPlayers != null && playersNum > item.maxPlayers) return false;
      }
      if (maxTimeNum != null && item.playMinutes != null && item.playMinutes > maxTimeNum) {
        return false;
      }
      if (categoryId && !item.categories.some((c) => c.id === categoryId)) return false;
      return true;
    });
  }, [inventory, players, maxTime, categoryId]);

  return (
    <View style={styles.stack}>
      <View style={styles.row}>
        <View style={styles.field}>
          <Text style={styles.label}>Số người</Text>
          <TextInput
            style={inputStyle}
            value={players}
            onChangeText={(t) => setPlayers(t.replace(/[^0-9]/g, ''))}
            keyboardType="number-pad"
            accessibilityLabel="Số người"
          />
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>Tối đa (phút)</Text>
          <TextInput
            style={inputStyle}
            value={maxTime}
            onChangeText={(t) => setMaxTime(t.replace(/[^0-9]/g, ''))}
            keyboardType="number-pad"
            accessibilityLabel="Tối đa (phút)"
          />
        </View>
      </View>
      {categories.length > 0 ? (
        <View style={styles.stack}>
          <Text style={styles.label}>Thể loại</Text>
          <View style={styles.chips}>
            <Chip label="Tất cả" selected={!categoryId} onPress={() => setCategoryId('')} />
            {categories.map(([id, name]) => (
              <Chip
                key={id}
                label={name}
                selected={categoryId === id}
                onPress={() => setCategoryId(categoryId === id ? '' : id)}
              />
            ))}
          </View>
        </View>
      ) : null}

      {filtered.length === 0 ? <Hint>Không có game nào khớp bộ lọc.</Hint> : null}
      <View style={styles.grid}>
        {filtered.map((item) => (
          <Link
            key={item.gameId}
            href={{ pathname: '/games/[slug]', params: { slug: item.slug } }}
            asChild
          >
            <Pressable accessibilityRole="button" style={styles.cell}>
              <Card>
                <Heading>{item.nameVi || item.nameEn}</Heading>
                <View style={styles.meta}>
                  {item.community ? <Badge label="Cộng đồng đóng góp" /> : null}
                  {item.copies > 1 ? <Hint>x{item.copies}</Hint> : null}
                </View>
              </Card>
            </Pressable>
          </Link>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: space.md },
  row: { flexDirection: 'row', gap: space.md },
  field: { flex: 1, gap: 4 },
  label: { fontSize: 13, fontWeight: '600', color: colors.muted },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  cell: { flexGrow: 1, flexBasis: 280 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
});
