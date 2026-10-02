import type { SuggestPoolItemDto } from '@onboard/shared';
import { Animated, Image, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../../ui/theme';
import { mediaUrl } from '../media';
import { gameName } from '../shelf/logic';
import { RARITY } from './rarity';

export interface CardMotion {
  x: Animated.Value;
  y: Animated.Value;
  bob: Animated.Value;
  scale: Animated.Value;
  tilt: Animated.Value;
  flip: Animated.Value;
  opacity: Animated.Value;
  dim: Animated.Value;
}

export const newMotion = (): CardMotion => ({
  x: new Animated.Value(0),
  y: new Animated.Value(0),
  bob: new Animated.Value(0),
  scale: new Animated.Value(1),
  tilt: new Animated.Value(0),
  flip: new Animated.Value(0),
  opacity: new Animated.Value(1),
  dim: new Animated.Value(1),
});

const web = Platform.OS === 'web';
const BACK_PATTERN = web
  ? ({
      backgroundImage: `repeating-linear-gradient(45deg, ${colors.brand} 0 9px, #c8241c 9px 18px)`,
    } as object)
  : null;

export function PlayCard({
  motion,
  item,
  width,
  height,
  zIndex,
  onPick,
}: {
  motion: CardMotion;
  item: SuggestPoolItemDto | null;
  width: number;
  height: number;
  zIndex: number;
  onPick?: () => void;
}) {
  const rarity = item ? RARITY[item.rarity] : null;
  const image = item ? mediaUrl(item.game.imageUrl) : null;
  const backTurn = motion.flip.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] });
  const frontTurn = motion.flip.interpolate({
    inputRange: [0, 1],
    outputRange: ['180deg', '360deg'],
  });
  const rotate = motion.tilt.interpolate({ inputRange: [-1, 1], outputRange: ['-1deg', '1deg'] });

  return (
    <Animated.View
      pointerEvents={onPick ? 'auto' : 'none'}
      style={[
        styles.card,
        {
          width,
          height,
          marginLeft: -width / 2,
          marginTop: -height / 2,
          zIndex,
          opacity: motion.opacity,
          transform: [
            { translateX: motion.x },
            { translateY: Animated.add(motion.y, motion.bob) },
            { scale: motion.scale },
            { rotate },
          ],
        },
      ]}
    >
      <Animated.View style={[styles.fill, { opacity: motion.dim }]}>
        <Animated.View
          style={[
            styles.face,
            styles.back,
            BACK_PATTERN,
            { transform: [{ perspective: 1000 }, { rotateY: backTurn }] },
          ]}
        >
          <Text style={[styles.logo, { fontSize: Math.max(8, width * 0.095) }]} numberOfLines={1}>
            {width < 70 ? 'OB' : 'OnBoardVN'}
          </Text>
        </Animated.View>
        {item && rarity ? (
          <Animated.View
            style={[
              styles.face,
              styles.front,
              { borderColor: rarity.color },
              { transform: [{ perspective: 1000 }, { rotateY: frontTurn }] },
            ]}
          >
            {image ? (
              <Image
                source={{ uri: image }}
                style={[styles.art, { backgroundColor: rarity.color }]}
                accessibilityIgnoresInvertColors
              />
            ) : (
              <View style={[styles.art, styles.placeholder, { backgroundColor: rarity.color }]}>
                <Text style={[styles.initial, { fontSize: width * 0.4 }]}>
                  {gameName(item.game).trim().charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
            <View style={{ padding: width * 0.05, gap: 1 }}>
              <Text
                style={[styles.name, { fontSize: Math.max(8, width * 0.105) }]}
                numberOfLines={2}
              >
                {gameName(item.game)}
              </Text>
              <Text
                style={[
                  styles.rarity,
                  { color: rarity.color, fontSize: Math.max(7, width * 0.085) },
                ]}
              >
                {rarity.label}
              </Text>
            </View>
          </Animated.View>
        ) : null}
      </Animated.View>
      {onPick ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Lật lá bài này"
          onPress={onPick}
          style={styles.fill}
        />
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: { position: 'absolute', left: '50%', top: '50%' },
  fill: { ...StyleSheet.absoluteFill, borderRadius: 10 },
  face: {
    ...StyleSheet.absoluteFill,
    borderRadius: 10,
    overflow: 'hidden',
    backfaceVisibility: 'hidden',
  },
  back: {
    backgroundColor: colors.brand,
    borderWidth: 3,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 6px 14px rgba(0,0,0,0.35)',
  },
  logo: {
    backgroundColor: '#fff',
    color: colors.brand,
    borderRadius: 999,
    paddingHorizontal: 6,
    paddingVertical: 3,
    fontWeight: '800',
    overflow: 'hidden',
  },
  front: { backgroundColor: '#fff', borderWidth: 4 },
  art: { width: '100%', aspectRatio: 1 },
  placeholder: { alignItems: 'center', justifyContent: 'center' },
  initial: { fontWeight: '800', color: '#fff' },
  name: { fontWeight: '800', color: colors.text },
  rarity: { fontWeight: '700', textTransform: 'uppercase' },
});
