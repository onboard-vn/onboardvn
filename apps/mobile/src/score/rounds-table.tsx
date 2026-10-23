import { ROUND_KEY } from '../api/plays-types';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { NumberField } from '../ui/number-field';
import { Button, Card, Heading, Hint } from '../ui/primitives';
import { themeStyles, colors } from '../ui/theme';
import { Flash, PresenceLabel } from './cell-flash';
import { roundScore, roundsConfig, targetReached } from './model';
import type { SheetApi } from './use-sheet';
import { scoreLocale, scorePlayerName, scoreText } from './localization';
import { useAppPreferences } from '../ui/preferences';

const AGG_LABEL = {
  sum: 'Tổng các vòng',
  best: 'Vòng tốt nhất',
  'rounds-won': 'Số vòng thắng',
} as const;

export function RoundsTable({ sheet }: { sheet: SheetApi }) {
  const { language } = useAppPreferences();
  const fmt = (n: number) => n.toLocaleString(scoreLocale(language));
  const { template, state, summary } = sheet;
  const { target, aggregate, roundLimit } = roundsConfig(template);
  const reached = targetReached(template, summary.rows);
  const winners = summary.rows.filter((r) => summary.winners.includes(r.id));
  const winnerText = winners
    .map((winner) => {
      const player = state.players.find((candidate) => candidate.id === winner.id);
      return player ? scorePlayerName(player) : winner.name;
    })
    .join(', ');
  const rounds = Array.from({ length: state.roundCount }, (_, i) => i);

  return (
    <Card>
      <Heading>{scoreText('Bảng điểm theo vòng')}</Heading>
      <Hint>
        {scoreText(AGG_LABEL[aggregate])}
        {target !== null ? ` ${scoreText('· mốc kết thúc {target}', { target: fmt(target) })}` : ''}
        {roundLimit ? ` ${scoreText('· {roundLimit} vòng', { roundLimit })}` : ''}
      </Hint>

      {reached ? (
        <View style={[styles.banner, { backgroundColor: colors.successSoft }]}>
          <Text style={styles.bannerText}>
            {scoreText('Đã đạt mốc {target} · Người thắng: {winnerText}', {
              target: target !== null ? fmt(target) : '',
              winnerText,
            })}
          </Text>
        </View>
      ) : winnerText && summary.rows.some((r) => r.total !== 0) ? (
        <Hint>{scoreText('Đang dẫn: {names}', { names: winnerText })}</Hint>
      ) : null}

      <ScrollView horizontal>
        <View>
          <View style={styles.row}>
            <Text style={[styles.cell, styles.roundCol, styles.head]}>{scoreText('Vòng')}</Text>
            {state.players.map((p) => (
              <View key={p.id} style={[styles.cell, styles.playerCol]}>
                <Text style={styles.head} numberOfLines={1}>
                  {scorePlayerName(p)}
                </Text>
                <PresenceLabel
                  sheet={sheet}
                  id={p.id}
                  name={p.name}
                  fallbackSeat={p.fallbackSeat}
                />
              </View>
            ))}
          </View>
          {rounds.map((r) => (
            <View key={r} style={styles.row}>
              <Text style={[styles.cell, styles.roundCol]}>{r + 1}</Text>
              {state.players.map((p) => (
                <View key={p.id} style={[styles.cell, styles.playerCol]}>
                  <Flash sheet={sheet} id={p.id} cat={ROUND_KEY} round={r}>
                    <NumberField
                      value={roundScore(state, p.id, r)}
                      width={52}
                      disabled={!sheet.canEditIdentity(p.id)}
                      onChange={(n) => sheet.setRoundScore(p.id, r, n)}
                    />
                  </Flash>
                </View>
              ))}
            </View>
          ))}
          <View style={[styles.row, styles.totalRow]}>
            <Text style={[styles.cell, styles.roundCol, styles.head]}>{scoreText('Tổng')}</Text>
            {summary.rows.map((row) => {
              const won = reached && summary.winners.includes(row.id);
              const hit = target !== null && row.total >= target;
              return (
                <Text
                  key={row.id}
                  style={[
                    styles.cell,
                    styles.playerCol,
                    styles.total,
                    hit && { color: colors.danger },
                    won && styles.won,
                  ]}
                >
                  {fmt(row.total)}
                  {won ? ' 🏆' : ''}
                </Text>
              );
            })}
          </View>
        </View>
      </ScrollView>

      <View style={styles.actions}>
        <Button
          label={scoreText('Thêm vòng')}
          onPress={sheet.addRound}
          disabled={!sheet.canManage}
        />
        <Button
          label={scoreText('Xóa vòng cuối')}
          tone="ghost"
          onPress={sheet.removeLastRound}
          disabled={!sheet.canManage || state.roundCount <= 1}
        />
      </View>
    </Card>
  );
}

const styles = themeStyles(() =>
  StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'center' },
    cell: { paddingVertical: 6, paddingHorizontal: 4, alignItems: 'center' },
    roundCol: { width: 56, textAlign: 'center', color: colors.muted, fontWeight: '600' },
    playerCol: { width: 150, textAlign: 'center', color: colors.text },
    head: { fontWeight: '700', color: colors.muted },
    totalRow: { borderTopWidth: 1, borderTopColor: colors.border, marginTop: 4 },
    total: { fontSize: 20, fontWeight: '800' },
    won: { backgroundColor: colors.successSoft, borderRadius: 8 },
    banner: { padding: 12, borderRadius: 10 },
    bannerText: { fontWeight: '700', color: colors.text },
    actions: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  }),
);
