import type { GameListResponse, MeetupListResponse } from '@onboard/shared';
import { Link, Stack, useRouter, type Href } from 'expo-router';
import {
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { api } from '../api/client';
import { useSession } from '../auth/session';
import { GameRail } from '../features/games/game-rail';
import { formatVnDateTime } from '../features/events/time';
import { PageShell } from '../features/static/page-shell';
import { SITE_NAME, SITE_SLOGAN } from '../features/static/site';
import { Button, Card, Hint } from '../ui/primitives';
import { colors, radius, space } from '../ui/theme';
import { useLoad } from '../ui/use-load';

const SHORTCUTS: { href: Href; title: string; body: string; tint: string; mark: string }[] = [
  {
    href: '/map',
    title: 'Địa điểm chơi',
    body: 'Bản đồ quán, tủ game và giờ mở cửa.',
    tint: colors.primarySoft,
    mark: 'Q',
  },
  {
    href: '/games',
    title: 'Game',
    body: 'Tra luật, số người, thời gian, độ khó.',
    tint: colors.accentSoft,
    mark: 'G',
  },
  {
    href: '/events',
    title: 'Kèo',
    body: 'Tìm người chơi cùng tối nay.',
    tint: colors.dangerSoft,
    mark: 'K',
  },
  {
    href: '/clubs',
    title: 'Club',
    body: 'Kèo riêng, bàn chơi và tính điểm.',
    tint: colors.surfaceMuted,
    mark: 'C',
  },
];

function Section({
  title,
  action,
  children,
}: {
  title: string;
  action?: { href: Href; label: string };
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHead}>
        <Text accessibilityRole="header" style={styles.sectionTitle}>
          {title}
        </Text>
        {action ? (
          <Link href={action.href} style={styles.sectionLink}>
            {action.label}
          </Link>
        ) : null}
      </View>
      {children}
    </View>
  );
}

function UpcomingEvents() {
  const events = useLoad(
    () => api<MeetupListResponse>('/events', { query: { pageSize: 3 } }).then((r) => r.items),
    [],
  );
  if (events.loading) return <Hint>Đang tải Kèo…</Hint>;
  if (!events.data?.length) {
    return (
      <Card>
        <Text style={styles.cardTitle}>Chưa có Kèo công khai sắp tới</Text>
        <Hint>Hãy là người đầu tiên rủ mọi người chơi.</Hint>
        <Link href="/events/new" style={styles.inlineLink}>
          Tạo Kèo mới
        </Link>
      </Card>
    );
  }
  return (
    <View style={styles.list}>
      {events.data.map((e) => (
        <Link key={e.id} href={{ pathname: '/events/[slug]', params: { slug: e.slug } }} asChild>
          <Pressable accessibilityRole="link" style={styles.eventRow}>
            <View style={styles.eventDate}>
              <Text style={styles.eventDateText}>{formatVnDateTime(e.startsAt)}</Text>
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={styles.cardTitle} numberOfLines={1}>
                {e.title}
              </Text>
              <Text style={styles.meta} numberOfLines={1}>
                {e.locationLabel} · {e.goingCount} người đi
              </Text>
            </View>
          </Pressable>
        </Link>
      ))}
    </View>
  );
}

function GameSection({ title, query }: { title: string; query: Record<string, string | number> }) {
  const games = useLoad(
    () =>
      api<GameListResponse>('/games', { query: { pageSize: 10, ...query } }).then((r) => r.items),
    [query],
  );
  if (!games.data?.length) return null;
  return (
    <Section title={title} action={{ href: '/games', label: 'Tất cả game' }}>
      <GameRail games={games.data} />
    </Section>
  );
}

const BEGINNER_QUERY = { maxWeight: 2, maxTime: 60 };
const VIETNAMESE_QUERY = { isVietnamese: 'true' };
const POPULAR_QUERY = { sort: 'cafes' };

