import type {
  ClubListResponse,
  ProvinceListResponse,
  SuggestPoolItemDto,
  SuggestPoolResponse,
} from '@onboard/shared';
import { Link, Stack } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { api } from '../api/client';
import { useSession } from '../auth/session';
import { errorMessage } from '../features/errors';
import { CafePicker } from '../features/events/cafe-picker';
import { readStored, writeStored } from '../features/shelf/local-storage';
import { CardTable, type TablePhase } from '../features/suggest/card-table';
import { pickHand } from '../features/suggest/deal';
import { PoolPreview } from '../features/suggest/pool-preview';
import { RARITY, RARITY_ORDER } from '../features/suggest/rarity';
import { ResultSheet } from '../features/suggest/result-sheet';
import { preloadSfx } from '../features/suggest/sfx';
import {
  PLAYER_OPTIONS,
  SOURCES,
  buildSuggestQuery,
  initialChoice,
  parseSavedChoice,
  poolLabel,
  type Source,
  type SuggestChoice,
} from '../features/suggest/sources';
import { DEFAULT_PROVINCE_CODE, locateProvinceCode } from '../features/location/nearest-province';
import { TypeAhead } from '../features/type-ahead';
import { useFetch } from '../features/use-fetch';
import { Card, Chip, Hint } from '../ui/primitives';
import { colors, radius, space } from '../ui/theme';

const MUTED_KEY = 'onboard.suggest.muted';
const CHOICE_KEY = 'onboard.suggest.choice';

type Pool =
  | { kind: 'none' }
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; items: SuggestPoolItemDto[]; total: number };

type Fetched =
  { key: string; items: SuggestPoolItemDto[]; total: number } | { key: string; error: string };

const loadProvinces = (signal: AbortSignal) =>
  api<ProvinceListResponse>('/locations/provinces', { signal });

const loadMyClubs = (signal: AbortSignal) => api<ClubListResponse>('/clubs', { signal });

function ClubChoice({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (club: SuggestChoice['club']) => void;
}) {
  const clubs = useFetch(loadMyClubs);
  if (clubs.loading) return <Hint>Đang tải club của bạn…</Hint>;
  if (clubs.error) return <Hint>{clubs.error}</Hint>;
  const items = clubs.data?.items ?? [];
  if (items.length === 0) {
    return (
      <Link href="/clubs" style={styles.link}>
        Bạn chưa tham gia club nào · xem các club
      </Link>
    );
  }
  return (
    <View style={styles.chips}>
      {items.map((c) => (
        <Chip
          key={c.id}
          label={c.name}
          selected={value === c.id}
          onPress={() => onChange({ id: c.id, slug: c.slug, name: c.name })}
        />
      ))}
    </View>
  );
}

function Step({ children }: { children: string }) {
  return <Text style={styles.step}>{children}</Text>;
}

