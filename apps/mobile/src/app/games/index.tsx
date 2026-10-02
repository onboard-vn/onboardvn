import { Link } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { modeLabel, playersLabel, searchGames } from '../../games/catalog';
import { gameModules } from '../../games/modules';
import { Card, Heading, Hint } from '../../ui/primitives';
import { colors, radius, space } from '../../ui/theme';

export default function GameLibrary() {
  const [query, setQuery] = useState('');
  const results = useMemo(() => searchGames(query, 100), [query]);

  return (
    <View style={styles.screen}>
      <View style={styles.column}>
        <TextInput
          style={styles.input}
          value={query}
          onChangeText={setQuery}
          placeholder="Tìm game (không cần gõ dấu)"
          placeholderTextColor={colors.muted}
          autoCorrect={false}
          autoCapitalize="none"
          clearButtonMode="while-editing"
          accessibilityLabel="Tìm game"
        />
        <FlatList
          data={results}
          keyExtractor={(g) => g.slug}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.list}
          ListEmptyComponent={<Hint>Không tìm thấy game phù hợp.</Hint>}
          renderItem={({ item }) => (
            <Link href={{ pathname: '/games/[slug]', params: { slug: item.slug } }} asChild>
              <Pressable accessibilityRole="button">
                <Card>
                  <View style={styles.row}>
                    <Heading>{item.name}</Heading>
                    {gameModules[item.slug] ? (
                      <View style={styles.badge}>
                        <Text style={styles.badgeText}>Có công cụ</Text>
                      </View>
                    ) : null}
                  </View>
                  <Text style={styles.meta}>
                    {[item.year, playersLabel(item.players), modeLabel(item.mode)]
                      .filter(Boolean)
                      .join(' · ')}
                  </Text>
                </Card>
              </Pressable>
            </Link>
          )}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, alignItems: 'center' },
  column: { flex: 1, width: '100%', maxWidth: 720, padding: space.lg, gap: space.md },
  list: { gap: space.md, paddingBottom: space.xl },
  input: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius,
    paddingHorizontal: space.lg,
    paddingVertical: 10,
    fontSize: 16,
    color: colors.text,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.sm,
  },
  meta: { color: colors.muted },
  badge: {
    backgroundColor: colors.successSoft,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  badgeText: { color: colors.success, fontSize: 12, fontWeight: '700' },
});
