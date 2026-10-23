import { scoreInputRegistry } from './registry';
import { critterKitchenSetupSchema, type PlayDto, type ScoreTemplate } from '@onboard/shared';
import { useRef, useState, type ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../api/client';
import { Badge, Button, Card, Chip, Heading, Hint } from '../ui/primitives';
import { themeStyles, colors } from '../ui/theme';
import { CritterKitchenInput } from './custom/critter-kitchen-input';
import { FinishDialog } from './finish-dialog';
import { GenericCategories } from './generic-categories';
import { isRoundsGame, needsOutcome, type Player, type Summary } from './model';
import { RuleNotes } from './rule-notes';
import { isRankable, tiebreakerNotes } from './model';
import { sheetStateFromPlay } from './shared-play-state';
import { useSharedPlaySync } from './use-shared-play-sync';
import { useSheet } from './use-sheet';
import type { RosterApi } from '../api/plays-types';
import { PlayerEditor } from './player-editor';
import { RoundsTable } from './rounds-table';
import {
  scoreFeedbackText,
  scoreLocale,
  scorePlayerName,
  scoreText,
  templateScoreText,
} from './localization';
import { useAppPreferences } from '../ui/preferences';

function usesCritterMealTemplate(play: PlayDto): boolean {
  const definition = play.template?.definition;
  if (play.game.slug !== 'critter-kitchen' || !definition || typeof definition !== 'object')
    return false;
  if (!('categories' in definition) || !Array.isArray(definition.categories)) return false;
  return definition.categories.some(
    (category) =>
      !!category && typeof category === 'object' && 'key' in category && category.key === 'meal',
  );
}

export function SharedScoreSheet({
  template,
  play,
  currentUserId,
  onExit,
  onPlayChange,
  onStartNewPlay,
  roster,
  guestActions,
}: {
  template: ScoreTemplate;
  play: PlayDto;
  currentUserId: string;
  onExit: () => void;
  onPlayChange: (play: PlayDto) => void;
  onStartNewPlay?: () => void;
  roster?: RosterApi;
  guestActions?: ReactNode;
}) {
  useAppPreferences();
  const players: Player[] = play.players.map((row) => ({
    id: row.identity.id,
    name: row.identity.displayName,
    kind: row.identity.kind,
  }));
  const sheet = useSheet(template, players, {
    actorId: currentUserId,
    saved: sheetStateFromPlay(template, play),
    editableIdentityIds: play.editableIdentityIds,
    canManage: play.canManage,
    canEdit: play.status === 'draft',
  });
  const sync = useSharedPlaySync(play.id, currentUserId, play, sheet, onPlayChange);
  const [finishing, setFinishing] = useState(false);
  const [setupPending, setSetupPending] = useState(
    () => usesCritterMealTemplate(play) && !critterKitchenSetupSchema.safeParse(play.setup).success,
  );
  const setupPendingRef = useRef(setupPending);
  const changeSetupPending = (pending: boolean) => {
    setupPendingRef.current = pending;
    setSetupPending(pending);
  };
  const { state } = sheet;
  const current = sync.serverPlay;
  const CustomInput = scoreInputRegistry[template.slug];
  const guidedCritter = usesCritterMealTemplate(current);
  const setupMissing = guidedCritter && !critterKitchenSetupSchema.safeParse(current.setup).success;
  const setupMustWait = setupPending || setupMissing;
  const roundsGame = isRoundsGame(template);
  const showRounds = roundsGame && template.slug !== 'critter-kitchen';
  const finishSummary: Summary = guidedCritter
    ? {
        rows: current.players.map((row) => ({
          id: row.identity.id,
          name: row.identity.displayName,
          total: row.computed?.total ?? 0,
          rank: row.computed?.rank ?? null,
        })),
        winners: current.players
          .filter((row) => row.computed?.isWinner)
          .map((row) => row.identity.id),
        note: current.tieUnresolved ? 'Hòa chưa được phân định theo luật.' : null,
        error: setupMustWait
          ? 'Lưu xong thiết lập chung trước khi chốt ván.'
          : current.status === 'draft' && current.players.some((row) => row.computed === null)
            ? 'Hoàn tất các trường món cuối còn thiếu trước khi chốt.'
            : null,
        result: null,
      }
    : sheet.summary;

  const finalize = async () => {
    if (
      setupPendingRef.current ||
      (usesCritterMealTemplate(sync.serverPlay) &&
        !critterKitchenSetupSchema.safeParse(sync.serverPlay.setup).success)
    ) {
      throw new Error('Lưu xong thiết lập chung trước khi chốt ván.');
    }
    if (finishSummary.error) throw new Error(finishSummary.error);
    await sync.flush();
    const finalPlay = await api<PlayDto>(`/plays/${play.id}/finalize`, { method: 'POST' });
    onPlayChange(finalPlay);
    return {
      memberCount: finalPlay.players.filter((p) => p.identity.kind !== 'guest').length,
      guestCount: finalPlay.players.filter((p) => p.identity.kind === 'guest').length,
    };
  };

  return (
    <SafeAreaView edges={['bottom']} style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.column}>
          <View style={styles.header}>
            <Hint>
              {scoreText('Bảng điểm chung')} · {scoreText('Nhập chi tiết')} · {current.game.name} ·{' '}
              {current.status === 'final' ? scoreText('Đã chốt') : scoreText('Đang chơi')}
            </Hint>
            <Button label={scoreText('Về kèo')} tone="ghost" onPress={onExit} />
          </View>
          {current.template?.needsReview ? (
            <Badge label={scoreText('Mẫu chấm điểm cần xem lại')} />
          ) : null}

          {roster && current.canManage && current.status === 'draft' ? (
            <PlayerEditor sheet={sheet} roster={roster} />
          ) : null}
          <Card>
            <Heading>{scoreText('Người chơi')}</Heading>
            {current.players
              .slice()
              .sort((a, b) => a.seat - b.seat)
              .map((row) => (
                <View key={row.identity.id} style={styles.playerRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.playerName}>
                      {scorePlayerName({
                        name: row.identity.displayName,
                        ...(!row.identity.displayName ? { fallbackSeat: row.seat } : {}),
                      })}
                    </Text>
                    {row.identity.kind !== 'member' ? (
                      <Hint>
                        {row.identity.kind === 'guest'
                          ? scoreText('Khách')
                          : scoreText('Ngoài CLB')}
                      </Hint>
                    ) : null}
                  </View>
                  {current.editableIdentityIds.includes(row.identity.id) || current.canManage ? (
                    <Badge label={scoreText('Bạn có thể nhập')} />
                  ) : null}
                </View>
              ))}
            <Hint>
              {current.canManage
                ? scoreText('Bạn là chủ bàn và có thể nhập điểm cho mọi người.')
                : scoreText('Bạn chỉ sửa được hàng điểm gắn với tài khoản của mình.')}
            </Hint>
          </Card>

          {needsOutcome(template) &&
          !(
            template.slug === 'vantage' &&
            template.templateVersion >= 3 &&
            template.categories.some((c) => c.key === 'sessionEnded')
          ) ? (
            <Card>
              <Heading>{scoreText('Kết quả ván')}</Heading>
              {sheet.canManage ? (
                <View style={styles.wrap}>
                  <Chip
                    label={scoreText('Thắng')}
                    tint={colors.success}
                    selected={state.outcome === 'win'}
                    onPress={() => sheet.setOutcome('win')}
                  />
                  <Chip
                    label={scoreText('Thua')}
                    tint={colors.danger}
                    selected={state.outcome === 'loss'}
                    onPress={() => sheet.setOutcome('loss')}
                  />
                </View>
              ) : (
                <Hint>
                  {state.outcome === 'win'
                    ? scoreText('Chủ bàn đã chọn cả đội thắng.')
                    : state.outcome === 'loss'
                      ? scoreText('Chủ bàn đã chọn cả đội thua.')
                      : scoreText('Chờ chủ bàn nhập kết quả.')}
                </Hint>
              )}
            </Card>
          ) : null}

          <ServerResults play={current} template={template} />

          {guidedCritter ? (
            <CritterKitchenInput
              sheet={sheet}
              setup={current.setup}
              play={current}
              onSetupSaved={onPlayChange}
              onSetupPendingChange={changeSetupPending}
            />
          ) : CustomInput ? (
            <CustomInput sheet={sheet} />
          ) : showRounds ? (
            <RoundsTable sheet={sheet} />
          ) : (
            <GenericCategories sheet={sheet} />
          )}

          {!roundsGame && isRankable(template) && template.slug !== 'critter-kitchen' ? (
            <Hint>{scoreText('Điểm mỗi hàng được tính lại trên máy chủ sau khi đồng bộ.')}</Hint>
          ) : null}

          {guestActions}
          <RuleNotes notes={tiebreakerNotes(template)} />

          <Card>
            <Text style={styles.sync}>
              {sync.error
                ? scoreText('Có thay đổi chưa đồng bộ.')
                : sync.unsynced > 0
                  ? scoreText('Đang đồng bộ {unsynced} thay đổi...', { unsynced: sync.unsynced })
                  : sync.connected
                    ? scoreText('Đã đồng bộ với máy chủ.')
                    : scoreText('Đang kết nối với bàn...')}
            </Text>
            {sync.error ? <Text style={styles.error}>{scoreFeedbackText(sync.error)}</Text> : null}
            {sync.blocked && sync.unsynced > 0 ? (
              <View style={styles.wrap}>
                <Button
                  label={scoreText('Thử đồng bộ lại')}
                  tone="ghost"
                  onPress={sync.retrySync}
                />
                <Button
                  label={scoreText('Bỏ các thay đổi chưa đồng bộ')}
                  tone="ghost"
                  onPress={sync.discardPending}
                />
              </View>
            ) : null}
            {current.warnings.map((warning) => (
              <Hint key={warning}>{scoreFeedbackText(warning)}</Hint>
            ))}
            {current.status === 'draft' && current.canManage ? (
              <Button
                label={scoreText('Chốt ván')}
                onPress={() => setFinishing(true)}
                disabled={setupMustWait || sync.unsynced > 0 || !sync.connected || !!sync.error}
              />
            ) : null}
            {current.status === 'final' ? (
              <>
                <Badge label={scoreText('Kết quả đã được máy chủ chốt')} />
                {current.canManage && onStartNewPlay ? (
                  <Button label={scoreText('Bắt đầu ván mới')} onPress={onStartNewPlay} />
                ) : null}
              </>
            ) : null}
          </Card>
        </View>
      </ScrollView>
      {current.status === 'draft' && current.canManage ? (
        <FinishDialog
          sheet={sheet}
          summary={finishSummary}
          visible={finishing}
          onClose={() => setFinishing(false)}
          onConfirm={finalize}
          onDone={() => setFinishing(false)}
        />
      ) : null}
    </SafeAreaView>
  );
}

