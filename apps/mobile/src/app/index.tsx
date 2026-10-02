import { Link } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { scoreInputRegistry } from '../score/registry';
import { templateList } from '../score/templates';
import { Badge, Card, Heading, Hint } from '../ui/primitives';
import { colors } from '../ui/theme';

export default function Home() {
  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.column}>
        <Link href="/club" asChild>
          <Pressable accessibilityRole="button">
            <Card>
              <Heading>Kèo của CLB</Heading>
              <Text style={styles.meta}>Chọn kèo, chọn bàn rồi tính điểm.</Text>
            </Card>
          </Pressable>
        </Link>

        <Hint>Dev: mở thẳng bảng điểm theo game (không có bàn/người chơi thật).</Hint>
        {templateList.map((t) => (
          <Link key={t.slug} href={{ pathname: '/score/[slug]', params: { slug: t.slug } }} asChild>
            <Pressable>
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
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, alignItems: 'center' },
  column: { width: '100%', maxWidth: 720, gap: 12 },
  meta: { color: colors.muted },
});