export default function SuggestScreen() {
  const { user, loading: sessionLoading } = useSession();
  const provinces = useFetch(loadProvinces);
  const provinceList = useMemo(() => provinces.data?.items ?? [], [provinces.data]);
  const [choice, setChoice] = useState<SuggestChoice>(
    () => parseSavedChoice(readStored(CHOICE_KEY)) ?? initialChoice(),
  );
  const [provinceText, setProvinceText] = useState(() => choice.province?.name ?? '');
  const [locating, setLocating] = useState(false);
  const locatedRef = useRef(false);
  const [fetched, setFetched] = useState<Fetched | null>(null);
  const [run, setRun] = useState(0);
  const [hand, setHand] = useState<SuggestPoolItemDto[]>([]);
  const [phase, setPhase] = useState<TablePhase | null>(null);
  const [result, setResult] = useState<SuggestPoolItemDto | null>(null);
  const [muted, setMuted] = useState(() => readStored(MUTED_KEY) === '1');
  const mutedRef = useRef(muted);

  useEffect(() => {
    void preloadSfx();
  }, []);

  const needsLogin = !user && SOURCES.some((s) => s.value === choice.source && s.needsLogin);
  const query = needsLogin ? null : buildSuggestQuery(choice);
  const queryKey = query ? JSON.stringify(query) : null;

  useEffect(() => {
    if (!queryKey) return;
    const ctrl = new AbortController();
    api<SuggestPoolResponse>('/suggest', { query: JSON.parse(queryKey), signal: ctrl.signal }).then(
      (r) => !ctrl.signal.aborted && setFetched({ key: queryKey, items: r.items, total: r.total }),
      (e: unknown) =>
        !ctrl.signal.aborted &&
        setFetched({
          key: queryKey,
          error: errorMessage(e, 'Không xem được chồng bài, thử lại sau'),
        }),
    );
    return () => ctrl.abort();
  }, [queryKey]);

  const pool: Pool = !queryKey
    ? { kind: 'none' }
    : fetched?.key !== queryKey
      ? { kind: 'loading' }
      : 'error' in fetched
        ? { kind: 'error', message: fetched.error }
        : { kind: 'ready', items: fetched.items, total: fetched.total };

  const patch = (next: Partial<SuggestChoice>) => {
    setRun(0);
    setPhase(null);
    setResult(null);
    const merged = { ...choice, ...next };
    setChoice(merged);
    writeStored(CHOICE_KEY, JSON.stringify(merged));
  };
  const pickSource = (source: Source) => {
    if (source !== choice.source) patch({ source });
  };

  const needsHome =
    choice.source === 'city' && !choice.province && provinceList.length > 0 && !sessionLoading;
  useEffect(() => {
    if (!needsHome || locatedRef.current) return;
    locatedRef.current = true;
    setLocating(true);
    void (user?.provinceCode ? Promise.resolve(user.provinceCode) : locateProvinceCode())
      .then((code) => {
        const home =
          provinceList.find((p) => p.code === code) ??
          provinceList.find((p) => p.code === DEFAULT_PROVINCE_CODE);
        if (!home) return;
        setProvinceText(home.name);
        setChoice((c) =>
          c.source === 'city' && !c.province
            ? { ...c, province: { code: home.code, name: home.name } }
            : c,
        );
      })
      .finally(() => setLocating(false));
  }, [needsHome, provinceList, user?.provinceCode]);

  const items = useMemo(
    () => (fetched && fetched.key === queryKey && 'items' in fetched ? fetched.items : []),
    [fetched, queryKey],
  );
  const busy = phase === 'dealing' || phase === 'reveal';
  const canDeal = items.length > 0 && !busy;

  const deal = useCallback(() => {
    if (items.length === 0) return;
    setResult(null);
    setHand(pickHand(items));
    setRun((r) => r + 1);
  }, [items]);

  const toggleMute = () => {
    const next = !muted;
    mutedRef.current = next;
    setMuted(next);
    writeStored(MUTED_KEY, next ? '1' : '0');
  };

  const idleHint = !choice.source
    ? 'Chọn nguồn ở bước 1 trước'
    : locating
      ? 'Đang tìm thành phố của bạn…'
      : items.length > 0
        ? 'Bấm TRÁO BÀI'
        : '';

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Stack.Screen options={{ title: 'Hôm nay chơi gì?' }} />
      <View style={styles.column}>
        <View>
          <Text style={styles.title}>Hôm nay chơi gì?</Text>
          <Hint>Chọn nguồn game, tráo bài rồi rút 1 lá để may mắn quyết định.</Hint>
        </View>

        <Card>
          <Step>Bước 1 · Rút từ đâu?</Step>
          <View style={styles.chips}>
            {SOURCES.map((s) => (
              <Chip
                key={s.value}
                label={s.label}
                selected={choice.source === s.value}
                onPress={() => pickSource(s.value)}
              />
            ))}
          </View>

          {choice.source === 'cafe' ? (
            choice.cafe ? (
              <View style={styles.picked}>
                <Text style={styles.pickedName}>{choice.cafe.name}</Text>
                <Pressable accessibilityRole="button" onPress={() => patch({ cafe: null })}>
                  <Text style={styles.link}>Đổi quán</Text>
                </Pressable>
              </View>
            ) : provinces.error ? (
              <Hint>{provinces.error}</Hint>
            ) : (
              <CafePicker
                provinces={provinceList}
                onPick={(c) => patch({ cafe: { id: c.id, slug: c.slug, name: c.name } })}
              />
            )
          ) : null}
          {choice.source === 'club' && user ? (
            <ClubChoice value={choice.club?.id ?? null} onChange={(club) => patch({ club })} />
          ) : null}
          {choice.source === 'city' ? (
            provinces.error ? (
              <Hint>{provinces.error}</Hint>
            ) : (
              <TypeAhead
                label="Thành phố / tỉnh"
                placeholder="Gõ để tìm tỉnh/thành..."
                options={provinceList.map((p) => ({ id: p.code, label: p.name }))}
                text={provinceText}
                onTextChange={setProvinceText}
                onSelect={(code) => {
                  const p = provinceList.find((x) => x.code === code);
                  patch({ province: p ? { code: p.code, name: p.name } : null });
                }}
              />
            )
          ) : null}

          <View style={styles.playersRow}>
            <Text style={styles.label}>Số người</Text>
            <View style={styles.chips}>
              {PLAYER_OPTIONS.map((o) => (
                <Chip
                  key={o.label}
                  label={o.label}
                  selected={choice.players === o.value}
                  onPress={() => patch({ players: o.value })}
                />
              ))}
            </View>
          </View>

          {needsLogin ? (
            <Link href={{ pathname: '/login', params: { next: '/suggest' } }} style={styles.link}>
              Đăng nhập để rút từ nguồn này
            </Link>
          ) : pool.kind === 'none' ? (
            <Hint>
              {choice.source ? 'Chọn tiếp ở trên để xem chồng bài.' : 'Chọn nguồn để bắt đầu.'}
            </Hint>
          ) : pool.kind === 'loading' ? (
            <Hint>Đang xem chồng bài…</Hint>
          ) : pool.kind === 'error' ? (
            <Text style={styles.error}>{pool.message}</Text>
          ) : pool.total === 0 ? (
            <Hint>Không có game nào khớp, thử đổi nguồn hoặc số người nhé.</Hint>
          ) : (
            <Hint>{poolLabel(choice, pool.total)}</Hint>
          )}
          {pool.kind === 'ready' && pool.items.length > 0 ? (
            <PoolPreview items={pool.items} total={pool.total} />
          ) : null}
        </Card>

        <CardTable
          run={run}
          hand={hand}
          idleHint={idleHint}
          mutedRef={mutedRef}
          onPhase={setPhase}
          onReveal={setResult}
        />

        <View style={styles.actions}>
          <Pressable
            accessibilityRole="button"
            disabled={!canDeal}
            onPress={deal}
            style={[styles.go, !canDeal && styles.goDisabled]}
          >
            <Text style={styles.goText}>{run === 0 ? 'TRÁO BÀI' : 'TRÁO LẠI'}</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={muted ? 'Bật tiếng' : 'Tắt tiếng'}
            accessibilityState={{ checked: muted }}
            onPress={toggleMute}
            style={styles.mute}
          >
            <Text style={styles.muteText}>{muted ? '🔇' : '🔊'}</Text>
          </Pressable>
        </View>
        <View style={styles.legend}>
          {RARITY_ORDER.map((r) => (
            <Text key={r} style={styles.legendItem}>
              <Text style={{ color: RARITY[r].color }}>■ </Text>
              {RARITY[r].label}
            </Text>
          ))}
        </View>
        <Hint>Độ hiếm theo số quán có game · âm thanh: Kenney (CC0) + Pixabay.</Hint>
      </View>

      <ResultSheet item={result} choice={choice} onClose={() => setResult(null)} onAgain={deal} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: space.lg, alignItems: 'center' },
  column: { width: '100%', maxWidth: 960, gap: 14 },
  title: { fontSize: 26, fontWeight: '800', color: colors.text },
  step: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, flexShrink: 1 },
  playersRow: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, alignItems: 'center' },
  label: { fontSize: 13, fontWeight: '600', color: colors.muted, width: 72 },
  picked: { flexDirection: 'row', gap: space.md, alignItems: 'center', flexWrap: 'wrap' },
  pickedName: { fontWeight: '700', color: colors.text },
  link: { color: colors.primary, fontWeight: '600' },
  error: { color: colors.danger },
  actions: { flexDirection: 'row', gap: 10 },
  go: {
    flex: 1,
    backgroundColor: colors.accent,
    borderRadius: radius,
    paddingVertical: 14,
    alignItems: 'center',
    boxShadow: '0 4px 0 #c28d10',
  },
  goDisabled: { opacity: 0.5 },
  goText: { color: colors.text, fontSize: 18, fontWeight: '800', letterSpacing: 1 },
  mute: {
    width: 52,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    borderRadius: radius,
    alignItems: 'center',
    justifyContent: 'center',
  },
  muteText: { fontSize: 20 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  legendItem: { fontSize: 12, color: colors.muted },
});
