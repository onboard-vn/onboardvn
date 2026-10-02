import type { WishlistItemDto, WishlistListResponse } from '@onboard/shared';
import { Link, Stack } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { api } from '../api/client';
import { RequireLogin } from '../auth/require-login';
import { errorMessage } from '../features/errors';
import { gameName } from '../features/shelf/logic';
import { useFetch } from '../features/use-fetch';
import { Button, Card, Hint } from '../ui/primitives';
import { colors, space } from '../ui/theme';

const load = (signal: AbortSignal) => api<WishlistListResponse>('/me/wishlist', { signal });

function Row({ item, onRemove }: { item: WishlistItemDto; onRemove: () => void }) {
  const g = item.game;
  return (
    <Card>
      <View style={styles.row}>
        <View style={styles.info}>
          <Link href={{ pathname: '/games/[slug]', params: { slug: g.slug } }} style={styles.name}>
            {gameName(g)}
          </Link>
          {g.nameVi && g.nameVi !== g.nameEn ? <Hint>{g.nameEn}</Hint> : null}
        </View>
        <Button label="Gỡ" tone="ghost" onPress={onRemove} />
      </View>
    </Card>
  );
}

function WishlistManager() {
  const list = useFetch(load);
  const { setData } = list;
  const [error, setError] = useState<string | null>(null);

  const remove = async (gameId: string) => {
    setError(null);
    try {
      await api(`/me/wishlist/${encodeURIComponent(gameId)}`, { method: 'DELETE' });
      setData((prev) => ({ items: prev.items.filter((i) => i.game.id !== gameId) }));
    } catch (e) {
      setError(errorMessage(e, 'Không gỡ được, thử lại sau'));
    }
  };

  return (
    <View style={styles.stack}>
      <View style={styles.titleRow}>
        <Text style={styles.title}>Muốn chơi</Text>
        <View style={styles.links}>
          <Link href="/shelf" style={styles.link}>
            Tủ game của tôi
          </Link>
          <Link href="/suggest" style={styles.link}>
            Hôm nay chơi gì?
          </Link>
        </View>
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {list.loading && !list.data ? <ActivityIndicator /> : null}
      {list.error ? (
        <View style={styles.stack}>
          <Text style={styles.error}>{list.error}</Text>
          <Button label="Thử lại" tone="ghost" onPress={list.reload} />
        </View>
      ) : null}
      {list.data && list.data.items.length === 0 ? (
        <Hint>Chưa có game nào. Bấm nút Muốn chơi ở trang chi tiết game để thêm.</Hint>
      ) : null}
      {(list.data?.items ?? []).map((item) => (
        <Row key={item.game.id} item={item} onRemove={() => void remove(item.game.id)} />
      ))}
    </View>
  );
}

export default function WishlistScreen() {
  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: 'Muốn chơi' }} />
      <View style={styles.column}>
        <RequireLogin reason="Đăng nhập để xem danh sách Muốn chơi.">
          <WishlistManager />
        </RequireLogin>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: space.lg, alignItems: 'center' },
  column: { width: '100%', maxWidth: 720 },
  stack: { gap: space.md },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: space.sm,
  },
  links: { flexDirection: 'row', gap: space.lg },
  title: { fontSize: 22, fontWeight: '700', color: colors.text },
  link: { color: colors.primary, fontWeight: '600' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.sm,
  },
  info: { flex: 1, gap: 2 },
  name: { fontSize: 16, fontWeight: '600', color: colors.text },
  error: { color: colors.danger },
});
