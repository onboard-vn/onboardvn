import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { Button } from '../../ui/primitives';
import { colors, space } from '../../ui/theme';
import { inputStyle } from '../search-input';

export function CsvInput({
  disabled,
  onCsv,
}: {
  disabled?: boolean;
  onCsv: (text: string) => void;
}) {
  const [text, setText] = useState('');
  return (
    <View style={styles.stack}>
      <TextInput
        style={[inputStyle, styles.area]}
        value={text}
        onChangeText={setText}
        placeholder="Dán nội dung CSV (name,nameEn,bggId,copies)"
        placeholderTextColor={colors.muted}
        multiline
        autoCapitalize="none"
        autoCorrect={false}
        accessibilityLabel="Nội dung CSV"
      />
      <Button label="Xem trước" disabled={disabled || !text.trim()} onPress={() => onCsv(text)} />
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: space.sm },
  area: { minHeight: 120, textAlignVertical: 'top' },
});
