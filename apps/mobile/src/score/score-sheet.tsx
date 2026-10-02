import type { ScoreTemplate } from '@onboard/shared';
import { useState } from 'react';
import { ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { playsApi } from '../api/plays';
import { CURRENT_IDENTITY_ID } from '../mock/club';
import { NumberField } from '../ui/number-field';
import { Badge, Button, Card, Chip, Heading, Hint, Segmented } from '../ui/primitives';
import { colors } from '../ui/theme';
import { Flash, PresenceLabel } from './cell-flash';
import { clearDraft, saveDraft, saveResult } from './draft-storage';
import { FinishDialog } from './finish-dialog';
import { GenericCategories } from './generic-categories';
import {
  expansionsOf,
  isCoop,
  isRankable,
  isRoundsGame,
  needsOutcome,
  tiebreakerNotes,
  type Player,
  type SheetMode,
  type SheetState,
} from './model';
import { PlayerEditor } from './player-editor';
import { scoreInputRegistry } from './registry';
import { RoundsTable } from './rounds-table';
import { RuleNotes } from './rule-notes';
import { SummaryCard } from './summary-card';
import { usePlaySync } from './use-play-sync';
import { useSheet } from './use-sheet';
import { QUICK_KEY } from '../api/plays-types';

export interface ScoreSheetProps {
  template: ScoreTemplate;
  players: Player[];
  playId?: string;
  saved?: SheetState | null;
  onExit?: () => void;
}

export function ScoreSheet({ template, players, playId, saved, onExit }: ScoreSheetProps) {
  const sheet = useSheet(template, players, { actorId: CURRENT_IDENTITY_ID, saved });
  const sync = usePlaySync(playId, sheet);
  const Custom = scoreInputRegistry[template.slug];
  const { state } = sheet;
  const expansions = expansionsOf(template);
  const detailed = state.mode === 'detailed';
  const [finishing, setFinishing] = useState(false);
  const [notice, setNotice] = useState<string | null>(saved ? 'Đã khôi phục bản nháp.' : null);

  const saveNow = async () => {
    if (!playId) return;
    try {
      await saveDraft(playId, state);
      setNotice('Đã lưu nháp.');
    } catch {
      setNotice('Không lưu được bản nháp.');
    }
  };

  const confirmFinish = async () => {
    if (!playId) throw new Error('missing play');
    await sync.flush();
    const receipt = await playsApi.finish(playId, {
      players: state.players.map((p) => ({ identityId: p.id, kind: p.kind ?? 'member' })),
      winners: sheet.summary.winners,
      rows: sheet.summary.rows,
    });
    await saveResult(playId, {
      finishedAt: new Date().toISOString(),
      rows: sheet.summary.rows,
      winners: sheet.summary.winners,
      ...receipt,
    });
    await clearDraft(playId);
    return receipt;
  };

  return (
    <SafeAreaView edges={['bottom']} style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.column}>
          <Hint>
            {template.mode === 'coop'
              ? 'Co-op'
              : template.winRule === 'lowest'
                ? 'Điểm thấp nhất thắng'
                : 'Điểm cao nhất thắng'}
            {' · '}
            {template.playerCount?.min}-{template.playerCount?.max} người
          </Hint>
          {template.needsReview ? <Badge label="Mẫu chưa duyệt" /> : null}

          <Segmented<SheetMode>
            value={state.mode}
            onChange={sheet.setMode}
            options={[
              { value: 'quick', label: 'Nhanh (chỉ tổng)' },
              { value: 'detailed', label: 'Chi tiết' },
            ]}
          />

          <PlayerEditor sheet={sheet} />

          {needsOutcome(template) ? (
            <Card>
              <Heading>Kết quả ván</Heading>
              <View style={styles.wrap}>
                <Chip
                  label="Thắng"
                  tint={colors.success}
                  selected={state.outcome === 'win'}
                  onPress={() => sheet.setOutcome('win')}
                />
                <Chip
                  label="Thua"
                  tint={colors.danger}
                  selected={state.outcome === 'loss'}
                  onPress={() => sheet.setOutcome('loss')}
                />
              </View>
            </Card>
          ) : null}

          <SummaryCard sheet={sheet} />

          {!detailed && isRankable(template) ? (
            <Card>
              <Heading>Tổng điểm mỗi người</Heading>
              {state.players.map((p) => (
                <View key={p.id} style={styles.quickRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.quickName}>{p.name}</Text>
                    <PresenceLabel sheet={sheet} id={p.id} name={p.name} />
                  </View>
                  <Flash sheet={sheet} id={p.id} cat={QUICK_KEY}>
                    <NumberField
                      value={state.quickTotals[p.id] ?? 0}
                      width={96}
                      onChange={(n) => sheet.setQuickTotal(p.id, n)}
                    />
                  </Flash>
                </View>
              ))}
            </Card>
          ) : null}

          {detailed ? (
            <>
              {expansions.length > 0 ? (
                <Card>
                  <Heading>Bản mở rộng</Heading>
                  {expansions.map((e) => (
                    <View key={e} style={styles.quickRow}>
                      <Text style={styles.quickName}>{e}</Text>
                      <Switch
                        value={state.expansions.includes(e)}
                        onValueChange={() => sheet.toggleExpansion(e)}
                      />
                    </View>
                  ))}
                </Card>
              ) : null}

              {Custom ? (
                <Custom sheet={sheet} />
              ) : isRoundsGame(template) ? (
                <RoundsTable sheet={sheet} />
              ) : (
                <GenericCategories sheet={sheet} />
              )}
            </>
          ) : isCoop(template) ? (
            <Hint>Chuyển sang chế độ Chi tiết để ghi số phi vụ thành công/thất bại.</Hint>
          ) : null}

          <RuleNotes notes={tiebreakerNotes(template)} />

          {playId ? (
            <Card>
              <Text style={styles.sync}>
                {sync.unsynced > 0
                  ? `Đang đồng bộ ${sync.unsynced} thay đổi...`
                  : 'Đã đồng bộ với bàn chơi'}
              </Text>
              {notice ? <Hint>{notice}</Hint> : null}
              <View style={styles.wrap}>
                <Button label="Lưu nháp" tone="ghost" onPress={saveNow} />
                <Button label="Kết thúc ván" onPress={() => setFinishing(true)} />
              </View>
            </Card>
          ) : null}

          <Button label="Làm lại từ đầu" tone="ghost" onPress={sheet.reset} />
        </View>
      </ScrollView>
      {playId ? (
        <FinishDialog
          sheet={sheet}
          visible={finishing}
          onClose={() => setFinishing(false)}
          onConfirm={confirmFinish}
          onDone={() => {
            setFinishing(false);
            onExit?.();
          }}
        />
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, alignItems: 'center' },
  column: { width: '100%', maxWidth: 720, gap: 12 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  quickRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  quickName: { fontSize: 15, fontWeight: '600', color: colors.text },
  sync: { fontSize: 13, color: colors.muted },
});
