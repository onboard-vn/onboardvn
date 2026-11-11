import { t } from '../../ui/i18n';
import { useAppPreferences } from '../../ui/preferences';
import { Link, Stack } from 'expo-router';
import { Pressable, StyleSheet, Text } from 'react-native';
import { PageShell } from '../../features/static/page-shell';
import { templateList } from '../../score/templates';
import { Card, Heading, Hint } from '../../ui/primitives';
import { themeStyles, colors } from '../../ui/theme';

export default function ScoreIndex() {
  useAppPreferences();
  return (
    <PageShell>
      <Stack.Screen options={{ title: t('Tính điểm') }} />
      <Hint>{t('Chọn game để mở bảng điểm, sau đó thêm tên người chơi.')}</Hint>
      {templateList.map((template) => (
        <Link
          key={template.slug}
          href={{ pathname: '/score/[slug]', params: { slug: template.slug } }}
          asChild
        >
          <Pressable accessibilityRole="button">
            <Card>
              <Heading>{template.name}</Heading>
              <Text style={styles.meta}>
                {template.mode === 'coop' ? 'Co-op' : t('Cạnh tranh')} · {template.playerCount?.min}
                -{template.playerCount?.max} {t('người')}
              </Text>
            </Card>
          </Pressable>
        </Link>
      ))}
    </PageShell>
  );
}

const styles = themeStyles(() => StyleSheet.create({ meta: { color: colors.muted } }));
