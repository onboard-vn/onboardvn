import type { ShelfItemDto } from '@onboard/shared';
import { Link } from 'expo-router';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, space } from '../../ui/theme';
import { mediaUrl } from '../media';
import { gameName } from './logic';
import { StaleDot } from './shelf-row';

export function ShelfGrid({ items, now }: { items: ShelfItemDto[]; now: number }) {
  return (
    <View style={styles.grid}>
      {items.map((item) => {
        const image = mediaUrl(item.game.imageUrl);
        return (
          <Link
            key={item.game.id}
            href={{ pathname: '/games/[slug]', params: { slug: item.game.slug } }}
            asChild
          >
            <Pressable accessibilityRole="button" style={StyleSheet.flatten([styles.tile])}>
              {image ? (
                <Image
                  source={{ uri: image }}
                  style={styles.cover}
                  resizeMode="cover"
                  accessibilityIgnoresInvertColors
                />
              ) : (
                <View style={styles.cover} />
              )}
              <View style={styles.info}>
                <Text style={styles.name} numberOfLines={2}>
                  {gameName(item.game)}
                </Text>
                <StaleDot lastPlayedAt={item.lastPlayedAt} now={now} />
              </View>
            </Pressable>
          </Link>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md },
  tile: {
    flexGrow: 1,
    flexBasis: 150,
    maxWidth: 220,
    backgroundColor: colors.card,
    borderRadius: radius,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  cover: { width: '100%', aspectRatio: 1, backgroundColor: colors.surfaceMuted },
  info: { padding: space.sm, gap: space.xs },
  name: { fontSize: 14, fontWeight: '600', color: colors.text },
});
