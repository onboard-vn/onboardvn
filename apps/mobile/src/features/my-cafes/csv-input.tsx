import { t } from '../../ui/i18n';
import { useAppPreferences } from '../../ui/preferences';
import { themeStyles, colors, space } from '../../ui/theme';
import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { Button } from '../../ui/primitives';

import { inputStyle } from '../search-input';

export function CsvInput({
  disabled,
  onCsv,
}: {
  disabled?: boolean;
  onCsv: (text: string) => void;
}) {
  useAppPreferences();
  const [text, setText] = useState('');
  return (
    <View style={styles.stack}>
      <TextInput
        style={[inputStyle, styles.area]}
        value={text}
        onChangeText={setText}
        placeholder={t('Dán nội dung CSV (name,nameEn,bggId,copies)')}
        placeholderTextColor={colors.muted}
        multiline
        autoCapitalize="none"
        autoCorrect={false}
        accessibilityLabel={t('Nội dung CSV')}
      />
      <Button
        label={t('Xem trước')}
        disabled={disabled || !text.trim()}
        onPress={() => onCsv(text)}
      />
    </View>
  );
}

const styles = themeStyles(() =>
  StyleSheet.create({
    stack: { gap: space.sm },
    area: { minHeight: 120, textAlignVertical: 'top' },
  }),
);
