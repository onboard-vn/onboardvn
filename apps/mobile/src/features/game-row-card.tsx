import { Link } from 'expo-router';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { gameModules } from '../games/modules';
import { Card, Heading } from '../ui/primitives';
import { colors, space } from '../ui/theme';
import type { GameRow } from './games/filters';
import { mediaUrl } from './media';

export function GameRowCard({ row }: { row: GameRow }) {
  const image = mediaUrl(row.imageUrl);
  return (
    <Link href={{ pathname: '/games/[slug]', params: { slug: row.slug } }} asChild>
      <Pressable accessibilityRole="button">
        <Card>
          <View style={styles.top}>
            {image ? (
              <Image
                source={{ uri: image }}
                style={styles.thumb}
                accessibilityIgnoresInvertColors
              />
            ) : null}
            <View style={styles.body}>
              <View style={styles.row}>
                <View style={styles.title}>
                  <Heading>{row.name}</Heading>
                </View>
                {gameModules[row.slug] ? (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>Có công cụ</Text>
                  </View>
                ) : null}
              </View>
              {row.subName ? <Text style={styles.meta}>{row.subName}</Text> : null}
              {row.meta ? <Text style={styles.meta}>{row.meta}</Text> : null}
              {row.categories.length > 0 ? (
                <Text style={styles.cats} numberOfLines={1}>
                  {row.categories.join(' · ')}
                </Text>
              ) : null}
            </View>
          </View>
        </Card>
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', gap: space.md },
  thumb: { width: 64, height: 64, borderRadius: 8, backgroundColor: colors.border },
  body: { flex: 1, gap: space.xs },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.sm,
  },
  title: { flex: 1 },
  meta: { color: colors.muted },
  cats: { color: colors.muted, fontSize: 12 },
  badge: {
    backgroundColor: colors.successSoft,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  badgeText: { color: colors.success, fontSize: 12, fontWeight: '700' },
});
