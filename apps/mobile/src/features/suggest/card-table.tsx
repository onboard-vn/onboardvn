import type { SuggestPoolItemDto } from '@onboard/shared';
import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Platform,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { colors } from '../../ui/theme';
import { DECK_SIZE, RARITY_LEVEL, dealPlan, tableLayout } from './deal';
import { PlayCard, newMotion, type CardMotion } from './play-card';
import { RARITY } from './rarity';
import { RarityBurst } from './rarity-burst';
import { playSfx, type SfxName } from './sfx';

const tableHeight = (width: number) => (width > 0 && width < 500 ? 320 : 400);

export type TablePhase = 'dealing' | 'pick' | 'reveal' | 'done';

type MotionKey = Exclude<keyof CardMotion, 'bob'>;

const native = Platform.OS !== 'web';
const EASE = Easing.bezier(0.2, 0.8, 0.2, 1);
const web = Platform.OS === 'web';
const WOOD = web
  ? ({
      backgroundImage: 'radial-gradient(ellipse at 50% 40%, #a8713f 0%, #8a5a32 55%, #6f4626 100%)',
    } as object)
  : null;
const FELT = web
  ? ({
      backgroundImage: `radial-gradient(ellipse at 50% 45%, #1a8a80, ${colors.primary} 70%, #0b5a54)`,
    } as object)
  : null;

