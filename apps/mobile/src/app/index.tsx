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
        <Hint>Chọn game để mở bảng điểm (bản thử nghiệm).</Hint>
        {templateList.map((t) => (
          <Link key={t.slug} href={{ pathname: '/score/[slug]', params: { slug: t.slug } }} asChild>
            <Pressable>
              <Card>
                <Heading>{t.name}</Heading>
                <Text style={styles.meta}>
                  {t.mode === 'coop' ? 'Co-op' : 'Cạnh tranh'} · {t.playerCount?.min}-
                  {t.playerCount?.max} người
                  {scoreInputRegistry[t.slug] ? ' · giao diện riêng' : ' · giao diện chung'}
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
