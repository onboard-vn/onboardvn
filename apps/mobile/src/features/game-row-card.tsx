import { Link } from 'expo-router';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { gameDestination, hasCapability, type Capability } from '../games/capabilities';
import { Card, Heading } from '../ui/primitives';
import { themeStyles, colors, space } from '../ui/theme';
import type { GameRow } from './games/filters';
import { mediaUrl } from './media';
import { useAppPreferences } from '../ui/preferences';
import { t } from '../ui/i18n';



export function GameRowCard({
  row,
  capability = 'all',
}: {
  row: GameRow;
  capability?: Capability;
}) {
  useAppPreferences();
  const image = mediaUrl(row.imageUrl);
  return (
    <Link href={gameDestination(row.slug, capability)} asChild>
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
                {hasCapability(row.slug, 'any') ? (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>
                      {hasCapability(row.slug, 'scoring') ? t("Có tính điểm") : t("Có công cụ")}
                      {hasCapability(row.slug, 'scoring') && hasCapability(row.slug, 'tools')
                        ? ' · Có công cụ'
                        : ''}
                    </Text>
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

const styles = themeStyles(() => StyleSheet.create({
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
}));
