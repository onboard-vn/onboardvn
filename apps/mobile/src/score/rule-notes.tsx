import { StyleSheet, Text } from 'react-native';
import { Card, Collapsible, Heading } from '../ui/primitives';
import { colors } from '../ui/theme';
import type { RuleNotes as Notes } from './model';

export function RuleNotes({ notes }: { notes: Notes }) {
  if (notes.vi.length === 0 && notes.en.length === 0) return null;
  return (
    <>
      {notes.vi.length > 0 ? (
        <Card>
          <Heading>Ghi chú luật</Heading>
          {notes.vi.map((n) => (
            <Text key={n} style={styles.text}>
              {n}
            </Text>
          ))}
        </Card>
      ) : null}
      {notes.en.length > 0 ? (
        <Collapsible title="Ghi chú luật (EN)">
          {notes.en.map((n) => (
            <Text key={n} style={styles.text}>
              {n}
            </Text>
          ))}
        </Collapsible>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({ text: { fontSize: 14, lineHeight: 20, color: colors.text } });
