import { getActiveLanguage, t, translateKnown } from '../ui/i18n';
import { useAppPreferences } from '../ui/preferences';
import { Stack, useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { ApiError } from '../api/client';
import { playsHistoryApi } from '../api/plays-history';
import { RequireLogin } from '../auth/require-login';
import { useSession } from '../auth/session';
import {
  appendPlayHistoryPage,
  mapMyPlayHistoryItem,
  mapPlayHistoryDetail,
  playHistoryErrorMessage,
  type PlayHistoryDetail,
  type PlayHistoryRow,
} from '../history/plays-history-utils';
import { formatVnDateTime } from '../features/events/time';
import { Body, Page } from '../features/events/ui';
import { Button, Card, Heading, Hint } from '../ui/primitives';
import { themeStyles, colors, space } from '../ui/theme';

interface MyPlayHistoryState {
  key: string;
  items: PlayHistoryRow[];
  detail: PlayHistoryDetail | null;
  nextCursor: string | null;
  loading: boolean;
  loadingMore: boolean;
  error: string | null;
  moreError: string | null;
}

function emptyMyPlayHistoryState(key: string): MyPlayHistoryState {
  return {
    key,
    items: [],
    detail: null,
    nextCursor: null,
    loading: true,
    loadingMore: false,
    error: null,
    moreError: null,
  };
}

function MyPlayHistory() {
  useAppPreferences();
  const params = useLocalSearchParams<{ playId?: string }>();
  const playId = typeof params.playId === 'string' ? params.playId : undefined;
  const router = useRouter();
  const { user } = useSession();
  const [history, setHistory] = useState(() => emptyMyPlayHistoryState(''));
  const [reloadKey, setReloadKey] = useState(0);
  const requestKey = JSON.stringify([user?.id ?? null, playId ?? null, reloadKey]);
  const view = history.key === requestKey ? history : emptyMyPlayHistoryState(requestKey);
  const generation = useRef(0);
  const controller = useRef<AbortController | null>(null);
  const loadingMoreRef = useRef(false);

  useEffect(() => {
    const activeGeneration = ++generation.current;
    const request = new AbortController();
    controller.current = request;
    loadingMoreRef.current = false;

    const load = playId
      ? playsHistoryApi.play(playId, { signal: request.signal }).then((play) => {
          if (play.status !== 'final') throw new ApiError(404, t('Không tìm thấy'));
          return { detail: mapPlayHistoryDetail(play), items: [], nextCursor: null };
        })
      : playsHistoryApi.mine({ signal: request.signal }).then((page) => {
          return {
            detail: null,
            items: page.items.map(mapMyPlayHistoryItem),
            nextCursor: page.nextCursor,
          };
        });

    load
      .then((result) => {
        if (request.signal.aborted || generation.current !== activeGeneration) return;
        setHistory({ ...emptyMyPlayHistoryState(requestKey), ...result });
      })
      .catch((err: unknown) => {
        if (request.signal.aborted || generation.current !== activeGeneration) return;
        setHistory({
          ...emptyMyPlayHistoryState(requestKey),
          error: playHistoryErrorMessage(err),
        });
      })
      .finally(() => {
        if (request.signal.aborted || generation.current !== activeGeneration) return;
        setHistory((current) =>
          current.key === requestKey ? { ...current, loading: false } : current,
        );
      });

    return () => {
      request.abort();
      if (controller.current === request) controller.current = null;
    };
  }, [playId, requestKey]);

  const loadMore = useCallback(async () => {
    const cursor = view.nextCursor;
    const signal = controller.current?.signal;
    if (!cursor || !signal || loadingMoreRef.current) return;
    const activeGeneration = generation.current;
    loadingMoreRef.current = true;
    setHistory((current) =>
      current.key === requestKey ? { ...current, loadingMore: true, moreError: null } : current,
    );
    try {
      const page = await playsHistoryApi.mine({ cursor, signal });
      if (signal.aborted || generation.current !== activeGeneration) return;
      setHistory((current) =>
        current.key === requestKey
          ? {
              ...current,
              items: appendPlayHistoryPage(current.items, page, mapMyPlayHistoryItem),
              nextCursor: page.nextCursor,
            }
          : current,
      );
    } catch (err: unknown) {
      if (!signal.aborted && generation.current === activeGeneration)
        setHistory((current) =>
          current.key === requestKey
            ? { ...current, moreError: playHistoryErrorMessage(err) }
            : current,
        );
    } finally {
      if (!signal.aborted && generation.current === activeGeneration) {
        loadingMoreRef.current = false;
        setHistory((current) =>
          current.key === requestKey ? { ...current, loadingMore: false } : current,
        );
      }
    }
  }, [requestKey, view.nextCursor]);

  const returnToList = () => router.replace('/history' as Href);

  return (
    <Page>
      <Stack.Screen options={{ title: playId ? t('Chi tiết ván chơi') : t('Lịch sử của tôi') }} />
      <Text accessibilityRole="header" style={styles.title}>
        {playId ? t('Chi tiết ván chơi') : t('Lịch sử của tôi')}
      </Text>
      {playId ? (
        <Button label={t('Quay lại lịch sử')} tone="ghost" onPress={returnToList} />
      ) : (
        <Hint>{t('Các ván đã chốt, mới nhất trước.')}</Hint>
      )}

      {view.loading ? <ActivityIndicator style={styles.spinner} /> : null}
      {!view.loading && view.error ? (
        <Card>
          <Hint>{translateKnown(view.error ?? '')}</Hint>
          <Button
            label={t('Thử lại')}
            tone="ghost"
            onPress={() => setReloadKey((value) => value + 1)}
          />
        </Card>
      ) : null}
      {!view.loading && !view.error && view.detail ? (
        <HistoryPlayDetail detail={view.detail} />
      ) : null}
      {!view.loading && !view.error && !playId && view.items.length === 0 ? (
        <Card>
          <Hint>{t('Chưa có ván nào được chốt.')}</Hint>
        </Card>
      ) : null}
      {!view.loading && !view.error && !playId
        ? view.items.map((item) => (
            <Pressable
              key={item.id}
              accessibilityRole="link"
              accessibilityLabel={[
                t('Mở ván {game}', { game: item.gameName }),
                formatVnDateTime(item.startedAt),
                t('Thắng: {winners}', {
                  winners: item.winners.length ? item.winners.join(', ') : t('Chưa ghi nhận'),
                }),
                t('Điểm của bạn: {score}', {
                  score:
                    item.myTotal === null
                      ? t('Chưa có')
                      : item.myTotal.toLocaleString(
                          getActiveLanguage() === 'en' ? 'en-US' : 'vi-VN',
                        ),
                }),
              ].join(', ')}
              onPress={() => router.push(`/history?playId=${encodeURIComponent(item.id)}` as Href)}
              style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
            >
              <Body bold>{item.gameName}</Body>
              <Hint>{formatVnDateTime(item.startedAt)}</Hint>
              <Hint>
                {t('Thắng:')} {item.winners.length ? item.winners.join(', ') : t('Chưa ghi nhận')}
              </Hint>
              <Hint>
                {t('Điểm của bạn:')}{' '}
                {item.myTotal === null
                  ? t('Chưa có')
                  : item.myTotal.toLocaleString(getActiveLanguage() === 'en' ? 'en-US' : 'vi-VN')}
              </Hint>
            </Pressable>
          ))
        : null}
      {!view.loading && !view.error && !playId && view.nextCursor ? (
        <View style={styles.more}>
          {view.moreError ? <Hint>{view.moreError}</Hint> : null}
          <Button
            label={
              view.loadingMore ? t('Đang tải…') : view.moreError ? t('Thử lại') : t('Xem thêm')
            }
            tone="ghost"
            disabled={view.loadingMore}
            onPress={() => void loadMore()}
          />
        </View>
      ) : null}
    </Page>
  );
}

function HistoryPlayDetail({ detail }: { detail: PlayHistoryDetail }) {
  useAppPreferences();
  return (
    <Card>
      <Heading>{detail.gameName}</Heading>
      <Hint>{formatVnDateTime(detail.startedAt)}</Hint>
      <View style={styles.players}>
        {detail.players.map((player, index) => (
          <View key={`${index}-${player.displayName}`} style={styles.playerRow}>
            <Text style={styles.playerName} numberOfLines={1}>
              {player.displayName}
              {player.isWinner ? ' 🏆' : ''}
            </Text>
            <Text style={styles.total}>
              {player.total === null
                ? '—'
                : player.total.toLocaleString(getActiveLanguage() === 'en' ? 'en-US' : 'vi-VN')}
            </Text>
          </View>
        ))}
      </View>
    </Card>
  );
}

export default function MyPlayHistoryScreen() {
  useAppPreferences();
  return (
    <RequireLogin reason={t('Đăng nhập để xem lịch sử chơi.')}>
      <MyPlayHistory />
    </RequireLogin>
  );
}

const styles = themeStyles(() =>
  StyleSheet.create({
    title: { color: colors.text, fontSize: 24, fontWeight: '700' },
    spinner: { marginVertical: space.lg },
    row: {
      width: '100%',
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      backgroundColor: colors.card,
      padding: space.md,
      gap: 4,
    },
    rowPressed: { opacity: 0.7 },
    more: { alignItems: 'center', gap: space.xs },
    players: { gap: space.sm, marginTop: space.sm },
    playerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: space.md,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      paddingTop: space.sm,
    },
    playerName: { color: colors.text, flex: 1, fontWeight: '600' },
    total: { color: colors.primary, fontSize: 18, fontWeight: '700' },
  }),
);
