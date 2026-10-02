import type { SuggestPoolItemDto } from '@onboard/shared';
import { Image, StyleSheet, Text, View } from 'react-native';
import { Collapsible, Hint } from '../../ui/primitives';
import { colors, space } from '../../ui/theme';
import { mediaUrl } from '../media';
import { gameName } from '../shelf/logic';
import { RARITY, RARITY_ORDER } from './rarity';

export function PoolPreview({ items, total }: { items: SuggestPoolItemDto[]; total: number }) {
  const counts = RARITY_ORDER.map((r) => ({
    rarity: r,
    count: items.filter((i) => i.rarity === r).length,
  }));
  return (
    <Collapsible title={`Trong chồng có gì? (${total} game)`}>
      <View style={styles.counts}>
        {counts.map(({ rarity, count }) => (
          <Text key={rarity} style={styles.count}>
            <Text style={{ color: RARITY[rarity].color }}>■ </Text>
            {RARITY[rarity].label}: {count}
          </Text>
        ))}
      </View>
      {total > items.length ? (
        <Hint>
          Chồng bài lấy ngẫu nhiên {items.length}/{total} game mỗi lần chọn nguồn.
        </Hint>
      ) : null}
      <View style={styles.grid}>
        {items.map((i) => {
          const image = mediaUrl(i.game.imageUrl);
          const color = RARITY[i.rarity].color;
          return image ? (
            <Image
              key={i.game.id}
              source={{ uri: image }}
              accessibilityLabel={gameName(i.game)}
              style={[styles.thumb, { borderColor: color }]}
            />
          ) : (
            <View
              key={i.game.id}
              accessibilityLabel={gameName(i.game)}
              style={[styles.thumb, styles.blank, { borderColor: color, backgroundColor: color }]}
            >
              <Text style={styles.initial}>{gameName(i.game).trim().charAt(0).toUpperCase()}</Text>
            </View>
          );
        })}
      </View>
    </Collapsible>
  );
}

const styles = StyleSheet.create({
  counts: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md },
  count: { fontSize: 13, color: colors.muted },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  thumb: { width: 48, height: 48, borderRadius: 8, borderWidth: 2 },
  blank: { alignItems: 'center', justifyContent: 'center' },
  initial: { color: '#fff', fontWeight: '800' },
});
