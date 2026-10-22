import type { ScoreTemplate } from '@onboard/shared';
import { useState } from 'react';
import { ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { playsApi as defaultPlaysApi, type PlaysApi } from '../api/plays';
import { CURRENT_IDENTITY_ID } from '../mock/club';
import { NumberField } from '../ui/number-field';
import { Badge, Button, Card, Chip, Heading, Hint, Segmented } from '../ui/primitives';
import { themeStyles, colors } from '../ui/theme';
import { Flash, PresenceLabel } from './cell-flash';
import { clearDraft, saveDraft, saveResult } from './draft-storage';
import { FinishDialog } from './finish-dialog';
import { isShadowHunters } from './custom/shadow-hunters-rules';
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
import { LocalPlayerEditor } from './local-player-editor';
import { PlayerEditor } from './player-editor';
import { scoreInputRegistry } from './registry';
import { RoundsTable } from './rounds-table';
import { RuleNotes } from './rule-notes';
import { SummaryCard } from './summary-card';
import { usePlaySync } from './use-play-sync';
import { useSheet, type SheetAccess } from './use-sheet';
import { QUICK_KEY } from '../api/plays-types';
import { scoreFeedbackText, scorePlayerName, scoreText } from './localization';
import { useAppPreferences } from '../ui/preferences';
export interface ScoreSheetProps extends SheetAccess {
  template: ScoreTemplate;
  localPlayers?: boolean;
  players: Player[];
  playId?: string;
  saved?: SheetState | null;
  onExit?: () => void;
  api?: PlaysApi;
  actorId?: string;
  restoredFromDraft?: boolean;
}

export function ScoreSheet({
  template,
  players,
  localPlayers = false,
  playId,
  saved,
  onExit,
  api: playsApi = defaultPlaysApi,
  actorId = CURRENT_IDENTITY_ID,
  restoredFromDraft = !!saved,
  canEdit,
  canManage,
  editableIdentityIds,
}: ScoreSheetProps) {
  useAppPreferences();
  const sheet = useSheet(template, players, {
    actorId,
    saved,
    allowIncompleteRoster: localPlayers,
    canEdit,
    canManage,
    editableIdentityIds,
  });
  const sync = usePlaySync(playId, sheet, playsApi);
  const Custom = scoreInputRegistry[template.slug];
  const { state } = sheet;
  const expansions = expansionsOf(template);
  const detailed = state.mode === 'detailed';
  const shadowHunters = isShadowHunters(template);
  const [finishing, setFinishing] = useState(false);
  const [notice, setNotice] = useState<string | null>(
    restoredFromDraft ? 'Đã khôi phục bản nháp.' : null,
  );

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
    if (!sheet.canManage) throw new Error('Chủ bàn mới có thể kết thúc ván.');
    if (sheet.summary.error) throw new Error(sheet.summary.error);
    await sync.flush();
    const receipt = await playsApi.finish(playId, {
      outcome: needsOutcome(template) ? state.outcome : undefined,
      players: state.players.map((p) => ({ identityId: p.id, kind: p.kind ?? 'member' })),
      winners: sheet.summary.winners,
      rows: sheet.summary.rows,
    });
    await saveResult(playId, {
      finishedAt: new Date().toISOString(),
      rows: sheet.summary.rows,
      winners: sheet.summary.winners,
      ...receipt,
      ...(shadowHunters ? { values: state.values } : {}),
    });
    await clearDraft(playId);
    return receipt;
  };

  return (
    <SafeAreaView edges={['bottom']} style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.column}>
          <Hint>
            {shadowHunters
              ? scoreText("Thắng theo mục tiêu nhân vật")
              : template.mode === 'coop'
                ? scoreText("Co-op")
                : template.winRule === 'lowest'
                  ? scoreText("Điểm thấp nhất thắng")
                  : scoreText("Điểm cao nhất thắng")}
            {' · '}
            {template.playerCount?.min}-{template.playerCount?.max} {scoreText("người")}</Hint>
          {template.needsReview ? <Badge label={scoreText("Mẫu chưa duyệt")} /> : null}

          {!shadowHunters && sheet.canManage ? (
            <Segmented<SheetMode>
              value={state.mode}
              onChange={sheet.setMode}
              options={[
                { value: 'quick', label: scoreText('Nhanh (chỉ tổng)') },
                { value: 'detailed', label: scoreText('Chi tiết') },
              ]}
            />
          ) : null}

          {localPlayers && sheet.canManage ? (
            <LocalPlayerEditor sheet={sheet} />
          ) : playsApi.roster && sheet.canManage ? (
            <PlayerEditor sheet={sheet} roster={playsApi.roster} />
          ) : null}

          {needsOutcome(template) &&
          !(
            template.slug === 'vantage' &&
            template.templateVersion >= 3 &&
            template.categories.some((c) => c.key === 'sessionEnded')
          ) ? (
            <Card>
              <Heading>{scoreText("Kết quả ván")}</Heading>
              <View style={styles.wrap}>
                <Chip
                  label={scoreText("Thắng")}
                  tint={colors.success}
                  selected={state.outcome === 'win'}
                  disabled={!sheet.canManage}
                  onPress={() => sheet.setOutcome('win')}
                />
                <Chip
                  label={scoreText("Thua")}
                  tint={colors.danger}
                  selected={state.outcome === 'loss'}
                  disabled={!sheet.canManage}
                  onPress={() => sheet.setOutcome('loss')}
                />
              </View>
            </Card>
          ) : null}

          <SummaryCard sheet={sheet} />

          {!detailed && isRankable(template) ? (
            <Card>
              <Heading>{scoreText("Tổng điểm mỗi người")}</Heading>
              {state.players.map((p) => (
                <View key={p.id} style={styles.quickRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.quickName}>{scorePlayerName(p)}</Text>
                    <PresenceLabel sheet={sheet} id={p.id} name={p.name} fallbackSeat={p.fallbackSeat} />
                  </View>
                  <Flash sheet={sheet} id={p.id} cat={QUICK_KEY}>
                    <NumberField
                      value={state.quickTotals[p.id] ?? 0}
                      width={96}
                      disabled={!sheet.canEditIdentity(p.id)}
                      onChange={(n) => sheet.setQuickTotal(p.id, n)}
                    />
                  </Flash>
                </View>
              ))}
            </Card>
          ) : null}

          {detailed || shadowHunters ? (
            <>
              {expansions.length > 0 ? (
                <Card>
                  <Heading>{scoreText("Bản mở rộng")}</Heading>
                  {expansions.map((e) => (
                    <View key={e} style={styles.quickRow}>
                      <Text style={styles.quickName}>{scoreText(e)}</Text>
                      <Switch
                        value={state.expansions.includes(e)}
                        disabled={!sheet.canManage}
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
            <Hint>{scoreText("Chuyển sang chế độ Chi tiết để ghi số phi vụ thành công/thất bại.")}</Hint>
          ) : null}

          <RuleNotes notes={tiebreakerNotes(template)} />

          {playId ? (
            <Card>
              <Text style={styles.sync}>
                {sync.unsynced > 0
                  ? scoreText('Đang đồng bộ {unsynced} thay đổi...', { unsynced: sync.unsynced })
                  : scoreText("Đã đồng bộ với bàn chơi")}
              </Text>
              {notice ? <Hint>{scoreFeedbackText(notice)}</Hint> : null}
              <View style={styles.wrap}>
                <Button
                  label={scoreText("Lưu nháp")}
                  tone="ghost"
                  disabled={!sheet.canManage}
                  onPress={saveNow}
                />
                <Button
                  label={scoreText("Kết thúc ván")}
                  disabled={!sheet.canManage || !!sheet.summary.error}
                  onPress={() => setFinishing(true)}
                />
              </View>
            </Card>
          ) : null}

          <Button
            label={scoreText("Làm lại từ đầu")}
            tone="ghost"
            disabled={!sheet.canManage}
            onPress={sheet.reset}
          />
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

const styles = themeStyles(() => StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, alignItems: 'center' },
  column: { width: '100%', maxWidth: 720, gap: 12 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  quickRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  quickName: { fontSize: 15, fontWeight: '600', color: colors.text },
  sync: { fontSize: 13, color: colors.muted },
}));
