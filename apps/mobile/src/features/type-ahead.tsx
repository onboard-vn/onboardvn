import { StyleSheet, Text, View } from 'react-native';
import { Chip } from '../ui/primitives';
import { colors, space } from '../ui/theme';
import { findOption, suggestOptions, type NamedOption } from './games/filters';
import { SearchInput } from './search-input';

export function TypeAhead({
  label,
  placeholder,
  options,
  text,
  onTextChange,
  onSelect,
}: {
  label: string;
  placeholder: string;
  options: NamedOption[];
  text: string;
  onTextChange: (text: string) => void;
  onSelect: (id: string | undefined) => void;
}) {
  const suggestions = suggestOptions(options, text);
  const matched = findOption(options, text);

  const change = (next: string) => {
    onTextChange(next);
    onSelect(findOption(options, next)?.id);
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <SearchInput value={text} onChangeText={change} placeholder={placeholder} label={label} />
      {suggestions.length > 0 ? (
        <View style={styles.row}>
          {suggestions.map((o) => (
            <Chip
              key={o.id}
              label={o.label}
              onPress={() => {
                onTextChange(o.label);
                onSelect(o.id);
              }}
            />
          ))}
        </View>
      ) : null}
      {text.trim() && !matched && suggestions.length === 0 ? (
        <Text style={styles.none}>Không có kết quả khớp.</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.xs },
  label: { fontSize: 13, fontWeight: '600', color: colors.muted },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  none: { fontSize: 13, color: colors.muted },
});
