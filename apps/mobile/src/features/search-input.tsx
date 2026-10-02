import { StyleSheet, TextInput } from 'react-native';
import { colors, radius, space } from '../ui/theme';

export function SearchInput({
  value,
  onChangeText,
  placeholder,
  label,
}: {
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  label: string;
}) {
  return (
    <TextInput
      style={styles.input}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={colors.muted}
      autoCorrect={false}
      autoCapitalize="none"
      clearButtonMode="while-editing"
      accessibilityLabel={label}
    />
  );
}

export const inputStyle = {
  backgroundColor: colors.card,
  borderWidth: 1,
  borderColor: colors.border,
  borderRadius: radius,
  paddingHorizontal: space.lg,
  paddingVertical: 10,
  fontSize: 16,
  color: colors.text,
} as const;

const styles = StyleSheet.create({ input: inputStyle });
