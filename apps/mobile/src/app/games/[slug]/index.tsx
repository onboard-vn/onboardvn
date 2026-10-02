import { Link, useLocalSearchParams } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { getGame, modeLabel, playersLabel } from '../../../games/catalog';
import { gameModules } from '../../../games/modules';
import { scoreTemplates } from '../../../score/templates';
import { Card, Heading, Hint } from '../../../ui/primitives';
import { colors, space } from '../../../ui/theme';

export default function GameDetail() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const game = slug ? getGame(slug) : undefined;

  if (!game) {
    return (
      <View style={styles.content}>
        <Hint>Không tìm thấy game.</Hint>
      </View>
    );
  }

  const modules = gameModules[game.slug] ?? [];
  const hasScoreSheet = !!scoreTemplates[game.slug];

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.column}>
        <Card>
          <Text style={styles.title}>{game.name}</Text>
          <Text style={styles.meta}>
            {[game.year, playersLabel(game.players), modeLabel(game.mode)]
              .filter(Boolean)
              .join(' · ')}
          </Text>
        </Card>

        <Heading>Công cụ</Heading>
        {modules.map((m) => (
          <Link key={m.key} href={m.href} asChild>
            <Pressable accessibilityRole="button">
              <Card>
                <Heading>{m.title}</Heading>
                <Text style={styles.meta}>{m.description}</Text>
              </Card>
            </Pressable>
          </Link>
        ))}

        {hasScoreSheet ? (
          <Link href={{ pathname: '/score/[slug]', params: { slug: game.slug } }} asChild>
            <Pressable accessibilityRole="button">
              <Card>
                <Heading>Tính điểm</Heading>
                <Text style={styles.meta}>Mở bảng điểm cho game này.</Text>
              </Card>
            </Pressable>
          </Link>
        ) : (
          <Card style={styles.disabled}>
            <Heading>Tính điểm</Heading>
            <Hint>Chưa có bảng điểm</Hint>
          </Card>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: space.lg, alignItems: 'center' },
  column: { width: '100%', maxWidth: 720, gap: space.md },
  title: { fontSize: 22, fontWeight: '700', color: colors.text },
  meta: { color: colors.muted },
  disabled: { opacity: 0.5 },
});
