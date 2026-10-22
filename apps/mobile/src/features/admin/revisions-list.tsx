import { t } from '../../ui/i18n';
import { useAppPreferences } from '../../ui/preferences';
import type { GameRevisionDto } from '@onboard/shared';
import { StyleSheet, Text, View } from 'react-native';
import { themeStyles, colors } from '../../ui/theme';
import { formatLocalDateTime } from './format';
import { Section } from './ui';

export function RevisionsList({ revisions }: { revisions: GameRevisionDto[] }) {
  useAppPreferences();
  if (revisions.length === 0) return null;
  return (
    <Section title={t('Lịch sử chỉnh sửa')}>
      {revisions.map((r) => (
        <View key={r.id} style={styles.row}>
          <Text style={styles.name}>{r.editorName ?? t('Không rõ')}</Text>
          <Text style={styles.text}>{formatLocalDateTime(r.createdAt)}</Text>
          <Text style={styles.muted}>
            {t('Đồng ý CC BY-SA: {date}', {
              date: r.licenseAcceptedAt ? formatLocalDateTime(r.licenseAcceptedAt) : '—',
            })}
          </Text>
        </View>
      ))}
    </Section>
  );
}

const styles = themeStyles(() =>
  StyleSheet.create({
    row: { gap: 2, paddingVertical: 4 },
    name: { fontSize: 14, fontWeight: '600', color: colors.text },
    text: { fontSize: 13, color: colors.text },
    muted: { fontSize: 12, color: colors.muted },
  }),
);
