import { useState } from 'react';
import { Platform, ScrollView, Share, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppPreferences } from '../../ui/preferences';
import { scoreText } from '../localization';
import { NumberField } from '../../ui/number-field';
import { Button, Card, Chip, Heading, Hint } from '../../ui/primitives';
import { colors, themeStyles } from '../../ui/theme';
import { LocalPlayerEditor } from '../local-player-editor';
import { playerBounds } from '../model';
import type { SheetApi } from '../use-sheet';

const icons: Record<string, string> = {
  coins: '🪙',
  grain: '🌾',
  cheese: '🧀',
  wine: '🍷',
  wool: '🧶',
  brocade: '◆',
  developmentStatus: '★',
  tradingStations: '⌂',
  citizens: '♟',
  developmentTrackPosition: '↗',
};

const playerColors = [
  { label: 'Đỏ', tint: '#dc5149' },
  { label: 'Xanh dương', tint: '#4484d1' },
  { label: 'Xanh lá', tint: '#458950' },
  { label: 'Vàng', tint: '#c6952d' },
];

export function OrleansCalculator({ sheet }: { sheet: SheetApi }) {
  const { language } = useAppPreferences();
  const [showResults, setShowResults] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [gameNumber, setGameNumber] = useState(0);
  const { template, state, summary } = sheet;
  const manualBonus = state.teamValues.manualCitizenBonus === true;
  const editable = template.categories.filter(
    (category) => category.scope === 'player' && category.key !== 'bonusCitizen',
  );
  const bonusPoints = (id: string) =>
    summary.result?.players.find((player) => player.id === id)?.categories.bonusCitizen ?? 0;
  const ready = state.players.length >= playerBounds(template).min && !!summary.result;
  const selectedColor = (id: string, index: number) =>
    playerColors.find(({ tint }) => tint === state.extras[id]) ??
    playerColors[index % playerColors.length];

  return (
    <SafeAreaView edges={['bottom']} style={styles.screen}>
      <ScrollView
        key={showResults ? 'results' : gameNumber}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.column}>
          {showResults && ready ? (
            <OrleansResults sheet={sheet} onEdit={() => setShowResults(false)} />
          ) : (
            <>
              <LocalPlayerEditor sheet={sheet} />
              <Card style={styles.rule}>
                <View style={styles.row}>
                  <Heading>{scoreText('Thẻ Công dân thưởng tự động')}</Heading>
                  <Switch
                    accessibilityLabel={scoreText('Tự động tính thẻ Công dân thưởng')}
                    value={!manualBonus}
                    onValueChange={(automatic) =>
                      sheet.setTeamValue('manualCitizenBonus', !automatic)
                    }
                  />
                </View>
                <Hint>
                  {manualBonus
                    ? scoreText('Nhập số thẻ Công dân đã bao gồm thẻ thưởng thực tế.')
                    : scoreText(
                        'Nhập số thẻ Công dân trước thưởng. Một người dẫn đầu về số trạm nhận thêm 1 thẻ.',
                      )}
                </Hint>
              </Card>
              {state.players.map((player, index) => {
                const values = state.values[player.id] ?? {};
                const result = summary.result?.players.find(({ id }) => id === player.id);
                const color = selectedColor(player.id, index);
                return (
                  <Card key={player.id} style={{ borderLeftWidth: 4, borderLeftColor: color.tint }}>
                    <View style={styles.row}>
                      <Heading>{player.name}</Heading>
                      <Text style={styles.points}>{result?.total ?? 0} VP</Text>
                    </View>
                    <View
                      style={styles.wrap}
                      accessibilityLabel={scoreText('Màu của {name}', { name: player.name })}
                    >
                      {playerColors.map(({ label, tint }) => (
                        <Chip
                          key={tint}
                          label={scoreText(label)}
                          tint={tint}
                          selected={color.tint === tint}
                          onPress={() => sheet.setExtra(player.id, tint)}
                        />
                      ))}
                    </View>
                    {editable.map((category) => {
                      const { key, min, max, formula } = category;
                      const label =
                        language === 'en' ? category.label : (category.labelVi ?? category.label);
                      const raw = values[key];
                      const value = typeof raw === 'number' ? raw : (min ?? 0);
                      const rate = formula.points ?? result?.categories.developmentStatus ?? 1;
                      return (
                        <View key={key} style={styles.row}>
                          <View style={styles.label}>
                            <Text style={styles.text}>
                              {icons[key]} {label}
                            </Text>
                            {category.countsToTotal ? (
                              <Hint>
                                {value} × {rate} = {result?.categories[key] ?? 0} VP
                              </Hint>
                            ) : key === 'developmentStatus' ? (
                              <Hint>{scoreText('Số ngôi sao hiện tại')}</Hint>
                            ) : (
                              <Hint>{scoreText('Dùng khi bằng VP')}</Hint>
                            )}
                          </View>
                          <NumberField
                            accessibilityLabel={scoreText('{label} của {name}', {
                              label,
                              name: player.name,
                            })}
                            value={value}
                            min={min}
                            max={max ?? Number.MAX_SAFE_INTEGER}
                            width={54}
                            wholeNumbers
                            onChange={(next) => sheet.setValue(player.id, key, next)}
                          />
                        </View>
                      );
                    })}
                    {bonusPoints(player.id) > 0 ? (
                      <Hint>
                        ♟ {scoreText('Thẻ Công dân thưởng')} · 1 × {bonusPoints(player.id)} ={' '}
                        {bonusPoints(player.id)} VP
                      </Hint>
                    ) : null}
                  </Card>
                );
              })}
              {summary.error && state.players.length > 0 ? <Hint>{summary.error}</Hint> : null}
              <Button
                label={scoreText('Tổng kết ván')}
                disabled={!ready}
                onPress={() => setShowResults(true)}
              />
            </>
          )}
          {confirmReset ? (
            <Card>
              <Hint>
                {scoreText('Xóa toàn bộ điểm của ván hiện tại và giữ danh sách người chơi?')}
              </Hint>
              <View style={styles.wrap}>
                <Button
                  label={scoreText('Hủy')}
                  tone="ghost"
                  onPress={() => setConfirmReset(false)}
                />
                <Button
                  label={scoreText('Tạo ván mới')}
                  onPress={() => {
                    sheet.reset({ keepExtras: true });
                    setGameNumber((number) => number + 1);
                    setShowResults(false);
                    setConfirmReset(false);
                  }}
                />
              </View>
            </Card>
          ) : (
            <Button
              label={scoreText('Tạo ván mới')}
              tone="ghost"
              onPress={() => setConfirmReset(true)}
            />
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function OrleansResults({ sheet, onEdit }: { sheet: SheetApi; onEdit: () => void }) {
  const { language } = useAppPreferences();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [shareStatus, setShareStatus] = useState<'copied' | 'fallback' | null>(null);
  const { summary, template } = sheet;
  const rows = [...summary.rows].sort((a, b) => (a.rank ?? 0) - (b.rank ?? 0));
  const winner = rows[0];
  const track = summary.result?.players.find(({ id }) => id === winner?.id)?.categories
    .developmentTrackPosition;
  const tieNote =
    summary.winners.length > 1
      ? scoreText('Đồng chiến thắng vì bằng điểm và cùng vị trí trên đường phát triển.')
      : winner && rows[1]?.total === winner.total
        ? scoreText('{name} thắng vì đi xa hơn trên đường phát triển (vị trí {position}).', {
            name: winner.name,
            position: track ?? 0,
          })
        : null;
  const lines = rows.map(
    (row) =>
      `#${row.rank} ${row.name}${summary.winners.includes(row.id) ? ' 👑' : ''} · ${row.total} VP`,
  );
  const shareText = [scoreText('Kết quả Orléans'), ...lines, ...(tieNote ? [tieNote] : [])].join(
    '\n',
  );

  const share = async () => {
    try {
      if (Platform.OS === 'web') {
        await navigator.clipboard.writeText(shareText);
        setShareStatus('copied');
      } else {
        await Share.share({ message: shareText });
      }
    } catch {
      setShareStatus('fallback');
    }
  };

  return (
    <>
      <Card style={styles.rule}>
        <Heading>{scoreText('Kết quả Orléans')}</Heading>
        {tieNote ? <Hint>{tieNote}</Hint> : null}
      </Card>
      {rows.map((row, index) => {
        const result = summary.result?.players.find(({ id }) => id === row.id);
        return (
          <Card key={row.id}>
            <Heading>{lines[index]}</Heading>
            <Button
              label={expanded[row.id] ? scoreText('Ẩn chi tiết') : scoreText('Xem chi tiết điểm')}
              tone="ghost"
              onPress={() => setExpanded((current) => ({ ...current, [row.id]: !current[row.id] }))}
            />
            {expanded[row.id] ? (
              <>
                {template.categories
                  .filter(({ countsToTotal }) => countsToTotal)
                  .map(({ key, label, labelVi }) => (
                    <View style={styles.row} key={key}>
                      <Text style={styles.label}>
                        {language === 'en' ? label : (labelVi ?? label)}
                      </Text>
                      <Text style={styles.points}>{result?.categories[key] ?? 0} VP</Text>
                    </View>
                  ))}
                <Hint>
                  {scoreText('Vị trí trên đường phát triển')} ·{' '}
                  {result?.categories.developmentTrackPosition}
                </Hint>
              </>
            ) : null}
          </Card>
        );
      })}
      <Button
        label={Platform.OS === 'web' ? scoreText('Sao chép kết quả') : scoreText('Chia sẻ kết quả')}
        onPress={share}
      />
      {shareStatus === 'copied' ? <Hint>{scoreText('Đã sao chép kết quả.')}</Hint> : null}
      {shareStatus === 'fallback' ? (
        <Card>
          <Hint>{scoreText('Chọn văn bản bên dưới để sao chép kết quả.')}</Hint>
          <Text selectable style={styles.text}>
            {shareText}
          </Text>
        </Card>
      ) : null}
      <Button label={scoreText('Chỉnh sửa điểm')} tone="ghost" onPress={onEdit} />
    </>
  );
}

const styles = themeStyles(() =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.bg },
    content: { padding: 16, alignItems: 'center' },
    column: { width: '100%', maxWidth: 720, gap: 12 },
    row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
    wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    label: { flex: 1, color: colors.text, gap: 2 },
    text: { color: colors.text, fontWeight: '600' },
    points: { color: colors.warn, fontWeight: '800' },
    rule: { backgroundColor: colors.accentSoft, borderColor: colors.accent },
  }),
);
