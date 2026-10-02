import { useEffect, useState } from 'react';
import { Animated, Easing, Platform, StyleSheet, View } from 'react-native';

const native = Platform.OS !== 'web';
const RAY_COUNT = 12;

interface Spark {
  dx: number;
  dy: number;
  duration: number;
  delay: number;
  progress: Animated.Value;
}

/** Back layer: spinning rays (epic up). Front layer: glow (rare up) and sparks (legendary up). */
export function RarityBurst({
  color,
  level,
  layer,
}: {
  color: string;
  level: number;
  layer: 'back' | 'front';
}) {
  const [glow] = useState(() => new Animated.Value(0));
  const [spin] = useState(() => new Animated.Value(0));
  const [sparks] = useState<Spark[]>(() =>
    layer === 'front' && level >= 3
      ? Array.from({ length: 18 + level * 6 }, () => {
          const angle = Math.random() * Math.PI * 2;
          const dist = 90 + Math.random() * 150;
          return {
            dx: Math.cos(angle) * dist,
            dy: Math.sin(angle) * dist,
            duration: 800 + Math.random() * 800,
            delay: Math.random() * 300,
            progress: new Animated.Value(0),
          };
        })
      : [],
  );

  useEffect(() => {
    const anims: Animated.CompositeAnimation[] = [];
    if (layer === 'front' && level >= 1) {
      anims.push(
        Animated.timing(glow, {
          toValue: 1,
          duration: 1200 + level * 300,
          easing: Easing.out(Easing.quad),
          useNativeDriver: native,
        }),
      );
    }
    if (layer === 'back' && level >= 2) {
      anims.push(
        Animated.loop(
          Animated.timing(spin, {
            toValue: 1,
            duration: (8 - level) * 1000,
            easing: Easing.linear,
            useNativeDriver: native,
          }),
        ),
      );
    }
    for (const s of sparks) {
      anims.push(
        Animated.timing(s.progress, {
          toValue: 1,
          duration: s.duration,
          delay: s.delay,
          easing: Easing.out(Easing.quad),
          useNativeDriver: native,
        }),
      );
    }
    anims.forEach((a) => a.start());
    return () => anims.forEach((a) => a.stop());
  }, [glow, spin, sparks, level, layer]);

  if (level < (layer === 'back' ? 2 : 1)) return null;
  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const rayGradient =
    Platform.OS === 'web'
      ? ({ backgroundImage: `linear-gradient(${color}, transparent)` } as object)
      : { backgroundColor: color, opacity: 0.5 };

  return (
    <View pointerEvents="none" style={[styles.center, { zIndex: layer === 'back' ? 5 : 70 }]}>
      {layer === 'back' ? (
        <Animated.View style={[styles.origin, styles.rays, { transform: [{ rotate }] }]}>
          {Array.from({ length: RAY_COUNT }, (_, i) => (
            <View
              key={i}
              style={[styles.origin, { transform: [{ rotate: `${(i * 360) / RAY_COUNT}deg` }] }]}
            >
              <View style={[styles.ray, rayGradient]} />
            </View>
          ))}
        </Animated.View>
      ) : (
        <Animated.View
          style={[
            styles.glow,
            {
              boxShadow: `0 0 ${60 + level * 40}px ${30 + level * 25}px ${color}`,
              backgroundColor: color,
              opacity: glow.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0, 1, 0] }),
              transform: [
                { scale: glow.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1.6] }) },
              ],
            },
          ]}
        />
      )}
      {sparks.map((s, i) => (
        <Animated.View
          key={i}
          style={[
            styles.spark,
            {
              backgroundColor: color,
              opacity: s.progress.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }),
              transform: [
                {
                  translateX: s.progress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, s.dx],
                  }),
                },
                {
                  translateY: s.progress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, s.dy],
                  }),
                },
                { scale: s.progress.interpolate({ inputRange: [0, 1], outputRange: [1, 0.2] }) },
              ],
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { position: 'absolute', left: '50%', top: '44%', width: 0, height: 0 },
  origin: { position: 'absolute', left: 0, top: 0, width: 0, height: 0 },
  rays: { opacity: 0.85 },
  ray: { position: 'absolute', left: -3, top: -190, width: 6, height: 150, borderRadius: 3 },
  glow: { position: 'absolute', left: -5, top: -5, width: 10, height: 10, borderRadius: 5 },
  spark: { position: 'absolute', left: -4, top: -4, width: 8, height: 8, borderRadius: 4 },
});