export function CardTable({
  run,
  hand,
  idleHint,
  mutedRef,
  onPhase,
  onReveal,
}: {
  /** 0 = empty table; each new value shuffles and deals `hand` again. */
  run: number;
  hand: SuggestPoolItemDto[];
  idleHint: string;
  mutedRef: RefObject<boolean>;
  onPhase: (phase: TablePhase) => void;
  onReveal: (item: SuggestPoolItemDto) => void;
}) {
  const [width, setWidth] = useState(0);
  const [motions] = useState<CardMotion[]>(() => Array.from({ length: DECK_SIZE }, newMotion));
  const [z, setZ] = useState<number[]>(() => motions.map((_, i) => i));
  const [faces, setFaces] = useState<(SuggestPoolItemDto | null)[]>(() => motions.map(() => null));
  const [slots, setSlots] = useState<number[]>([]);
  const [pickable, setPickable] = useState(false);
  const [hint, setHint] = useState('');
  const [burst, setBurst] = useState<{ color: string; level: number } | null>(null);
  const token = useRef(0);
  const reduce = useRef(false);
  const bobs = useRef<Animated.CompositeAnimation[]>([]);
  const height = tableHeight(width);
  const layout = tableLayout(width, height);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(
      (r) => (reduce.current = r),
      () => undefined,
    );
    const runs = token;
    return () => {
      runs.current++;
    };
  }, []);

  const sfx = (name: SfxName, opts?: { gain?: number; rate?: number }) =>
    playSfx(name, { muted: mutedRef.current ?? false, ...opts });

  const wait = useCallback(
    (ms: number, mine: number) =>
      new Promise<boolean>((resolve) =>
        setTimeout(() => resolve(mine === token.current), reduce.current ? 0 : ms),
      ),
    [],
  );

  const move = useCallback(
    (m: CardMotion, to: Partial<Record<MotionKey, number>>, duration = 450) =>
      (Object.entries(to) as [MotionKey, number][]).forEach(([k, v]) =>
        Animated.timing(m[k], {
          toValue: v,
          duration: reduce.current ? 0 : duration,
          easing: EASE,
          useNativeDriver: native,
        }).start(),
      ),
    [],
  );

  const stopBobs = () => {
    bobs.current.forEach((a) => a.stop());
    bobs.current = [];
    motions.forEach((m) => m.bob.setValue(0));
  };

  useEffect(() => {
    if (run === 0 || width === 0 || hand.length === 0) return;
    const mine = ++token.current;
    const L = tableLayout(width, tableHeight(width));
    const setCardZ = (card: number, value: number) =>
      setZ((prev) => prev.map((v, i) => (i === card ? value : v)));

    void (async () => {
      onPhase('dealing');
      stopBobs();
      setPickable(false);
      setBurst(null);
      setSlots([]);
      setFaces(motions.map(() => null));
      setZ(motions.map((_, i) => i));
      motions.forEach((m, i) => {
        m.x.setValue(-i * 0.5);
        m.y.setValue(-i * 1.2);
        m.scale.setValue(1);
        m.tilt.setValue(0);
        m.flip.setValue(0);
        m.opacity.setValue(1);
        m.dim.setValue(1);
      });
      setHint('Đang tráo bài…');
      if (!(await wait(150, mine))) return;

      for (let k = 0; k < 3; k++) {
        motions.forEach((m, i) => {
          const side = i % 2 ? 1 : -1;
          move(m, { x: side * 0.6 * L.cardW + side * i * 2, y: -i });
        });
        sfx('riffle');
        if (!(await wait(380, mine))) return;
        motions.forEach((m, i) => move(m, { x: -i * 0.5, y: -i * 1.2 }));
        sfx('riffle', { gain: 0.6, rate: 1.15 });
        if (!(await wait(220, mine))) return;
      }
      motions.forEach((m, i) =>
        move(m, { x: L.deck.x - i * 0.5, y: L.deck.y - i * 1.2, scale: L.pileScale }),
      );
      if (!(await wait(380, mine))) return;

      const dealt: number[] = [];
      let muck = 0;
      for (const step of dealPlan()) {
        setHint(step.hint);
        const m = motions[step.card]!;
        if (step.to === 'muck') {
          setCardZ(step.card, 30);
          move(m, { x: L.muck.x + muck * 3, y: L.muck.y + muck * 3 });
          muck++;
          sfx('burn', { gain: 0.8 });
          if (!(await wait(330, mine))) return;
          continue;
        }
        const slot = step.to;
        dealt[slot] = step.card;
        setFaces((prev) => prev.map((f, i) => (i === step.card ? hand[slot]! : f)));
        setCardZ(step.card, 40 + slot);
        move(m, { x: L.slotX(slot), y: 0, scale: 1 });
        sfx('deal');
        if (!(await wait(220, mine))) return;
        if (slot >= 2 && !(await wait(slot === 4 ? 200 : 250, mine))) return;
      }
      motions.forEach((m, i) => !dealt.includes(i) && move(m, { opacity: 0 }, 300));

      setSlots(dealt);
      if (!reduce.current) {
        bobs.current = dealt.map((card) =>
          Animated.loop(
            Animated.sequence([
              Animated.delay(Math.random() * 800),
              Animated.timing(motions[card]!.bob, {
                toValue: -5,
                duration: 900,
                easing: Easing.inOut(Easing.sin),
                useNativeDriver: native,
              }),
              Animated.timing(motions[card]!.bob, {
                toValue: 0,
                duration: 900,
                easing: Easing.inOut(Easing.sin),
                useNativeDriver: native,
              }),
            ]),
          ),
        );
        bobs.current.forEach((a) => a.start());
      }
      setPickable(true);
      setHint('Chọn 1 lá bài');
      onPhase('pick');
    })();
    // hand/motions are fixed per run; the sequence must not restart on unrelated renders
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run, width > 0]);

  const choose = async (slot: number) => {
    const card = slots[slot];
    const item = hand[slot];
    if (!pickable || card === undefined || !item) return;
    const mine = token.current;
    onPhase('reveal');
    setPickable(false);
    setHint('');
    stopBobs();
    const chosen = motions[card]!;
    const others = slots.filter((c) => c !== card);
    others.forEach((c) => move(motions[c]!, { dim: 0.45 }, 300));
    setZ((prev) => prev.map((v, i) => (i === card ? 60 : v)));
    move(chosen, { x: 0, y: -20, scale: 1.6 });
    if (!(await wait(380, mine))) return;

    const level = RARITY_LEVEL[item.rarity];
    const suspenseMs = sfx('suspense') * 1000 * 0.9;
    const shakes = 8 + level * 4;
    const step = suspenseMs / shakes;
    for (let i = 0; i < shakes; i++) {
      move(chosen, { scale: 1.6 + i * 0.006, tilt: i % 2 ? 1.5 : -1.5 }, step);
      if (!(await wait(step, mine))) return;
    }
    move(chosen, { scale: 1.7, tilt: 0, flip: 1 });
    sfx('flip');
    if (!(await wait(300, mine))) return;

    setBurst({ color: RARITY[item.rarity].color, level });
    sfx('reveal', { gain: 0.6 + level * 0.1 });
    if (level === 4 && !reduce.current) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(chosen.scale, { toValue: 1.76, duration: 300, useNativeDriver: native }),
          Animated.timing(chosen.scale, { toValue: 1.7, duration: 300, useNativeDriver: native }),
        ]),
        { iterations: 4 },
      ).start();
    }
    if (!(await wait(450, mine))) return;
    others.forEach((c) => move(motions[c]!, { flip: 1 }));
    if (!(await wait(500, mine))) return;
    onPhase('done');
    onReveal(item);
  };

  const shownHint = run === 0 ? idleHint : hint;

  return (
    <View
      style={[styles.table, WOOD, { height }]}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
    >
      <View style={[styles.felt, FELT]} />
      <Text style={[styles.pileLabel, { left: 34 }]}>BỘ BÀI</Text>
      <Text style={[styles.pileLabel, { right: 34 }]}>BÀI HUỶ</Text>
      {burst ? (
        <RarityBurst key={`b${run}`} color={burst.color} level={burst.level} layer="back" />
      ) : null}
      {run > 0 && width > 0
        ? motions.map((m, i) => {
            const slot = slots.indexOf(i);
            return (
              <PlayCard
                key={i}
                motion={m}
                item={faces[i] ?? null}
                width={layout.cardW}
                height={layout.cardH}
                zIndex={z[i] ?? i}
                onPick={pickable && slot >= 0 ? () => void choose(slot) : undefined}
              />
            );
          })
        : null}
      {burst ? (
        <RarityBurst key={`f${run}`} color={burst.color} level={burst.level} layer="front" />
      ) : null}
      <Text style={styles.hint} pointerEvents="none" accessibilityLiveRegion="polite">
        {shownHint}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  table: {
    position: 'relative',
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#8a5a32',
    boxShadow: 'inset 0 0 0 6px #5b391e, inset 0 0 40px rgba(0,0,0,0.35)',
  },
  felt: {
    position: 'absolute',
    top: 24,
    left: 24,
    right: 24,
    bottom: 24,
    borderRadius: 12,
    backgroundColor: colors.primary,
    boxShadow: 'inset 0 0 30px rgba(0,0,0,0.35)',
  },
  pileLabel: {
    position: 'absolute',
    top: 34,
    color: '#e6fffb',
    fontSize: 11,
    fontWeight: '700',
    opacity: 0.8,
  },
  hint: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 38,
    textAlign: 'center',
    color: '#e6fffb',
    fontWeight: '600',
    fontSize: 14,
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    zIndex: 80,
  },
});
