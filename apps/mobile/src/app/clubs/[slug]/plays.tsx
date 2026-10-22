import { getActiveLanguage, t, translateKnown } from '../../../ui/i18n';
import { useAppPreferences } from '../../../ui/preferences';
import type { ClubDetailDto, ClubPlaysResponse } from '@onboard/shared';
import { Stack, useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { ApiError, api } from '../../../api/client';
import { useSession } from '../../../auth/session';
import { playsHistoryApi } from '../../../api/plays-history';
import {
  appendPlayHistoryPage,
  mapClubPlayHistoryItem,
  mapPlayHistoryDetail,
  playHistoryErrorMessage,
  type PlayHistoryDetail,
  type PlayHistoryRow,
} from '../../../history/plays-history-utils';
import { formatVnDateTime } from '../../../features/events/time';
import { Body, Page } from '../../../features/events/ui';
import { Button, Card, Heading, Hint } from '../../../ui/primitives';
import { themeStyles, colors, space } from '../../../ui/theme';

interface ClubPlayHistoryState {
  key: object;
  clubId: string | null;
  items: PlayHistoryRow[];
  detail: PlayHistoryDetail | null;
  nextCursor: string | null;
  loading: boolean;
  loadingMore: boolean;
  error: string | null;
  moreError: string | null;
}

function emptyClubPlayHistoryState(key: object): ClubPlayHistoryState {
  return {
    key,
    clubId: null,
    items: [],
    detail: null,
    nextCursor: null,
    loading: true,
    loadingMore: false,
    error: null,
    moreError: null,
  };
}

function ClubPlayHistory() {
  useAppPreferences();
  const { slug: routeSlug, playId: routePlayId } = useLocalSearchParams<{
    slug: string;
    playId?: string;
  }>();
  const slug = typeof routeSlug === 'string' ? routeSlug : '';
  const playId = typeof routePlayId === 'string' ? routePlayId : undefined;
  const router = useRouter();
  const { user, loading: sessionLoading } = useSession();
  const userId = user?.id ?? null;
  const [reloadKey, setReloadKey] = useState(0);
  const requestKey = useMemo(
    () => ({ slug, playId, reloadKey, userId }),
    [playId, reloadKey, slug, userId],
  );
  const [history, setHistory] = useState(() => emptyClubPlayHistoryState({}));
  const view = history.key === requestKey ? history : emptyClubPlayHistoryState(requestKey);
  const generation = useRef(0);
  const controller = useRef<AbortController | null>(null);
  const loadingMoreRef = useRef(false);

  useEffect(() => {
    if (!userId) return;

    const activeGeneration = ++generation.current;
    const request = new AbortController();
    controller.current = request;
    loadingMoreRef.current = false;

    const load = async () => {
      const club = await api<ClubDetailDto>(`/clubs/${encodeURIComponent(slug)}`, {
        signal: request.signal,
      });
      const resolvedClubId = club.club.id;
      if (!club.myRole || !resolvedClubId) throw new ApiError(404, t('Không tìm thấy'));
      if (playId) {
        const play = await playsHistoryApi.play(playId, { signal: request.signal });
        if (play.status !== 'final' || play.clubId !== resolvedClubId)
          throw new ApiError(404, t('Không tìm thấy'));
        return {
          clubId: resolvedClubId,
          detail: mapPlayHistoryDetail(play),
          items: [],
          nextCursor: null,
        };
      }
      const page: ClubPlaysResponse = await playsHistoryApi.club(resolvedClubId, {
        signal: request.signal,
      });
      return {
        clubId: resolvedClubId,
        detail: null,
        items: page.items.map(mapClubPlayHistoryItem),
        nextCursor: page.nextCursor,
      };
    };

    load()
      .then((result) => {
        if (request.signal.aborted || generation.current !== activeGeneration) return;
        setHistory({ ...emptyClubPlayHistoryState(requestKey), ...result });
      })
      .catch((err: unknown) => {
        if (request.signal.aborted || generation.current !== activeGeneration) return;
        setHistory({
          ...emptyClubPlayHistoryState(requestKey),
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
  }, [playId, requestKey, slug, userId]);

  const loadMore = useCallback(async () => {
    const currentClubId = view.clubId;
    const cursor = view.nextCursor;
    const signal = controller.current?.signal;
    if (!currentClubId || !cursor || !signal || loadingMoreRef.current) return;
    const activeGeneration = generation.current;
    loadingMoreRef.current = true;
    setHistory((current) =>
      current.key === requestKey ? { ...current, loadingMore: true, moreError: null } : current,
    );
    try {
      const page = await playsHistoryApi.club(currentClubId, { cursor, signal });
      if (signal.aborted || generation.current !== activeGeneration) return;
      setHistory((current) =>
        current.key === requestKey
          ? {
              ...current,
              items: appendPlayHistoryPage(current.items, page, mapClubPlayHistoryItem),
              nextCursor: page.nextCursor,
            }
          : current,
      );
    } catch (err) {
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
  }, [requestKey, view.clubId, view.nextCursor]);

  const returnToList = () => router.replace(`/clubs/${encodeURIComponent(slug)}/plays` as Href);

  if (sessionLoading || !user) {
    return (
      <Page>
        <Stack.Screen options={{ title: t('Ván đã chơi') }} />
        {sessionLoading ? (
          <ActivityIndicator style={styles.spinner} />
        ) : (
          <Card>
            <Hint>{t('Cần đăng nhập để xem ván đã chơi.')}</Hint>
          </Card>
        )}
      </Page>
    );
  }

  return (
    <Page>
      <Stack.Screen options={{ title: t('Ván đã chơi') }} />
      <Text accessibilityRole="header" style={styles.title}>
        {playId ? t('Chi tiết ván chơi') : t('Ván đã chơi')}
      </Text>
      {playId ? (
        <Button label={t('Quay lại lịch sử club')} tone="ghost" onPress={returnToList} />
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
                t('{count} người chơi', {
                  count: item.playerCount.toLocaleString(
                    getActiveLanguage() === 'en' ? 'en-US' : 'vi-VN',
                  ),
                }),
              ].join(', ')}
              onPress={() =>
                router.push(
                  `/clubs/${encodeURIComponent(slug)}/plays?playId=${encodeURIComponent(item.id)}` as Href,
                )
              }
              style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
            >
              <Body bold>{item.gameName}</Body>
              <Hint>{formatVnDateTime(item.startedAt)}</Hint>
              <Hint>
                {t('Thắng:')} {item.winners.length ? item.winners.join(', ') : t('Chưa ghi nhận')}
              </Hint>
              <Hint>
                {item.playerCount} {t('người chơi')}
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

export default function ClubPlayHistoryScreen() {
  useAppPreferences();
  return <ClubPlayHistory />;
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
