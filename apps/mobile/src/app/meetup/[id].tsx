import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { getMeetup } from '../../mock/club';
import { loadResult, type FinishedResult } from '../../score/draft-storage';
import { formatDate } from '../../ui/format';
import { Avatar, Badge, Button, Card, Heading, Hint } from '../../ui/primitives';
import { colors } from '../../ui/theme';

export default function MeetupScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const meetup = id ? getMeetup(id) : undefined;
  const [results, setResults] = useState<Record<string, FinishedResult | null>>({});

  useFocusEffect(
    useCallback(() => {
      if (!meetup) return;
      let live = true;
      Promise.all(meetup.tables.map(async (t) => [t.id, await loadResult(t.id)] as const)).then(
        (entries) => live && setResults(Object.fromEntries(entries)),
      );
      return () => {
        live = false;
      };
    }, [meetup]),
  );

  if (!meetup) {
    return (
      <View style={{ padding: 24 }}>
        <Text>Không tìm thấy kèo.</Text>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: meetup.title }} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.column}>
          <Text style={styles.meta}>{formatDate(meetup.date)}</Text>
          <Hint>{meetup.venue}</Hint>
          {meetup.tables.map((t) => {
            const result = results[t.id];
            const host = t.players.find((p) => p.identityId === t.hostIdentityId);
            const winners = result?.rows.filter((r) => result.winners.includes(r.id)) ?? [];
            return (
              <Card key={t.id}>
                <Heading>{t.gameName}</Heading>
                {host ? <Hint>Chủ bàn: {host.displayName}</Hint> : null}
                <View style={styles.players}>
                  {t.players.map((p) => (
                    <View key={p.identityId} style={styles.player}>
                      <Avatar name={p.displayName} color={p.avatarColor} />
                      <Text style={styles.playerName} numberOfLines={1}>
                        {p.displayName}
                      </Text>
                    </View>
                  ))}
                </View>
                {result ? (
                  <Badge
                    label={`Đã kết thúc${winners.length ? ` · thắng: ${winners.map((w) => w.name).join(', ')}` : ''}`}
                  />
                ) : null}
                <Button
                  label={result ? 'Xem kết quả' : 'Tính điểm'}
                  onPress={() =>
                    router.push({ pathname: '/score/table/[tableId]', params: { tableId: t.id } })
                  }
                />
              </Card>
            );
          })}
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, alignItems: 'center' },
  column: { width: '100%', maxWidth: 720, gap: 12 },
  meta: { fontSize: 16, fontWeight: '600', color: colors.text },
  players: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  player: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  playerName: { fontSize: 14, color: colors.text },
});