function ServerResults({ play, template }: { play: PlayDto; template: ScoreTemplate }) {
  const { language } = useAppPreferences();
  const rows = play.players
    .slice()
    .sort((a, b) => (a.computed?.rank ?? 99) - (b.computed?.rank ?? 99) || a.seat - b.seat);
  return (
    <Card>
      <Heading>{scoreText('Kết quả từ máy chủ')}</Heading>
      {rows.every((row) => row.computed === null) ? (
        <Hint>{scoreText('Nhập điểm để máy chủ tính tổng và thứ hạng.')}</Hint>
      ) : null}
      {rows.map((row) => (
        <View key={row.identity.id} style={styles.resultRow}>
          <Text style={styles.rank}>{row.computed?.rank ? `#${row.computed.rank}` : '—'}</Text>
          <Text style={styles.playerName} numberOfLines={1}>
            {scorePlayerName({
              name: row.identity.displayName,
              ...(!row.identity.displayName ? { fallbackSeat: row.seat } : {}),
            })}
            {row.computed?.isWinner ? ' 🏆' : ''}
          </Text>
          <Text style={styles.total}>
            {row.computed?.total.toLocaleString(scoreLocale(language)) ?? '—'}
          </Text>
          <View style={styles.breakdown}>
            {template.categories.flatMap((category) => {
              const points = row.computed?.categories[category.key];
              return points === undefined || points === 0
                ? []
                : [
                    <Text key={`${row.identity.id}-${category.key}`} style={styles.meta}>
                      {templateScoreText(
                        category.labelVi ?? category.label,
                        category.label,
                        language,
                      )}
                      : {points}
                    </Text>,
                  ];
            })}
          </View>
        </View>
      ))}
      {play.tieUnresolved ? <Hint>{scoreText('Hòa chưa được phân định theo luật.')}</Hint> : null}
    </Card>
  );
}

const styles = themeStyles(() =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.bg },
    content: { padding: 16, alignItems: 'center' },
    column: { width: '100%', maxWidth: 720, gap: 12 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
    playerRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    resultRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
    playerName: { flex: 1, color: colors.text, fontSize: 15, fontWeight: '600' },
    rank: { width: 30, color: colors.muted, fontWeight: '700' },
    total: { fontSize: 20, fontWeight: '800', color: colors.primary },
    breakdown: { width: '100%', gap: 2, paddingLeft: 38 },
    meta: { color: colors.muted, fontSize: 12 },
    wrap: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
    sync: { color: colors.text, fontSize: 13, fontWeight: '600' },
    error: { color: colors.danger, fontSize: 13 },
  }),
);
