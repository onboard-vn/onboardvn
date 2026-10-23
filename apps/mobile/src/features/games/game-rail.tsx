import type { GameSummaryDto } from '@onboard/shared';
import { Link } from 'expo-router';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { gameDestination, hasCapability, type Capability } from '../../games/capabilities';
import { themeStyles, colors, radius, space } from '../../ui/theme';
import { mediaUrl } from '../media';
import { summaryMeta } from './filters';
import { t } from '../../ui/i18n';
import { useAppPreferences } from '../../ui/preferences';

export function GameRail({
  games,
  capability = 'all',
}: {
  games: GameSummaryDto[];
  capability?: Capability;
}) {
  const { language } = useAppPreferences();
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      {games.map((g) => {
        const image = mediaUrl(g.imageUrl ?? g.externalThumbUrl);
        const meta = summaryMeta(g);
        const name = language === 'en' ? g.nameEn || g.nameVi || '' : g.nameVi || g.nameEn;
        return (
          <Link key={g.id} href={gameDestination(g.slug, capability)} asChild>
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
                  <Text style={styles.placeholderText}>{name.charAt(0)}</Text>
                </View>
              )}
              <View style={styles.body}>
                <Text style={styles.name} numberOfLines={2}>
                  {name}
                </Text>
                {hasCapability(g.slug, 'scoring') ? (
                  <Text style={styles.meta}>{t('Có tính điểm')}</Text>
                ) : null}
                {hasCapability(g.slug, 'tools') ? (
                  <Text style={styles.meta}>{t('Có công cụ chơi')}</Text>
                ) : null}
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

const styles = themeStyles(() =>
  StyleSheet.create({
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
  }),
);
