import type { GameRevisionDto } from '@onboard/shared';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../../ui/theme';
import { formatLocalDateTime } from './format';
import { Section } from './ui';

export function RevisionsList({ revisions }: { revisions: GameRevisionDto[] }) {
  if (revisions.length === 0) return null;
  return (
    <Section title="Lịch sử chỉnh sửa">
      {revisions.map((r) => (
        <View key={r.id} style={styles.row}>
          <Text style={styles.name}>{r.editorName ?? 'Không rõ'}</Text>
          <Text style={styles.text}>{formatLocalDateTime(r.createdAt)}</Text>
          <Text style={styles.muted}>
            Đồng ý CC BY-SA: {r.licenseAcceptedAt ? formatLocalDateTime(r.licenseAcceptedAt) : '—'}
          </Text>
        </View>
      ))}
    </Section>
  );
}

const styles = StyleSheet.create({
  row: { gap: 2, paddingVertical: 4 },
  name: { fontSize: 14, fontWeight: '600', color: colors.text },
  text: { fontSize: 13, color: colors.text },
  muted: { fontSize: 12, color: colors.muted },
});
