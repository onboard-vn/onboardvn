import { StyleSheet, Text } from 'react-native';
import { Collapsible } from '../ui/primitives';
import { themeStyles, colors } from '../ui/theme';
import type { RuleNotes as Notes } from './model';
import { scoreText } from './localization';
import { useAppPreferences } from '../ui/preferences';
export function RuleNotes({ notes }: { notes: Notes }) {
  const { language } = useAppPreferences();
  if (notes.vi.length === 0 && notes.en.length === 0) return null;
  const preferred = language === 'vi' ? notes.vi : notes.en;
  const fallback = language === 'vi' ? notes.en : notes.vi;
  const lines = preferred.length ? preferred : fallback;
  return (
    <Collapsible defaultOpen title={scoreText('Ghi chú luật')}>
      {lines.map((line) => (
        <Text key={line} style={styles.text}>
          {scoreText(line)}
        </Text>
      ))}
    </Collapsible>
  );
}

const styles = themeStyles(() =>
  StyleSheet.create({ text: { fontSize: 14, lineHeight: 20, color: colors.text } }),
);
