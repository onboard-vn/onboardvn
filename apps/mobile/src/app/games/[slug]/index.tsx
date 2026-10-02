import type { CafeForGameDto, GameDetailDto } from '@onboard/shared';
import { Link, Stack, useLocalSearchParams } from 'expo-router';
import { useCallback } from 'react';
import {
  ActivityIndicator,
  Image,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { api } from '../../../api/client';
import { apiView, localView, type GameView } from '../../../features/games/filters';
import { mediaUrl } from '../../../features/media';
import { useFetch } from '../../../features/use-fetch';
import { WishlistButton } from '../../../features/wishlist/wishlist-button';
import { getGame } from '../../../games/catalog';
import { gameModules } from '../../../games/modules';
import { scoreTemplates } from '../../../score/templates';
import { Badge, Button, Card, Collapsible, Heading, Hint } from '../../../ui/primitives';
import { colors, space } from '../../../ui/theme';

function MetaGrid({ meta }: { meta: GameView['meta'] }) {
  return (
    <View style={styles.grid}>
      {meta.map((m) => (
        <View key={m.label} style={styles.cell}>
          <Text style={styles.cellLabel}>{m.label}</Text>
          <Text style={styles.cellValue}>{m.value}</Text>
        </View>
      ))}
    </View>
  );
}

function TagRow({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <View style={styles.tags}>
      <Text style={styles.cellLabel}>{title}</Text>
      <View style={styles.chips}>
        {items.map((t) => (
          <View key={t} style={styles.tag}>
            <Text style={styles.tagText}>{t}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function Description({ description }: { description: NonNullable<GameView['description']> }) {
  const body = (
    <>
      <Text style={styles.body}>{description.text}</Text>
      <Hint>{description.note}</Hint>
    </>
  );
  return description.foreign ? (
    <Collapsible title="Mô tả gốc (EN) — bấm để xem">{body}</Collapsible>
  ) : (
    <Card>
      <Heading>Giới thiệu</Heading>
      {body}
    </Card>
  );
}

function PlaceList({ cafes }: { cafes: CafeForGameDto[] }) {
  if (cafes.length === 0) return null;
  return (
    <View style={styles.section}>
      <Heading>Nơi chơi</Heading>
      {cafes.map((c) => (
        <Link key={c.id} href={{ pathname: '/cafes/[slug]', params: { slug: c.slug } }} asChild>
          <Pressable accessibilityRole="button">
            <Card>
              <Heading>{c.name}</Heading>
              <Hint>
                {c.addressLine}, {c.wardName}, {c.provinceName}
              </Hint>
            </Card>
          </Pressable>
        </Link>
      ))}
    </View>
  );
}

export default function GameDetail() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const local = slug ? getGame(slug) : undefined;

  const loadGame = useCallback(
    (signal: AbortSignal) =>
      api<GameDetailDto>(`/games/${encodeURIComponent(slug ?? '')}`, { signal }),
    [slug],
  );
  const loadCafes = useCallback(
    (signal: AbortSignal) =>
      api<CafeForGameDto[]>(`/games/${encodeURIComponent(slug ?? '')}/cafes`, { signal }),
    [slug],
  );
  const detail = useFetch(loadGame);
  const cafes = useFetch(loadCafes);

  const view = detail.data ? apiView(detail.data, local) : local ? localView(local) : null;

  if (!view) {
    return (
      <View style={styles.content}>
        <Stack.Screen options={{ title: 'Game' }} />
        {detail.loading ? <ActivityIndicator /> : <Hint>Không tìm thấy game.</Hint>}
      </View>
    );
  }

  const gameSlug = detail.data?.slug ?? local?.slug ?? slug ?? '';
  const modules = gameModules[gameSlug] ?? [];
  const hasScoreSheet = !!scoreTemplates[gameSlug];
  const image = mediaUrl(view.imageUrl);
  const apiFailed = !detail.data && !detail.loading && detail.status !== 404;

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: view.name }} />
      <View style={styles.column}>
        <Card>
          <Text style={styles.title}>{view.name}</Text>
          {view.subName ? <Text style={styles.meta}>{view.subName}</Text> : null}
          {view.isVietnamese ? <Badge label="Việt hóa" /> : null}
          {view.ownersCount > 0 ? <Hint>{view.ownersCount} người có game này</Hint> : null}
          {image ? (
            <Image
              source={{ uri: image }}
              style={styles.image}
              resizeMode="contain"
              accessibilityIgnoresInvertColors
            />
          ) : null}
          {view.imageCredit ? <Hint>Ảnh: {view.imageCredit}</Hint> : null}
          {detail.data ? (
            <WishlistButton gameId={detail.data.id} nextPath={`/games/${gameSlug}`} />
          ) : null}
          <MetaGrid meta={view.meta} />
          <TagRow title="Thể loại" items={view.categories} />
          <TagRow title="Cơ chế" items={view.mechanics} />
          {apiFailed ? <Hint>{detail.error}. Đang hiển thị thông tin offline.</Hint> : null}
        </Card>

        {modules.length > 0 ? <Heading>Công cụ</Heading> : null}
        {modules.map((m) => (
          <Link key={m.key} href={m.href} asChild>
            <Pressable accessibilityRole="button">
              <Card>
                <Heading>{m.title}</Heading>
                <Text style={styles.meta}>{m.description}</Text>
              </Card>
            </Pressable>
          </Link>
        ))}

        {hasScoreSheet ? (
          <Link href={{ pathname: '/score/[slug]', params: { slug: gameSlug } }} asChild>
            <Pressable accessibilityRole="button">
              <Card>
                <Heading>Tính điểm</Heading>
                <Text style={styles.meta}>Mở bảng điểm cho game này.</Text>
              </Card>
            </Pressable>
          </Link>
        ) : (
          <Card style={styles.disabled}>
            <Heading>Tính điểm</Heading>
            <Hint>Chưa có bảng điểm</Hint>
          </Card>
        )}

        {view.description ? <Description description={view.description} /> : null}
        {view.bggUrl ? (
          <Button
            tone="ghost"
            label="Xem trên BoardGameGeek"
            onPress={() => void Linking.openURL(view.bggUrl as string)}
          />
        ) : null}
        <PlaceList cafes={cafes.data ?? []} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: space.lg, alignItems: 'center' },
  column: { width: '100%', maxWidth: 720, gap: space.md },
  title: { fontSize: 22, fontWeight: '700', color: colors.text },
  meta: { color: colors.muted },
  body: { color: colors.text, lineHeight: 21 },
  disabled: { opacity: 0.5 },
  image: { width: '100%', height: 240, borderRadius: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md },
  cell: { minWidth: 120, gap: 2 },
  cellLabel: { fontSize: 12, color: colors.muted },
  cellValue: { fontSize: 15, fontWeight: '600', color: colors.text },
  tags: { gap: space.xs },
  tag: {
    paddingHorizontal: space.md,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tagText: { color: colors.text, fontSize: 13 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  section: { gap: space.md },
});
