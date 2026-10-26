import { StyleSheet, Text, View } from 'react-native';
import { NumberField } from '../../ui/number-field';
import { Hint } from '../../ui/primitives';
import { colors, themeStyles } from '../../ui/theme';
import { wholeCounter } from './applejack-harmonies-counters';

export function LandscapeCounter({
  label,
  hint,
  value,
  min = 0,
  disabled,
  onChange,
}: {
  label: string;
  hint?: string;
  value: number;
  min?: number;
  disabled: boolean;
  onChange: (value: number) => void;
}) {
  return (
    <View style={styles.counter} accessibilityLabel={label}>
      <View style={styles.label}>
        <Text style={styles.text}>{label}</Text>
        {hint ? <Hint>{hint}</Hint> : null}
      </View>
      <NumberField
        value={value}
        min={min}
        width={44}
        disabled={disabled}
        onChange={(next) => onChange(wholeCounter(next, min))}
      />
    </View>
  );
}

export function LandscapeSubtotal({ label, points }: { label: string; points: number }) {
  return (
    <View style={styles.subtotal}>
      <Text style={styles.title}>{label}</Text>
      <Text style={styles.points}>{points} VP</Text>
    </View>
  );
}

const styles = themeStyles(() =>
  StyleSheet.create({
    counter: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    label: { flex: 1, minWidth: 0, gap: 2 },
    text: { fontSize: 14, fontWeight: '600', color: colors.text },
    subtotal: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
    },
    title: { flex: 1, fontSize: 15, fontWeight: '700', color: colors.text },
    points: { fontSize: 15, fontWeight: '700', color: colors.primary },
  }),
);
