import { Link, Stack } from 'expo-router';
import { Pressable, StyleSheet, Text } from 'react-native';
import { PageShell } from '../../features/static/page-shell';
import { scoreInputRegistry } from '../../score/registry';
import { templateList } from '../../score/templates';
import { Badge, Card, Heading, Hint } from '../../ui/primitives';
import { colors } from '../../ui/theme';

export default function ScoreDevIndex() {
  return (
    <PageShell footer={false}>
      <Stack.Screen options={{ title: 'Bảng điểm (dev)' }} />
      <Hint>Dev: mở thẳng bảng điểm theo game (không có bàn/người chơi thật).</Hint>
      {templateList.map((t) => (
        <Link key={t.slug} href={{ pathname: '/score/[slug]', params: { slug: t.slug } }} asChild>
          <Pressable accessibilityRole="button">
            <Card>
              <Heading>{t.name}</Heading>
              <Text style={styles.meta}>
                {t.mode === 'coop' ? 'Co-op' : 'Cạnh tranh'} · {t.playerCount?.min}-
                {t.playerCount?.max} người
                {scoreInputRegistry[t.slug] ? ' · nhập riêng' : ''}
              </Text>
              {t.needsReview ? <Badge label="Mẫu chưa duyệt" /> : null}
            </Card>
          </Pressable>
        </Link>
      ))}
    </PageShell>
  );
}

const styles = StyleSheet.create({ meta: { color: colors.muted } });
