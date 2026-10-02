import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, space } from '../ui/theme';
import { rangeLabel, stepRange, type Bounds, type Range } from './games/filters';

function Stepper({
  caption,
  value,
  onStep,
  disabledDown,
  disabledUp,
}: {
  caption: string;
  value: number;
  onStep: (dir: 1 | -1) => void;
  disabledDown: boolean;
  disabledUp: boolean;
}) {
  return (
    <View style={styles.stepper}>
      <Text style={styles.caption}>{caption}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Giảm ${caption}`}
        disabled={disabledDown}
        onPress={() => onStep(-1)}
        style={[styles.btn, disabledDown && styles.off]}
      >
        <Text style={styles.btnText}>−</Text>
      </Pressable>
      <Text style={styles.value}>{value}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Tăng ${caption}`}
        disabled={disabledUp}
        onPress={() => onStep(1)}
        style={[styles.btn, disabledUp && styles.off]}
      >
        <Text style={styles.btnText}>+</Text>
      </Pressable>
    </View>
  );
}

export function RangeStepper({
  label,
  unit,
  bounds,
  value,
  onChange,
}: {
  label: string;
  unit: string;
  bounds: Bounds;
  value: Range;
  onChange: (next: Range) => void;
}) {
  return (
    <View style={styles.wrap}>
      <View style={styles.head}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.display}>{rangeLabel(value, bounds, unit)}</Text>
      </View>
      <View style={styles.row}>
        <Stepper
          caption="Từ"
          value={value.min}
          onStep={(d) => onChange(stepRange(value, bounds, 'min', d))}
          disabledDown={value.min <= bounds.min}
          disabledUp={value.min >= value.max}
        />
        <Stepper
          caption="Đến"
          value={value.max}
          onStep={(d) => onChange(stepRange(value, bounds, 'max', d))}
          disabledDown={value.max <= value.min}
          disabledUp={value.max >= bounds.max}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.xs },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  label: { fontSize: 13, fontWeight: '600', color: colors.muted },
  display: { fontSize: 13, color: colors.text, fontWeight: '600' },
  row: { flexDirection: 'row', gap: space.lg, flexWrap: 'wrap' },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  caption: { color: colors.muted, width: 32 },
  btn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: { fontSize: 20, color: colors.primary, lineHeight: 22 },
  off: { opacity: 0.35 },
  value: { minWidth: 36, textAlign: 'center', fontWeight: '600', color: colors.text },
});