export default function Home() {
  const router = useRouter();
  const { user } = useSession();
  const { width } = useWindowDimensions();
  const wide = width >= 768;

  return (
    <PageShell maxWidth={1024}>
      <Stack.Screen options={{ title: SITE_NAME }} />
      <View style={[styles.hero, wide && styles.heroWide]}>
        <View style={[styles.copy, wide && styles.half]}>
          <View style={styles.eyebrow}>
            <Text style={styles.eyebrowText}>Cộng đồng board game Việt Nam</Text>
          </View>
          <Text accessibilityRole="header" style={[styles.title, wide && styles.titleWide]}>
            {SITE_SLOGAN}
          </Text>
          <Text style={styles.lead}>
            Danh bạ quán board game, kho game theo từng quán và cộng đồng người chơi trên khắp Việt
            Nam.
          </Text>
          <View style={styles.actions}>
            <Button label="Tìm quán gần bạn" onPress={() => router.push('/map')} />
            <Button label="Tìm Kèo cùng chơi" tone="ghost" onPress={() => router.push('/events')} />
          </View>
          {!user ? (
            <Text style={styles.meta}>
              Mới đến?{' '}
              <Link href="/signup" style={styles.inlineLink}>
                Tạo tài khoản miễn phí
              </Link>
            </Text>
          ) : null}
        </View>
        {Platform.OS === 'web' ? (
          <View style={[styles.imageWrap, wide && styles.half]}>
            <Image
              source={{ uri: '/brand/hero-illustration.webp' }}
              style={[styles.image, !wide && styles.imageNarrow]}
              resizeMode="contain"
              accessibilityLabel="Bốn meeple quây quanh bàn chơi board game với ghim bản đồ"
            />
          </View>
        ) : null}
      </View>

      <Section title="Bắt đầu từ đâu?">
        <View style={styles.grid}>
          {SHORTCUTS.map((s) => (
            <Link key={s.title} href={s.href} asChild>
              <Pressable
                accessibilityRole="link"
                style={StyleSheet.flatten([styles.tile, wide && styles.tileWide])}
              >
                <View style={[styles.mark, { backgroundColor: s.tint }]}>
                  <Text style={styles.markText}>{s.mark}</Text>
                </View>
                <Text style={styles.cardTitle}>{s.title}</Text>
                <Text style={styles.meta}>{s.body}</Text>
              </Pressable>
            </Link>
          ))}
        </View>
      </Section>

      <GameSection title="Dành cho người mới" query={BEGINNER_QUERY} />
      <GameSection title="Thuần Việt / Việt hoá" query={VIETNAMESE_QUERY} />
      <GameSection title="Nhiều quán có nhất" query={POPULAR_QUERY} />

      <Section title="Kèo sắp tới" action={{ href: '/events', label: 'Xem tất cả' }}>
        <UpcomingEvents />
      </Section>

      <Section title="Công cụ cho bàn chơi">
        <Link
          href={{ pathname: '/games/[slug]/missions', params: { slug: 'the-gang-2024' } }}
          asChild
        >
          <Pressable accessibilityRole="link" style={styles.tool}>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={styles.toolEyebrow}>The Gang</Text>
              <Text style={styles.toolTitle}>Rút thẻ nhiệm vụ Thử thách & Chuyên gia</Text>
              <Text style={styles.toolBody}>
                Không cần đăng nhập · Tiếng Việt / English · Hoàn tác được
              </Text>
            </View>
            <Text style={styles.toolArrow}>→</Text>
          </Pressable>
        </Link>
      </Section>
    </PageShell>
  );
}

const styles = StyleSheet.create({
  hero: { gap: space.xl, paddingTop: space.md, paddingBottom: space.lg },
  heroWide: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: space.xxl,
    gap: space.xxl,
  },
  half: { flex: 1 },
  copy: { gap: space.lg },
  eyebrow: {
    alignSelf: 'flex-start',
    backgroundColor: colors.accentSoft,
    borderRadius: 999,
    paddingHorizontal: space.md,
    paddingVertical: 6,
  },
  eyebrowText: { color: colors.warn, fontWeight: '600', fontSize: 13 },
  title: { fontSize: 30, lineHeight: 38, fontWeight: '800', color: colors.text },
  titleWide: { fontSize: 44, lineHeight: 52 },
  lead: { fontSize: 17, lineHeight: 27, color: colors.muted, maxWidth: 520 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md },
  imageWrap: { alignItems: 'center' },
  image: { width: '100%', maxWidth: 440, aspectRatio: 1 },
  imageNarrow: { maxWidth: 300 },
  section: { gap: space.md, paddingTop: space.lg },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: space.md,
  },
  sectionTitle: { fontSize: 22, fontWeight: '700', color: colors.text },
  sectionLink: { color: colors.primary, fontWeight: '600', fontSize: 15 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md },
  tile: {
    flexBasis: '46%',
    flexGrow: 1,
    backgroundColor: colors.card,
    borderRadius: radius,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space.lg,
    gap: space.sm,
    minHeight: 132,
  },
  tileWide: { flexBasis: '22%' },
  mark: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  markText: { fontWeight: '800', fontSize: 18, color: colors.text },
  cardTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  meta: { fontSize: 14, lineHeight: 20, color: colors.muted },
  inlineLink: { color: colors.primary, fontWeight: '600', textDecorationLine: 'underline' },
  list: { gap: space.sm },
  eventRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    backgroundColor: colors.card,
    borderRadius: radius,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space.md,
    minHeight: 64,
  },
  eventDate: {
    backgroundColor: colors.primarySoft,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    maxWidth: 140,
  },
  eventDateText: { color: colors.primary, fontWeight: '700', fontSize: 13 },
  tool: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.lg,
    backgroundColor: colors.text,
    borderRadius: radius,
    padding: space.xl,
  },
  toolEyebrow: {
    color: colors.accent,
    fontWeight: '700',
    fontSize: 13,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  toolTitle: { color: '#fff', fontWeight: '700', fontSize: 18, lineHeight: 24 },
  toolBody: { color: '#d6d3d1', fontSize: 14 },
  toolArrow: { color: colors.accent, fontSize: 28, fontWeight: '700' },
});
