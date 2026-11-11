import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { themeStyles, colors } from './theme';
import { t } from './i18n';
import { useAppPreferences } from './preferences';

export interface NumberFieldProps {
  value: number;
  onChange: (n: number) => void;
  min?: number | null;
  max?: number | null;
  step?: number;
  width?: number;
  prefix?: string;
  disabled?: boolean;
  wholeNumbers?: boolean;
  accessibilityLabel?: string;
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
  disabled = false,
  wholeNumbers = false,
  accessibilityLabel,
}: NumberFieldProps) {
  useAppPreferences();
  const [draft, setDraft] = useState<string | null>(null);

  const validWhole = (raw: string) => {
    const next = Number(raw);
    return /^\d+$/.test(raw) && Number.isSafeInteger(next) && next === clamp(next, min, max);
  };
  const invalidDraft = wholeNumbers && draft !== null && draft !== '' && !validWhole(draft);

  const commit = (raw: string) => {
    setDraft(null);
    if (wholeNumbers) return;
    const n = Number(raw.replace(',', '.'));
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
        accessibilityLabel={t('Giảm')}
        accessibilityRole="button"
        onPress={() => bump(-1)}
        disabled={disabled || (min != null && value <= min)}
        style={[
          styles.btn,
          wholeNumbers && styles.largeButton,
          (disabled || (min != null && value <= min)) && styles.off,
        ]}
      >
        <Text style={styles.btnText}>−</Text>
      </Pressable>
      <View style={[styles.inputWrap, invalidDraft && styles.invalid, { width }]}>
        {prefix ? <Text style={styles.prefix}>{prefix}</Text> : null}
        <TextInput
          value={draft ?? String(value)}
          accessibilityLabel={accessibilityLabel}
          onChangeText={(raw) => {
            setDraft(raw);
            if (wholeNumbers && validWhole(raw)) onChange(Number(raw));
          }}
          onBlur={() => draft !== null && commit(draft)}
          onSubmitEditing={() => draft !== null && commit(draft)}
          keyboardType={wholeNumbers ? 'number-pad' : 'numbers-and-punctuation'}
          selectTextOnFocus
          editable={!disabled}
          style={styles.input}
        />
      </View>
      <Pressable
        accessibilityLabel={t('Tăng')}
        accessibilityRole="button"
        onPress={() => bump(1)}
        disabled={disabled || (max != null && value >= max)}
        style={[
          styles.btn,
          wholeNumbers && styles.largeButton,
          (disabled || (max != null && value >= max)) && styles.off,
        ]}
      >
        <Text style={styles.btnText}>+</Text>
      </Pressable>
    </View>
  );
}

const styles = themeStyles(() =>
  StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    btn: {
      width: 38,
      height: 38,
      borderRadius: 10,
      backgroundColor: colors.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    largeButton: { width: 44, height: 44 },
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
      backgroundColor: colors.card,
    },
    invalid: { borderColor: colors.danger },
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
  }),
);
