import { t, translateKnown } from '../../ui/i18n';
import { useAppPreferences } from '../../ui/preferences';
import type { CafePublicDetailDto, MeetupSummaryDto } from '@onboard/shared';
import { Link, Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { api } from '../../api/client';
import { CafeHeader } from '../../features/cafes/cafe-header';
import { FanpageEmbed } from '../../features/cafes/fanpage-embed';
import { HoursTable } from '../../features/cafes/hours-table';
import { InventoryFilter } from '../../features/cafes/inventory-filter';
import {
  FEE_MODEL_LABELS,
  amenityLines,
  isFacebookFanpageUrl,
  telUrl,
  parseCafeTab,
  type CafeTab,
} from '../../features/cafes/labels';
import { PhotoGallery } from '../../features/cafes/photo-gallery';
import { useFetch } from '../../features/use-fetch';
import { PageShell } from '../../features/static/page-shell';
import { openUrl } from '../../features/static/text';
import { formatDate } from '../../ui/format';
import { Button, Card, Heading, Hint, Segmented } from '../../ui/primitives';
import { themeStyles, colors, space } from '../../ui/theme';

function LinkRow({ cafe }: { cafe: CafePublicDetailDto }) {
  useAppPreferences();
  const links = [
    cafe.links?.phone && {
      label: t('SĐT {phone}', { phone: cafe.links.phone }),
      url: telUrl(cafe.links.phone),
    },
    cafe.links?.fanpage && { label: 'Fanpage', url: cafe.links.fanpage },
    cafe.links?.instagram && { label: 'Instagram', url: cafe.links.instagram },
    cafe.links?.tiktok && { label: 'TikTok', url: cafe.links.tiktok },
    cafe.links?.website && { label: 'Website', url: cafe.links.website },
    cafe.links?.maps && { label: t('Chỉ đường'), url: cafe.links.maps },
  ].filter((l): l is { label: string; url: string } => !!l);
  if (links.length === 0) return null;
  return (
    <View style={styles.stack}>
      <Heading>{t('Liên hệ & mạng xã hội')}</Heading>
      <View style={styles.wrap}>
        {links.map((l) => (
          <Text
            key={l.label}
            accessibilityRole="link"
            style={styles.link}
            onPress={() => openUrl(l.url)}
          >
            {l.label}
          </Text>
        ))}
      </View>
      {isFacebookFanpageUrl(cafe.links?.fanpage) ? (
        <FanpageEmbed fanpageUrl={cafe.links.fanpage} />
      ) : null}
    </View>
  );
}

function AboutTab({ cafe }: { cafe: CafePublicDetailDto }) {
  useAppPreferences();
  const amenities = amenityLines(cafe.amenities);
  return (
    <View style={styles.stack}>
      {amenities.length > 0 ? (
        <Card>
          <Heading>{t('Tiện ích')}</Heading>
          <View style={styles.amenities}>
            {amenities.map((line) => (
              <Text key={line} style={styles.amenity}>
                {line}
              </Text>
            ))}
          </View>
        </Card>
      ) : null}
      {cafe.feeModel ? (
        <Card>
          <Heading>{t('Chi phí')}</Heading>
          <Text style={styles.muted}>
            {t(FEE_MODEL_LABELS[cafe.feeModel])}
            {cafe.feeNote ? ` — ${cafe.feeNote}` : ''}
          </Text>
        </Card>
      ) : null}
      {cafe.openingHours ? (
        <HoursTable hours={cafe.openingHours} openStatus={cafe.openStatus} />
      ) : null}
      <LinkRow cafe={cafe} />
      {!cafe.verified ? (
        <Hint>
          {t('Thông tin quán tổng hợp từ nguồn công khai, chưa được chủ quán xác nhận.')}{' '}
          <Link href="/data-sources" style={styles.link}>
            {t('Nguồn dữ liệu & yêu cầu sửa/gỡ')}
          </Link>
          .
        </Hint>
      ) : null}
    </View>
  );
}

function EventsTab({ cafe }: { cafe: CafePublicDetailDto }) {
  useAppPreferences();
  const load = useCallback(
    (signal: AbortSignal) =>
      api<{ items: MeetupSummaryDto[] }>('/events', { query: { cafeId: cafe.id }, signal }),
    [cafe.id],
  );
  const events = useFetch(load);
  const items = events.data?.items ?? [];
  return (
    <View style={styles.stack}>
      <View style={styles.sectionHead}>
        <Heading>{t('Sự kiện')}</Heading>
        <Link href={{ pathname: '/events/new', params: { cafe: cafe.slug } }} style={styles.link}>
          {t('Tạo kèo tại đây')}
        </Link>
      </View>
      {events.loading ? <ActivityIndicator /> : null}
      {events.error ? <Hint>{translateKnown(events.error ?? '')}</Hint> : null}
      {!events.loading && !events.error && items.length === 0 ? (
        <Hint>{t('Chưa có kèo.')}</Hint>
      ) : null}
      {items.map((m) => (
        <Link key={m.id} href={{ pathname: '/events/[slug]', params: { slug: m.slug } }} asChild>
          <Pressable accessibilityRole="button">
            <Card>
              <Heading>{t(m.title)}</Heading>
              <Hint>{formatDate(m.startsAt)}</Hint>
            </Card>
          </Pressable>
        </Link>
      ))}
    </View>
  );
}

export default function CafeDetail() {
  useAppPreferences();
  const { slug, tab: tabParam } = useLocalSearchParams<{ slug: string; tab?: string }>();
  const router = useRouter();
  const tab = parseCafeTab(tabParam);
  const load = useCallback(
    (signal: AbortSignal) =>
      api<CafePublicDetailDto>(`/cafes/${encodeURIComponent(slug ?? '')}`, { signal }),
    [slug],
  );
  const { data: cafe, loading, error, status: httpStatus, reload } = useFetch(load);

  if (!cafe) {
    return (
      <PageShell>
        <Stack.Screen options={{ title: t('Địa điểm') }} />
        {loading ? (
          <ActivityIndicator />
        ) : httpStatus === 404 ? (
          <Hint>{t('Không tìm thấy địa điểm.')}</Hint>
        ) : (
          <View style={styles.stack}>
            <Hint>{translateKnown(error ?? '')}</Hint>
            <Button label={t('Thử lại')} tone="ghost" onPress={reload} />
          </View>
        )}
      </PageShell>
    );
  }

  return (
    <PageShell maxWidth={768}>
      <Stack.Screen options={{ title: cafe.name }} />
      <CafeHeader cafe={cafe} />
      <Segmented<CafeTab>
        value={tab}
        onChange={(next) => router.setParams({ tab: next === 'about' ? undefined : next })}
        options={[
          { value: 'about', label: t('Giới thiệu') },
          { value: 'games', label: t('Tủ game') },
          { value: 'events', label: t('Sự kiện') },
          { value: 'photos', label: t('Ảnh') },
        ]}
      />
      {tab === 'about' ? <AboutTab cafe={cafe} /> : null}
      {tab === 'games' ? (
        <View style={styles.stack}>
          <View style={styles.sectionHead}>
            <Heading>
              {t('Kho game (')}
              {cafe.inventory.length})
            </Heading>
            <Link
              href={{ pathname: '/cafes/[slug]/contribute', params: { slug: cafe.slug } }}
              style={styles.link}
            >
              {t('Đóng góp game')}
            </Link>
          </View>
          {cafe.inventory.length === 0 ? (
            <Hint>{t('Chưa có game nào trong kho.')}</Hint>
          ) : (
            <InventoryFilter inventory={cafe.inventory} />
          )}
        </View>
      ) : null}
      {tab === 'events' ? <EventsTab cafe={cafe} /> : null}
      {tab === 'photos' ? (
        <View style={styles.stack}>
          <Heading>{t('Ảnh')}</Heading>
          <PhotoGallery photos={cafe.photos} />
        </View>
      ) : null}
    </PageShell>
  );
}

const styles = themeStyles(() =>
  StyleSheet.create({
    stack: { gap: space.md },
    wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: space.lg },
    muted: { color: colors.muted },
    link: { color: colors.primary, textDecorationLine: 'underline', fontWeight: '600' },
    sectionHead: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: space.md,
    },
    amenities: { flexDirection: 'row', flexWrap: 'wrap', columnGap: space.xl, rowGap: 4 },
    amenity: { color: colors.muted, minWidth: 220 },
  }),
);
