import { t } from '../../../ui/i18n';
import { useAppPreferences } from '../../../ui/preferences';
import { Link, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { gangCards } from '../../../games/the-gang/cards';
import {
  discardActive,
  drawExtra,
  resolveHeist,
  startGame,
  totalDifficulty,
  VAULTS_TO_WIN,
  type GameConfig,
  type GangState,
  type Mode,
} from '../../../games/the-gang/engine';
import { MissionCard } from '../../../games/the-gang/mission-card';
import { useGangSession } from '../../../games/the-gang/use-session';
import { Button, Card, Chip, Collapsible, Heading, Hint } from '../../../ui/primitives';
import { themeStyles, colors, space } from '../../../ui/theme';

const MODES: { value: Mode; label: string; info: string }[] = [
  { value: 'basic', label: 'Cơ bản', info: 'Không dùng thẻ. Chỉ đếm két sắt và báo động.' },
  {
    value: 'advanced',
    label: 'Advanced',
    info: 'Phi vụ 1 không có thẻ. Thành công thì phi vụ sau rút 1 Thử thách, thất bại thì rút 1 Chuyên gia. Thẻ chỉ có hiệu lực 1 phi vụ.',
  },
  {
    value: 'professional',
    label: 'Professional',
    info: 'Như Advanced, bỏ thẻ C1. Rút ngẫu nhiên 1 Thử thách có hiệu lực cả ván.',
  },
  {
    value: 'master',
    label: 'Master Thief',
    info: 'Bỏ C1, không có Chuyên gia, thua khi kêu 2 báo động. Luôn có 2 Thử thách: mỗi phi vụ bỏ thẻ số nhỏ nhất và rút 1 thẻ mới.',
  },
  {
    value: 'homebrew',
    label: 'Homebrew',
    info: 'Target Difficulty: 1 thẻ Bất lợi cả ván, mỗi phi vụ thêm 1 Bất lợi + 1 Lợi thế. Rút thêm hoặc bỏ thẻ để tổng độ khó vào mức mong muốn.',
  },
];

function Setup({ onStart }: { onStart: (c: GameConfig) => void }) {
  useAppPreferences();
  const [mode, setMode] = useState<Mode>('advanced');
  const [shuffled, setShuffled] = useState(true);
  const [includeBase, setIncludeBase] = useState(true);
  const info = MODES.find((m) => m.value === mode)!.info;
  return (
    <Card>
      <Heading>{t('Chọn chế độ')}</Heading>
      <View style={styles.wrap}>
        {MODES.map((m) => (
          <Chip
            key={m.value}
            label={t(m.label)}
            selected={m.value === mode}
            onPress={() => setMode(m.value)}
          />
        ))}
      </View>
      <Hint>{t(info)}</Hint>
      {mode === 'advanced' || mode === 'professional' || mode === 'master' ? (
        <View style={styles.wrap}>
          <Chip label={t('Xáo bài')} selected={shuffled} onPress={() => setShuffled(true)} />
          <Chip
            label={t('Theo thứ tự 1–10 (lần đầu chơi)')}
            selected={!shuffled}
            onPress={() => setShuffled(false)}
          />
        </View>
      ) : null}
      {mode === 'homebrew' ? (
        <Chip
          label={t('Trộn cả 20 thẻ bộ gốc vào')}
          selected={includeBase}
          onPress={() => setIncludeBase((v) => !v)}
        />
      ) : null}
      <Button
        label={t('Bắt đầu')}
        onPress={() => onStart({ mode, shuffled, includeBaseInHomebrew: includeBase })}
      />
    </Card>
  );
}

function Tracker({ s }: { s: GangState }) {
  useAppPreferences();
  const dots = (n: number, max: number, on: string) =>
    Array.from({ length: max }, (_, i) => (
      <View key={i} style={[styles.dot, { backgroundColor: i < n ? on : colors.border }]} />
    ));
  return (
    <View style={styles.tracker}>
      <Text style={styles.heist}>
        {t('Phi vụ')} {s.heist}
      </Text>
      <View style={styles.dots}>
        <Text style={styles.meta}>{t('Két')}</Text>
        {dots(s.vaults, VAULTS_TO_WIN, '#d9a21b')}
      </View>
      <View style={styles.dots}>
        <Text style={styles.meta}>{t('Báo động')}</Text>
        {dots(s.alarms, s.maxAlarms, colors.danger)}
      </View>
    </View>
  );
}

export default function MissionsScreen() {
  useAppPreferences();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  if (slug !== 'the-gang-2024') return <Hint>{t('Game này chưa có công cụ rút nhiệm vụ.')}</Hint>;
  return <TheGangMissions />;
}

function TheGangMissions() {
  const { language } = useAppPreferences();
  const session = useGangSession();
  const [confirmReset, setConfirmReset] = useState(false);
  const { state: s } = session;
  const lang = language;
  if (!session.loaded) return null;

  const homebrew = s?.config.mode === 'homebrew';
  const modeLabel = MODES.find((m) => m.value === s?.config.mode)?.label;

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.column}>
        <Link href="/credits" style={styles.sourceLink}>
          {t('Nguồn luật và thẻ The Gang')}
        </Link>
        {!s ? (
          <Setup onStart={(c) => session.start(startGame(c))} />
        ) : (
          <>
            <Tracker s={s} />
            {s.status !== 'playing' ? (
              <Card
                style={{
                  backgroundColor: s.status === 'won' ? colors.successSoft : colors.dangerSoft,
                }}
              >
                <Heading>
                  {s.status === 'won'
                    ? t('Cả đội thắng! Phá đủ 3 két.')
                    : t('Thua rồi, báo động đã kêu.')}
                </Heading>
                <Text style={styles.meta}>
                  {modeLabel ? t(modeLabel) : ''} · {s.history.length} {t('phi vụ ·')} {s.vaults}{' '}
                  {t('thành công,')} {s.alarms} {t('thất bại')}
                </Text>
              </Card>
            ) : (
              <>
                {s.active.length === 0 ? (
                  <Hint>
                    {s.config.mode === 'basic'
                      ? t('Chế độ cơ bản không dùng thẻ.')
                      : t(
                          'Phi vụ này không có thẻ nào. Kết thúc phi vụ để rút thẻ cho phi vụ sau.',
                        )}
                  </Hint>
                ) : null}
                {s.active.map((a) => (
                  <MissionCard
                    key={a.code}
                    code={a.code}
                    permanent={a.scope === 'game'}
                    onDiscard={
                      homebrew && a.scope === 'heist'
                        ? () => session.apply((x) => discardActive(x, a.code))
                        : undefined
                    }
                  />
                ))}
                {homebrew ? (
                  <Card>
                    <Heading>
                      {t('Tổng độ khó:')}
                      {totalDifficulty(s) > 0 ? '+' : ''}
                      {totalDifficulty(s)}
                    </Heading>
                    <View style={styles.row}>
                      <View style={styles.flex}>
                        <Button
                          tone="ghost"
                          label={t('+ Bất lợi')}
                          onPress={() => session.apply((x) => drawExtra(x, 'bad'))}
                        />
                      </View>
                      <View style={styles.flex}>
                        <Button
                          tone="ghost"
                          label={t('+ Lợi thế')}
                          onPress={() => session.apply((x) => drawExtra(x, 'good'))}
                        />
                      </View>
                    </View>
                  </Card>
                ) : null}
                <Text style={styles.meta}>
                  {t('Kết thúc phi vụ')} {s.heist}:
                </Text>
                <View style={styles.row}>
                  <Pressable
                    accessibilityRole="button"
                    style={[styles.result, { backgroundColor: '#d9a21b' }]}
                    onPress={() => session.apply((x) => resolveHeist(x, 'success'))}
                  >
                    <Text style={styles.resultText}>{t('Thành công')}</Text>
                    <Text style={styles.resultSub}>{t('Lật két sắt')}</Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    style={[styles.result, { backgroundColor: colors.danger }]}
                    onPress={() => session.apply((x) => resolveHeist(x, 'fail'))}
                  >
                    <Text style={styles.resultText}>{t('Thất bại')}</Text>
                    <Text style={styles.resultSub}>{t('Báo động kêu')}</Text>
                  </Pressable>
                </View>
              </>
            )}

            <View style={styles.row}>
              <View style={styles.flex}>
                <Button
                  tone="ghost"
                  label={t('Hoàn tác')}
                  disabled={!session.canUndo}
                  onPress={session.undo}
                />
              </View>
              <View style={styles.flex}>
                <Button
                  tone="ghost"
                  label={
                    s.status !== 'playing'
                      ? t('Ván mới')
                      : confirmReset
                        ? t('Bấm lần nữa để xoá ván')
                        : t('Ván mới')
                  }
                  onPress={() => {
                    if (confirmReset || s.status !== 'playing') {
                      setConfirmReset(false);
                      session.reset();
                    } else setConfirmReset(true);
                  }}
                />
              </View>
            </View>

            {s.history.length ? (
              <Collapsible title={t('Lịch sử ({count} phi vụ)', { count: s.history.length })}>
                {s.history.map((h) => (
                  <Text key={h.heist} style={styles.meta}>
                    {h.result === 'success' ? '🟡' : '🔴'} {t('Phi vụ')} {h.heist}
                    {h.cards.length
                      ? ` · ${h.cards.map((c) => `${c} ${gangCards[c]?.title[lang] ?? ''}`).join(', ')}`
                      : ''}
                  </Text>
                ))}
              </Collapsible>
            ) : null}
          </>
        )}
      </View>
    </ScrollView>
  );
}

const styles = themeStyles(() =>
  StyleSheet.create({
    content: { padding: space.lg, alignItems: 'center' },
    column: { width: '100%', maxWidth: 560, gap: space.md },
    wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
    row: { flexDirection: 'row', gap: space.md },
    flex: { flex: 1 },
    meta: { color: colors.muted },
    sourceLink: { color: colors.primary, textDecorationLine: 'underline' },
    tracker: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      flexWrap: 'wrap',
      gap: space.sm,
      backgroundColor: colors.card,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      padding: space.md,
    },
    heist: { fontSize: 18, fontWeight: '800', color: colors.text },
    dots: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    dot: { width: 16, height: 16, borderRadius: 8 },
    result: { flex: 1, borderRadius: 12, paddingVertical: space.lg, alignItems: 'center' },
    resultText: { color: '#fff', fontSize: 18, fontWeight: '800' },
    resultSub: { color: 'rgba(255,255,255,.85)', fontSize: 12 },
  }),
);
