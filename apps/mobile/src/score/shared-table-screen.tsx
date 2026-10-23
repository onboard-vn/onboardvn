import { Link, Stack, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  scoreTemplateSchema,
  type GameListResponse,
  type PlayDto,
  type ScoreTemplate,
  type TableCurrentPlayResponse,
} from '@onboard/shared';
import { ApiError, api, session as apiSession } from '../api/client';
import { useSession } from '../auth/session';
import { Button, Card, Heading, Hint } from '../ui/primitives';
import { themeStyles, colors } from '../ui/theme';
import { createHttpPlaysApi } from '../api/plays-http';
import { GuestActions } from './guest-actions';
import { LegacyTableScoreScreen } from './legacy-table-screen';
import { gameGuides } from './registry';
import { usesSharedScoreSheet } from './shared-sheet-selection';
import { SharedScoreSheet } from './shared-score-sheet';
import { scoreFeedbackText, scoreText } from './localization';
import { useAppPreferences } from '../ui/preferences';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function parseTemplate(definition: unknown): ScoreTemplate | null {
  const parsed = scoreTemplateSchema.safeParse(definition);
  return parsed.success ? parsed.data : null;
}

function newId() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (character) => {
    const random = Math.floor(Math.random() * 16);
    return (character === 'x' ? random : (random & 3) | 8).toString(16);
  });
}

function preferCurrentSnapshot(
  previous: TableCurrentPlayResponse | null,
  incoming: TableCurrentPlayResponse,
): TableCurrentPlayResponse {
  if (!previous) return incoming;
  const oldPlay = previous.play;
  const nextPlay = incoming.play;
  if (oldPlay?.status === 'draft' && oldPlay.id !== nextPlay?.id) return previous;
  if (oldPlay && nextPlay && oldPlay.id === nextPlay.id && oldPlay.rev > nextPlay.rev)
    return previous;
  if (previous.table.game && !incoming.table.game) {
    return { ...incoming, table: { ...incoming.table, game: previous.table.game } };
  }
  const samePlay =
    oldPlay === null && nextPlay === null
      ? true
      : !!oldPlay && !!nextPlay && oldPlay.id === nextPlay.id && oldPlay.rev === nextPlay.rev;
  const sameSeats =
    previous.table.seated.length === incoming.table.seated.length &&
    previous.table.seated.every(
      (identity, index) => identity.id === incoming.table.seated[index]?.id,
    );
  const sameTable =
    previous.table.game?.id === incoming.table.game?.id &&
    previous.table.host?.id === incoming.table.host?.id &&
    previous.table.note === incoming.table.note &&
    previous.table.startsAt === incoming.table.startsAt &&
    sameSeats;
  if (
    samePlay &&
    sameTable &&
    previous.canManage === incoming.canManage &&
    previous.editableIdentityIds.join('|') === incoming.editableIdentityIds.join('|')
  ) {
    return previous;
  }
  return incoming;
}

export function isRealTableId(value: string | undefined): value is string {
  return !!value && UUID.test(value);
}

