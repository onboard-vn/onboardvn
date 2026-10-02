import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { colors } from './theme';

export interface NumberFieldProps {
  value: number;
  onChange: (n: number) => void;
  min?: number | null;
  max?: number | null;
  step?: number;
  width?: number;
  prefix?: string;
}

const clamp = (n: number, min?: number | null, max?: number | null): number => {
  let v = n;
  if (min != null) v = Math.max(min, v);
  if (max != null) v = Math.min(max, v);
  return v;
};

export function NumberField({
  value,
  onChange,
  min,
  max,
  step = 1,
  width = 72,
  prefix,
}: NumberFieldProps) {
  const [draft, setDraft] = useState<string | null>(null);

  const commit = (raw: string) => {
    const n = Number(raw.replace(',', '.'));
    setDraft(null);
    if (raw.trim() === '' || !Number.isFinite(n)) return;
    onChange(clamp(n, min, max));
  };

  const bump = (dir: 1 | -1) => {
    setDraft(null);
    onChange(clamp(value + dir * step, min, max));
  };

  return (
    <View style={styles.row}>
      <Pressable
        accessibilityLabel="Giảm"
        accessibilityRole="button"
        onPress={() => bump(-1)}
        disabled={min != null && value <= min}
        style={[styles.btn, min != null && value <= min && styles.off]}
      >
        <Text style={styles.btnText}>−</Text>
      </Pressable>
      <View style={[styles.inputWrap, { width }]}>
        {prefix ? <Text style={styles.prefix}>{prefix}</Text> : null}
        <TextInput
          value={draft ?? String(value)}
          onChangeText={setDraft}
          onBlur={() => draft !== null && commit(draft)}
          onSubmitEditing={() => draft !== null && commit(draft)}
          keyboardType="numbers-and-punctuation"
          selectTextOnFocus
          style={styles.input}
        />
      </View>
      <Pressable
        accessibilityLabel="Tăng"
        accessibilityRole="button"
        onPress={() => bump(1)}
        disabled={max != null && value >= max}
        style={[styles.btn, max != null && value >= max && styles.off]}
      >
        <Text style={styles.btnText}>+</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  btn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  off: { opacity: 0.35 },
  btnText: { fontSize: 22, lineHeight: 24, fontWeight: '700', color: colors.primary },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 38,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#fff',
  },
  prefix: { color: colors.muted, marginLeft: 6 },
  input: {
    flex: 1,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    padding: 0,
    minWidth: 0,
  },
});
