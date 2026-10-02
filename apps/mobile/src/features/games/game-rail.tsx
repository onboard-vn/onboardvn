import type { GameSummaryDto } from '@onboard/shared';
import { Link } from 'expo-router';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, radius, space } from '../../ui/theme';
import { mediaUrl } from '../media';
import { summaryMeta } from './filters';

export function GameRail({ games }: { games: GameSummaryDto[] }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      {games.map((g) => {
        const image = mediaUrl(g.imageUrl ?? g.externalThumbUrl);
        const meta = summaryMeta(g);
        return (
          <Link key={g.id} href={{ pathname: '/games/[slug]', params: { slug: g.slug } }} asChild>
            <Pressable accessibilityRole="link" style={styles.card}>
              {image ? (
                <Image
                  source={{ uri: image }}
                  style={styles.cover}
                  resizeMode="cover"
                  accessibilityIgnoresInvertColors
                />
              ) : (
                <View style={[styles.cover, styles.placeholder]}>
                  <Text style={styles.placeholderText}>{(g.nameVi || g.nameEn).charAt(0)}</Text>
                </View>
              )}
              <View style={styles.body}>
                <Text style={styles.name} numberOfLines={2}>
                  {g.nameVi || g.nameEn}
                </Text>
                {meta ? (
                  <Text style={styles.meta} numberOfLines={2}>
                    {meta}
                  </Text>
                ) : null}
              </View>
            </Pressable>
          </Link>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { gap: space.md, paddingBottom: space.xs },
  card: {
    width: 148,
    backgroundColor: colors.card,
    borderRadius: radius,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  cover: { width: '100%', height: 112, backgroundColor: colors.surfaceMuted },
  placeholder: { alignItems: 'center', justifyContent: 'center' },
  placeholderText: { fontSize: 36, fontWeight: '800', color: colors.muted },
  body: { padding: space.sm, gap: 2 },
  name: { fontSize: 15, lineHeight: 20, fontWeight: '700', color: colors.text },
  meta: { fontSize: 13, lineHeight: 18, color: colors.muted },
});
