import type { CafePublicDetailDto } from '@onboard/shared';
import { useRouter } from 'expo-router';
import { Image, Linking, Platform, StyleSheet, Text, View } from 'react-native';
import { Badge, Button } from '../../ui/primitives';
import { colors, radius, space } from '../../ui/theme';
import { mediaUrl } from '../media';
import { VENUE_TYPE_LABELS, mapsUrl, openStatusLabel, zaloUrl } from './labels';

const STATUS_COLOR: Record<string, string> = {
  open: colors.success,
  closing_soon: colors.warn,
};

const open = (url: string) => void Linking.openURL(url);

export function CafeHeader({ cafe }: { cafe: CafePublicDetailDto }) {
  const router = useRouter();
  const cover = mediaUrl(cafe.coverUrl);
  const logo = mediaUrl(cafe.logoUrl);
  const status = openStatusLabel(cafe.openStatus);
  const initial = cafe.name.trim().charAt(0).toUpperCase() || '?';

  return (
    <View style={styles.wrap}>
      <View style={styles.cover}>
        {cover ? (
          <Image
            source={{ uri: cover }}
            style={StyleSheet.absoluteFill}
            resizeMode="cover"
            accessibilityIgnoresInvertColors
          />
        ) : (
          <View style={styles.fallback} accessibilityElementsHidden importantForAccessibility="no">
            <Text style={styles.fallbackName} numberOfLines={2}>
              {cafe.name}
            </Text>
            {Platform.OS === 'web' ? (
              <Image
                source={{ uri: '/brand/hero-illustration.webp' }}
                style={styles.fallbackArt}
                resizeMode="contain"
              />
            ) : null}
          </View>
        )}
      </View>
      <View style={styles.identity}>
        <View style={styles.logo}>
          {logo ? (
            <Image
              source={{ uri: logo }}
              style={StyleSheet.absoluteFill}
              resizeMode="cover"
              accessibilityIgnoresInvertColors
            />
          ) : (
            <Text style={styles.initial}>{initial}</Text>
          )}
        </View>
        <View style={styles.info}>
          <Text accessibilityRole="header" style={styles.title}>
            {cafe.name}
          </Text>
          {cafe.verified ? <Badge label="Đã xác minh" /> : null}
          <Text style={styles.muted}>{VENUE_TYPE_LABELS[cafe.venueType]}</Text>
          <Text style={styles.muted}>
            {cafe.addressLine}, {cafe.wardName}, {cafe.provinceName}
            {cafe.legacyDistrict ? ` (${cafe.legacyDistrict})` : ''}
          </Text>
          {status ? (
            <Text
              style={[
                styles.status,
                { color: STATUS_COLOR[cafe.openStatus?.state ?? ''] ?? colors.muted },
              ]}
            >
              {status}
            </Text>
          ) : null}
        </View>
      </View>
      <View style={styles.actions}>
        <Button label="Chỉ đường" onPress={() => open(mapsUrl(cafe))} />
        {cafe.links?.fanpage ? (
          <Button tone="ghost" label="Fanpage" onPress={() => open(cafe.links!.fanpage!)} />
        ) : null}
        {cafe.links?.zalo ? (
          <Button tone="ghost" label="Nhắn Zalo" onPress={() => open(zaloUrl(cafe.links!.zalo!))} />
        ) : null}
        <Button
          tone="ghost"
          label="Tạo kèo tại đây"
          onPress={() => router.push({ pathname: '/events/new', params: { cafe: cafe.slug } })}
        />
        <Button tone="ghost" label="Xem trên bản đồ" onPress={() => router.push('/map')} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.md },
  cover: {
    height: 176,
    borderRadius: radius,
    overflow: 'hidden',
    backgroundColor: colors.accentSoft,
  },
  fallback: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: space.xl,
    gap: space.md,
  },
  fallbackName: {
    flex: 1,
    fontSize: 24,
    fontWeight: '800',
    color: colors.warn,
    opacity: 0.35,
  },
  fallbackArt: { width: 176, height: 176, marginRight: -12, opacity: 0.9 },
  identity: { flexDirection: 'row', gap: space.md, alignItems: 'flex-start' },
  logo: {
    width: 80,
    height: 80,
    marginTop: -40,
    marginLeft: space.sm,
    borderRadius: 40,
    borderWidth: 4,
    borderColor: colors.bg,
    overflow: 'hidden',
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initial: { fontSize: 28, fontWeight: '800', color: colors.primary },
  info: { flex: 1, gap: 4 },
  title: { fontSize: 22, fontWeight: '700', color: colors.text },
  muted: { color: colors.muted },
  status: { fontWeight: '600' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
});
