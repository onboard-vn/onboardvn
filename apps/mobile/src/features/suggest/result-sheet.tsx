import type { CafeForGameDto, CafePublicDetailDto, SuggestPoolItemDto } from '@onboard/shared';
import { Link, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  Image,
  Linking,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { api } from '../../api/client';
import { colors, space } from '../../ui/theme';
import { summaryMeta } from '../games/filters';
import { mediaUrl } from '../media';
import { gameName } from '../shelf/logic';
import { useFetch } from '../use-fetch';
import { WishlistButton } from '../wishlist/wishlist-button';
import { RARITY } from './rarity';
import { cafeContacts } from './cafe-contacts';
import { actionGroup, eventParams, whoHasIt, type SuggestChoice } from './sources';

const DESKTOP_MIN_WIDTH = 700;

export function ResultSheet({
  item,
  choice,
  onClose,
  onAgain,
}: {
  item: SuggestPoolItemDto | null;
  choice: SuggestChoice;
  onClose: () => void;
  onAgain: () => void;
}) {
  const { width } = useWindowDimensions();
  const desktop = width >= DESKTOP_MIN_WIDTH;
  return (
    <Modal
      visible={item !== null}
      transparent
      animationType={desktop ? 'fade' : 'slide'}
      onRequestClose={onClose}
    >
      <Pressable
        accessibilityLabel="Đóng"
        style={[styles.scrim, desktop ? styles.scrimCenter : styles.scrimBottom]}
        onPress={onClose}
      >
        {item ? (
          <Pressable
            accessibilityRole="none"
            accessibilityLabel="Kết quả rút thẻ"
            onPress={() => undefined}
            style={[
              styles.sheet,
              desktop ? styles.sheetDesktop : styles.sheetMobile,
              { borderTopColor: RARITY[item.rarity].color },
            ]}
          >
            <SheetBody item={item} choice={choice} onClose={onClose} onAgain={onAgain} />
          </Pressable>
        ) : null}
      </Pressable>
    </Modal>
  );
}

function SheetBody({
  item,
  choice,
  onClose,
  onAgain,
}: {
  item: SuggestPoolItemDto;
  choice: SuggestChoice;
  onClose: () => void;
  onAgain: () => void;
}) {
  const router = useRouter();
  const { game } = item;
  const rarity = RARITY[item.rarity];
  const image = mediaUrl(game.imageUrl);
  const group = actionGroup(choice.source);
  const [showCafes, setShowCafes] = useState(group === 'area');
  const cafeSlug = group === 'cafe' ? (choice.cafe?.slug ?? null) : null;
  const loadCafes = useCallback(
    (signal: AbortSignal) =>
      api<CafeForGameDto[]>(`/games/${encodeURIComponent(game.slug)}/cafes`, { signal }),
    [game.slug],
  );
  const loadCafe = useCallback(
    (signal: AbortSignal) =>
      cafeSlug
        ? api<CafePublicDetailDto>(`/cafes/${encodeURIComponent(cafeSlug)}`, { signal })
        : Promise.resolve(null),
    [cafeSlug],
  );
  const cafes = useFetch(loadCafes);
  const cafe = useFetch(loadCafe);
  const inProvince = choice.source === 'city' || choice.source === 'province';
  const nearby = (cafes.data ?? [])
    .filter((c) => !inProvince || c.provinceName === choice.province?.name)
    .slice(0, 5);
  const go = (to: () => void) => {
    onClose();
    to();
  };
  const toEvent = () =>
    go(() => router.push({ pathname: '/events/new', params: eventParams(choice, game.slug) }));
  const toGame = () =>
    go(() => router.push({ pathname: '/games/[slug]', params: { slug: game.slug } }));

  const cta =
    group === 'cafe'
      ? { label: 'Tạo Kèo tại quán này', onPress: toEvent }
      : group === 'personal'
        ? { label: 'Rủ chơi · Tạo Kèo', onPress: toEvent }
        : { label: 'Xem quán & người có game', onPress: toGame };

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Đóng"
        onPress={onClose}
        style={styles.close}
      >
        <Text style={styles.closeText}>✕</Text>
      </Pressable>
      <View style={styles.hero}>
        <View
          style={[
            styles.cover,
            {
              borderColor: rarity.color,
              backgroundColor: rarity.color,
              boxShadow: `0 0 24px ${rarity.color}`,
            },
          ]}
        >
          {image ? (
            <Image
              source={{ uri: image }}
              style={styles.coverImage}
              accessibilityIgnoresInvertColors
            />
          ) : null}
        </View>
        <View style={styles.heroText}>
          <Text style={[styles.badge, { backgroundColor: rarity.color }]}>{rarity.label}</Text>
          <Text style={styles.title}>{gameName(game)}</Text>
          <Text style={styles.sub}>{summaryMeta(game) || 'Chưa có thông tin chi tiết'}</Text>
        </View>
      </View>

      <View style={styles.who}>
        <Text style={styles.whoText}>{whoHasIt(choice, item)}</Text>
        {showCafes && cafes.loading ? <Text style={styles.sub}>Đang tải quán...</Text> : null}
        {showCafes && !cafes.loading && nearby.length === 0 ? (
          <Text style={styles.sub}>Chưa có quán nào ghi nhận game này.</Text>
        ) : null}
        {showCafes
          ? nearby.map((c) => (
              <Link
                key={c.id}
                href={{ pathname: '/cafes/[slug]', params: { slug: c.slug } }}
                onPress={onClose}
                style={styles.cafe}
              >
                {c.name} — {c.wardName}, {c.provinceName}
              </Link>
            ))
          : null}
      </View>

      <Pressable accessibilityRole="button" onPress={cta.onPress} style={styles.cta}>
        <Text style={styles.ctaText}>{cta.label}</Text>
      </Pressable>
      <View style={styles.grid}>
        {group === 'cafe'
          ? cafeContacts(cafe.data?.links).map((c) => (
              <SecondaryButton
                key={c.label}
                label={c.label}
                onPress={() => void Linking.openURL(c.url)}
              />
            ))
          : null}
        {group === 'personal' ? (
          <SecondaryButton
            label={showCafes ? 'Ẩn quán có game' : 'Quán có game này'}
            onPress={() => setShowCafes((v) => !v)}
          />
        ) : null}
        {group === 'area' ? (
          <SecondaryButton label="Tạo Kèo" onPress={toEvent} />
        ) : (
          <SecondaryButton label="Xem game" onPress={toGame} />
        )}
        <View style={styles.secondaryWrap}>
          <WishlistButton gameId={game.id} nextPath="/suggest" />
        </View>
      </View>
      <Pressable accessibilityRole="button" onPress={onAgain} style={styles.again}>
        <Text style={styles.againText}>TRÁO LẠI</Text>
      </Pressable>
      <Text style={[styles.sub, { textAlign: 'center' }]}>
        Đóng khung này để xem 4 lá bạn đã bỏ qua.
      </Text>
    </>
  );
}

function SecondaryButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.secondary}>
      <Text style={styles.secondaryText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  scrim: { flex: 1, backgroundColor: 'rgba(28,25,23,0.55)', cursor: 'auto' },
  scrimBottom: { justifyContent: 'flex-end', alignItems: 'center' },
  scrimCenter: { justifyContent: 'center', alignItems: 'center', padding: space.lg },
  sheet: {
    width: '100%',
    maxWidth: 560,
    backgroundColor: colors.card,
    padding: space.lg,
    paddingTop: 18,
    gap: space.md,
    borderTopWidth: 6,
    boxShadow: '0 -10px 30px rgba(0,0,0,0.25)',
    cursor: 'auto',
  },
  sheetMobile: { borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: space.xl },
  sheetDesktop: { borderRadius: 20 },
  close: {
    position: 'absolute',
    right: 10,
    top: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  closeText: { fontSize: 18, color: colors.text },
  hero: { flexDirection: 'row', gap: 14, alignItems: 'center', paddingRight: 40 },
  cover: { width: 104, height: 104, borderRadius: 12, borderWidth: 4, overflow: 'hidden' },
  coverImage: { width: '100%', height: '100%' },
  heroText: { flex: 1, gap: 4, alignItems: 'flex-start' },
  badge: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    overflow: 'hidden',
    textTransform: 'uppercase',
  },
  title: { fontSize: 22, fontWeight: '800', color: colors.text },
  sub: { fontSize: 13, color: colors.muted },
  who: { backgroundColor: colors.surfaceMuted, borderRadius: 10, padding: space.md, gap: 4 },
  whoText: { fontSize: 14, color: colors.text },
  cafe: { color: colors.primary, fontWeight: '600', fontSize: 14 },
  cta: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    boxShadow: '0 4px 0 #0b5a54',
  },
  ctaText: { color: '#fff', fontWeight: '800', fontSize: 17 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  secondary: {
    flexGrow: 1,
    flexBasis: 130,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 12,
    padding: space.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryWrap: { flexGrow: 1, flexBasis: 130, alignItems: 'center', justifyContent: 'center' },
  secondaryText: { color: colors.primary, fontWeight: '700' },
  again: {
    backgroundColor: colors.accent,
    borderRadius: 12,
    padding: space.md,
    alignItems: 'center',
    boxShadow: '0 3px 0 #c28d10',
  },
  againText: { color: colors.text, fontWeight: '800' },
});