export function SharedTableScreen({ tableId }: { tableId: string }) {
  useAppPreferences();
  const router = useRouter();
  const { user, loading: sessionLoading } = useSession();
  const session = useMemo(
    () => (user ? { user, token: apiSession.token ?? user.id } : null),
    [user],
  );
  const activeScopeKey = `${session?.token ?? ''}:${tableId}`;
  const activeScope = useRef(activeScopeKey);
  useEffect(() => {
    activeScope.current = activeScopeKey;
  }, [activeScopeKey]);
  const appliedScope = useRef<string | null>(null);
  const [loadedScope, setLoadedScope] = useState<string | null>(null);
  const [current, setCurrent] = useState<TableCurrentPlayResponse | null>(null);
  const [loadedToken, setLoadedToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [query, setQuery] = useState('');
  const [games, setGames] = useState<GameListResponse['items']>([]);
  const waitingForPlay =
    !!current && (!current.play || !current.table.game || current.play.status === 'final');
  const templateDefinition = current?.play?.template?.definition ?? current?.template?.definition;
  const templateJson =
    templateDefinition === undefined ? null : (JSON.stringify(templateDefinition) ?? null);
  const template = useMemo(
    () => (templateJson ? parseTemplate(JSON.parse(templateJson) as unknown) : null),
    [templateJson],
  );

  const applySnapshot = useCallback(
    (token: string, targetTableId: string, snapshot: TableCurrentPlayResponse) => {
      const scope = `${token}:${targetTableId}`;
      if (activeScope.current !== scope) return false;
      if (appliedScope.current !== scope) {
        appliedScope.current = scope;
        setCurrent(snapshot);
      } else {
        setCurrent((previous) => preferCurrentSnapshot(previous, snapshot));
      }
      setLoadedToken(token);
      setLoadedScope(scope);
      return true;
    },
    [],
  );

  const loadCurrent = useCallback(async () => {
    if (!session) return;
    const requestToken = session.token;
    const requestTableId = tableId;
    try {
      const snapshot = await api<TableCurrentPlayResponse>(
        `/tables/${requestTableId}/plays/current`,
      );
      applySnapshot(requestToken, requestTableId, snapshot);
    } catch (err) {
      if (activeScope.current === `${requestToken}:${requestTableId}`) {
        setCurrent(null);
        setLoadedToken(requestToken);
        setLoadedScope(`${requestToken}:${requestTableId}`);
        setError(err instanceof ApiError ? err.message : 'Không tải được bàn.');
      }
    } finally {
      if (activeScope.current === `${requestToken}:${requestTableId}`) setLoading(false);
    }
  }, [applySnapshot, session, tableId]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(true);
      void loadCurrent();
    }, 0);
    return () => clearTimeout(timer);
  }, [loadCurrent, refreshKey]);

  useEffect(() => {
    if (!session || !waitingForPlay) return;
    let live = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const controller = new AbortController();
    const poll = async () => {
      try {
        const snapshot = await api<TableCurrentPlayResponse>(`/tables/${tableId}/plays/current`, {
          signal: controller.signal,
        });
        if (!live) return;
        applySnapshot(session.token, tableId, snapshot);
        setError(null);
      } catch (err) {
        if (live)
          setError(err instanceof ApiError ? err.message : 'Không thể kiểm tra trạng thái bàn.');
      } finally {
        if (live) timer = setTimeout(poll, 3000);
      }
    };
    timer = setTimeout(() => void poll(), 2200);
    return () => {
      live = false;
      controller.abort();
      if (timer) clearTimeout(timer);
    };
  }, [applySnapshot, session, tableId, waitingForPlay]);

  useEffect(() => {
    if (!current || current.table.game || !current.canManage || query.trim().length < 2) return;
    let live = true;
    const timer = setTimeout(() => {
      void api<GameListResponse>(`/games?q=${encodeURIComponent(query.trim())}&pageSize=10`)
        .then((response) => live && setGames(response.items))
        .catch(() => live && setGames([]));
    }, 250);
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [current, query]);

  const runAction = async (action: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Không thể cập nhật bàn.');
    } finally {
      setBusy(false);
    }
  };

  const retryLoad = () => {
    setLoading(true);
    setError(null);
    setRefreshKey((n) => n + 1);
  };

  const startPlay = () =>
    runAction(async () => {
      await api<PlayDto>(`/tables/${tableId}/plays`, {
        method: 'POST',
        body: { id: newId() },
      });
      await loadCurrent();
    });

  const chooseGame = (gameId: string) =>
    runAction(async () => {
      if (!current) return;
      await api(`/events/${current.table.meetupId}/tables/${tableId}`, {
        method: 'PATCH',
        body: { gameId },
      });
      setQuery('');
      setGames([]);
      setRefreshKey((value) => value + 1);
    });

  const updatePlay = (play: PlayDto) => {
    setCurrent((existing) => {
      if (!existing) return existing;
      const template = play.template
        ? {
            id: play.template.id,
            gameId: play.game.id,
            version: play.template.version,
            variant: play.template.variant,
            status: 'approved',
            needsReview: play.template.needsReview,
            definition: play.template.definition,
          }
        : null;
      return {
        ...existing,
        play,
        canManage: play.canManage,
        editableIdentityIds: play.editableIdentityIds,
        template: template ?? existing.template,
      };
    });
  };

  const roster = useMemo(() => {
    if (!current?.play || !session) return undefined;
    const adapter = createHttpPlaysApi({
      play: current.play,
      template,
      templateId: current.play.template?.id ?? null,
      myUserId: session.user.id,
      clubId: current.table.clubId,
      tableId,
    }).roster;
    if (!adapter) return undefined;
    return {
      ...adapter,
      async add(id: string) {
        await adapter.add(id);
        await loadCurrent();
      },
      async remove(id: string) {
        await adapter.remove(id);
        await loadCurrent();
      },
    };
  }, [current, session, template, tableId, loadCurrent]);

  if (sessionLoading) return <ActivityIndicator style={{ marginTop: 48 }} />;
  if (!session) {
    return (
      <View style={styles.content}>
        <Card>
          <Heading>{scoreText('Đăng nhập để mở bảng điểm chung')}</Heading>
          <Hint>
            {scoreText('Điểm của mọi người được đồng bộ qua máy chủ và gắn với tài khoản thật.')}
          </Hint>
          <Link href="/club" asChild>
            <Pressable accessibilityRole="button" style={styles.linkButton}>
              <Text style={styles.linkText}>{scoreText('Đăng nhập')}</Text>
            </Pressable>
          </Link>
        </Card>
      </View>
    );
  }

  if (loading || loadedToken !== session.token || loadedScope !== `${session.token}:${tableId}`) {
    return <ActivityIndicator style={{ marginTop: 48 }} />;
  }
  if (!current) {
    return (
      <View style={styles.content}>
        <Card>
          <Text style={styles.error}>{scoreFeedbackText(error ?? 'Không tìm thấy bàn.')}</Text>
          <Button label={scoreText('Thử lại')} tone="ghost" onPress={retryLoad} />
        </Card>
      </View>
    );
  }

  if (current.play && !usesSharedScoreSheet(template, gameGuides))
    return <LegacyTableScoreScreen />;

  const title = current.table.game?.name ?? current.play?.game.name ?? scoreText('Bảng điểm chung');

  return (
    <>
      <Stack.Screen options={{ title }} />
      {error ? (
        <View style={styles.errorBanner}>
          <Text style={styles.error}>{scoreFeedbackText(error)}</Text>
        </View>
      ) : null}
      {!current.table.game ? (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.column}>
            <Card>
              <Heading>{scoreText('Chọn game cho bàn')}</Heading>
              {current.canManage ? (
                <>
                  <TextInput
                    value={query}
                    onChangeText={(value) => {
                      setQuery(value);
                      if (value.trim().length < 2) setGames([]);
                    }}
                    placeholder={scoreText('Tìm game')}
                    style={styles.input}
                  />
                  {games.map((game) => (
                    <Pressable
                      key={game.id}
                      accessibilityRole="button"
                      disabled={busy}
                      onPress={() => void chooseGame(game.id)}
                      style={styles.gameOption}
                    >
                      <Text style={styles.gameName}>{game.nameVi ?? game.nameEn}</Text>
                      <Hint>{game.slug}</Hint>
                    </Pressable>
                  ))}
                </>
              ) : (
                <Hint>{scoreText('Chờ chủ bàn chọn game.')}</Hint>
              )}
            </Card>
          </View>
        </ScrollView>
      ) : !current.play ? (
        <View style={styles.content}>
          <Card>
            <Heading>{current.table.meetupTitle}</Heading>
            <Hint>
              {current.table.game.name} ·{' '}
              {scoreText('{count} người đã xếp bàn', { count: current.table.seated.length })}
            </Hint>
            {current.canManage ? (
              <Button
                label={busy ? scoreText('Đang mở bàn...') : scoreText('Bắt đầu chấm điểm')}
                disabled={busy}
                onPress={() => void startPlay()}
              />
            ) : (
              <Hint>
                {scoreText('Chờ chủ bàn bắt đầu ván; bảng điểm sẽ xuất hiện ở đây cho mọi người.')}
              </Hint>
            )}
          </Card>
        </View>
      ) : !template ? (
        <View style={styles.content}>
          <Card>
            <Heading>{scoreText('Chưa có mẫu chấm điểm')}</Heading>
            <Hint>
              {scoreText('Máy chủ chưa gắn mẫu điểm có thể dùng cho {title}.', { title })}
            </Hint>
            <Button
              label={scoreText('Tải lại')}
              tone="ghost"
              onPress={() => setRefreshKey((n) => n + 1)}
            />
          </Card>
        </View>
      ) : (
        <SharedScoreSheet
          key={`${session.user.id}:${current.play.id}`}
          template={template}
          play={current.play}
          currentUserId={session.user.id}
          onExit={() => router.back()}
          onPlayChange={updatePlay}
          onStartNewPlay={() => void startPlay()}
          roster={roster}
          guestActions={
            current.table.seated.some((identity) => identity.kind === 'guest') ? (
              <Card>
                <Heading>{scoreText('Khách ở bàn')}</Heading>
                {current.table.seated
                  .filter((identity) => identity.kind === 'guest')
                  .map((guest) => (
                    <GuestActions key={guest.id} guest={guest} tableId={tableId} />
                  ))}
              </Card>
            ) : null
          }
        />
      )}
    </>
  );
}

const styles = themeStyles(() =>
  StyleSheet.create({
    content: { padding: 16, alignItems: 'center' },
    column: { width: '100%', maxWidth: 720, gap: 12 },
    input: {
      height: 44,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      paddingHorizontal: 12,
      backgroundColor: colors.card,
      color: colors.text,
    },
    gameOption: { padding: 10, borderTopWidth: 1, borderTopColor: colors.border, gap: 4 },
    gameName: { color: colors.text, fontWeight: '700', fontSize: 15 },
    errorBanner: { padding: 12, backgroundColor: colors.dangerSoft },
    error: { color: colors.danger, fontSize: 14 },
    linkButton: {
      backgroundColor: colors.primary,
      borderRadius: 10,
      paddingVertical: 10,
      alignItems: 'center',
    },
    linkText: { color: '#fff', fontWeight: '700' },
  }),
);
