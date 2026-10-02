import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { getTable } from '../../../mock/club';
import { loadDraft, loadResult, type FinishedResult } from '../../../score/draft-storage';
import { receiptLines } from '../../../score/finish-dialog';
import type { SheetState } from '../../../score/model';
import { ScoreSheet } from '../../../score/score-sheet';
import { scoreTemplates } from '../../../score/templates';
import { Card, Heading } from '../../../ui/primitives';
import { colors } from '../../../ui/theme';

interface Loaded {
  draft: SheetState | null;
  result: FinishedResult | null;
}

export default function TableScoreScreen() {
  const { tableId } = useLocalSearchParams<{ tableId: string }>();
  const router = useRouter();
  const found = tableId ? getTable(tableId) : undefined;
  const template = found ? scoreTemplates[found.table.gameSlug] : undefined;
  const [loaded, setLoaded] = useState<Loaded | null>(null);

  useEffect(() => {
    if (!tableId) return;
    let live = true;
    Promise.all([loadDraft(tableId), loadResult(tableId)]).then(
      ([draft, result]) => live && setLoaded({ draft, result }),
    );
    return () => {
      live = false;
    };
  }, [tableId]);

  if (!found || !template || !tableId) {
    return (
      <View style={{ padding: 24 }}>
        <Text>Không tìm thấy bàn hoặc chưa có mẫu chấm điểm cho game này.</Text>
      </View>
    );
  }
  if (!loaded) return <ActivityIndicator style={{ marginTop: 48 }} />;

  const title = <Stack.Screen options={{ title: found.table.gameName }} />;

  if (loaded.result) {
    const { rows, winners } = loaded.result;
    return (
      <>
        {title}
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.column}>
            <Card>
              <Heading>Kết quả đã chốt</Heading>
              {[...rows]
                .sort((a, b) => (a.rank ?? 99) - (b.rank ?? 99))
                .map((r) => (
                  <View key={r.id} style={styles.row}>
                    <Text style={styles.name}>
                      {r.rank ? `#${r.rank} ` : ''}
                      {r.name}
                      {winners.includes(r.id) ? '  🏆' : ''}
                    </Text>
                    <Text style={styles.total}>{r.total.toLocaleString('vi-VN')}</Text>
                  </View>
                ))}
              {receiptLines(loaded.result).map((l) => (
                <Text key={l} style={styles.meta}>
                  {l}
                </Text>
              ))}
            </Card>
          </View>
        </ScrollView>
      </>
    );
  }

  const players = found.table.players.map((p) => ({
    id: p.identityId,
    name: p.displayName,
    kind: p.kind,
    avatarColor: p.avatarColor,
  }));

  return (
    <>
      {title}
      <ScoreSheet
        key={tableId}
        template={template}
        players={players}
        playId={tableId}
        saved={loaded.draft}
        onExit={() => router.back()}
      />
    </>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, alignItems: 'center' },
  column: { width: '100%', maxWidth: 720, gap: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  name: { flex: 1, fontSize: 16, color: colors.text },
  total: { fontSize: 18, fontWeight: '800', color: colors.text },
  meta: { color: colors.muted },
});
