import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, radius, space } from '../../ui/theme';
import { Field } from './ui';

export interface SelectOption {
  value: string;
  label: string;
}

export function Select({
  label,
  value,
  options,
  placeholder,
  onChange,
  disabled,
}: {
  label?: string;
  value: string;
  options: SelectOption[];
  placeholder: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const current = options.find((o) => o.value === value);
  const all: SelectOption[] = [{ value: '', label: placeholder }, ...options];
  return (
    <Field label={label}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label ?? placeholder}
        disabled={disabled}
        onPress={() => setOpen((o) => !o)}
        style={[styles.trigger, disabled && { opacity: 0.4 }]}
      >
        <Text style={styles.triggerText}>{current?.label ?? placeholder}</Text>
        <Text style={styles.triggerText}>{open ? '▴' : '▾'}</Text>
      </Pressable>
      {open ? (
        <View style={styles.list}>
          <ScrollView style={{ maxHeight: 220 }} nestedScrollEnabled>
            {all.map((o) => (
              <Pressable
                key={o.value || 'none'}
                accessibilityRole="button"
                accessibilityState={{ selected: o.value === value }}
                onPress={() => {
                  onChange(o.value);
                  setOpen(false);
                }}
                style={[styles.item, o.value === value && { backgroundColor: colors.primarySoft }]}
              >
                <Text style={styles.itemText}>{o.label}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      ) : null}
    </Field>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius,
    paddingHorizontal: space.md,
    paddingVertical: 10,
  },
  triggerText: { fontSize: 15, color: colors.text },
  list: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius,
    backgroundColor: colors.card,
    overflow: 'hidden',
  },
  item: { paddingHorizontal: space.md, paddingVertical: 10 },
  itemText: { fontSize: 15, color: colors.text },
});
