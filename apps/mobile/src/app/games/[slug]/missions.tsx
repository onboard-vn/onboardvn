import { useLocalSearchParams } from 'expo-router';
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
import { colors, space } from '../../../ui/theme';

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
  const [mode, setMode] = useState<Mode>('advanced');
  const [shuffled, setShuffled] = useState(true);
  const [includeBase, setIncludeBase] = useState(true);
  const info = MODES.find((m) => m.value === mode)!.info;
  return (
    <Card>
      <Heading>Chọn chế độ</Heading>
      <View style={styles.wrap}>
        {MODES.map((m) => (
          <Chip
            key={m.value}
            label={m.label}
            selected={m.value === mode}
            onPress={() => setMode(m.value)}
          />
        ))}
      </View>
      <Hint>{info}</Hint>
      {mode === 'advanced' || mode === 'professional' || mode === 'master' ? (
        <View style={styles.wrap}>
          <Chip label="Xáo bài" selected={shuffled} onPress={() => setShuffled(true)} />
          <Chip
            label="Theo thứ tự 1–10 (lần đầu chơi)"
            selected={!shuffled}
            onPress={() => setShuffled(false)}
          />
        </View>
      ) : null}
      {mode === 'homebrew' ? (
        <Chip
          label="Trộn cả 20 thẻ bộ gốc vào"
          selected={includeBase}
          onPress={() => setIncludeBase((v) => !v)}
        />
      ) : null}
      <Button
        label="Bắt đầu"
        onPress={() => onStart({ mode, shuffled, includeBaseInHomebrew: includeBase })}
      />
    </Card>
  );
}

function Tracker({ s }: { s: GangState }) {
  const dots = (n: number, max: number, on: string) =>
    Array.from({ length: max }, (_, i) => (
      <View key={i} style={[styles.dot, { backgroundColor: i < n ? on : colors.border }]} />
    ));
  return (
    <View style={styles.tracker}>
      <Text style={styles.heist}>Phi vụ {s.heist}</Text>
      <View style={styles.dots}>
        <Text style={styles.meta}>Két</Text>
        {dots(s.vaults, VAULTS_TO_WIN, '#d9a21b')}
      </View>
      <View style={styles.dots}>
        <Text style={styles.meta}>Báo động</Text>
        {dots(s.alarms, s.maxAlarms, colors.danger)}
      </View>
    </View>
  );
}

export default function MissionsScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  if (slug !== 'the-gang-2024') return <Hint>Game này chưa có công cụ rút nhiệm vụ.</Hint>;
  return <TheGangMissions />;
}

function TheGangMissions() {
  const session = useGangSession();
  const [confirmReset, setConfirmReset] = useState(false);
  const { state: s, lang } = session;
  if (!session.loaded) return null;

  const homebrew = s?.config.mode === 'homebrew';
  const modeLabel = MODES.find((m) => m.value === s?.config.mode)?.label;

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.column}>
        <View style={styles.langRow}>
          <Text style={styles.langLabel}>Ngôn ngữ nội dung thẻ</Text>
          <View style={styles.langChips} accessibilityRole="radiogroup">
            <Chip
              label="Tiếng Việt"
              selected={lang === 'vi'}
              onPress={() => session.setLang('vi')}
            />
            <Chip label="English" selected={lang === 'en'} onPress={() => session.setLang('en')} />
          </View>
        </View>

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
                    ? 'Cả đội thắng! Phá đủ 3 két.'
                    : 'Thua rồi, báo động đã kêu.'}
                </Heading>
                <Text style={styles.meta}>
                  {modeLabel} · {s.history.length} phi vụ · {s.vaults} thành công, {s.alarms} thất
                  bại
                </Text>
              </Card>
            ) : (
              <>
                {s.active.length === 0 ? (
                  <Hint>
                    {s.config.mode === 'basic'
                      ? 'Chế độ cơ bản không dùng thẻ.'
                      : 'Phi vụ này không có thẻ nào. Kết thúc phi vụ để rút thẻ cho phi vụ sau.'}
                  </Hint>
                ) : null}
                {s.active.map((a) => (
                  <MissionCard
                    key={a.code}
                    code={a.code}
                    lang={lang}
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
                      Tổng độ khó: {totalDifficulty(s) > 0 ? '+' : ''}
                      {totalDifficulty(s)}
                    </Heading>
                    <View style={styles.row}>
                      <View style={styles.flex}>
                        <Button
                          tone="ghost"
                          label="+ Bất lợi"
                          onPress={() => session.apply((x) => drawExtra(x, 'bad'))}
                        />
                      </View>
                      <View style={styles.flex}>
                        <Button
                          tone="ghost"
                          label="+ Lợi thế"
                          onPress={() => session.apply((x) => drawExtra(x, 'good'))}
                        />
                      </View>
                    </View>
                  </Card>
                ) : null}
                <Text style={styles.meta}>Kết thúc phi vụ {s.heist}:</Text>
                <View style={styles.row}>
                  <Pressable
                    accessibilityRole="button"
                    style={[styles.result, { backgroundColor: '#d9a21b' }]}
                    onPress={() => session.apply((x) => resolveHeist(x, 'success'))}
                  >
                    <Text style={styles.resultText}>Thành công</Text>
                    <Text style={styles.resultSub}>Lật két sắt</Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    style={[styles.result, { backgroundColor: colors.danger }]}
                    onPress={() => session.apply((x) => resolveHeist(x, 'fail'))}
                  >
                    <Text style={styles.resultText}>Thất bại</Text>
                    <Text style={styles.resultSub}>Báo động kêu</Text>
                  </Pressable>
                </View>
              </>
            )}

            <View style={styles.row}>
              <View style={styles.flex}>
                <Button
                  tone="ghost"
                  label="Hoàn tác"
                  disabled={!session.canUndo}
                  onPress={session.undo}
                />
              </View>
              <View style={styles.flex}>
                <Button
                  tone="ghost"
                  label={
                    s.status !== 'playing'
                      ? 'Ván mới'
                      : confirmReset
                        ? 'Bấm lần nữa để xoá ván'
                        : 'Ván mới'
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
              <Collapsible title={`Lịch sử (${s.history.length} phi vụ)`}>
                {s.history.map((h) => (
                  <Text key={h.heist} style={styles.meta}>
                    {h.result === 'success' ? '🟡' : '🔴'} Phi vụ {h.heist}
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

const styles = StyleSheet.create({
  langRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  langLabel: { color: colors.muted, fontSize: 14 },
  langChips: { flexDirection: 'row', gap: 8 },
  content: { padding: space.lg, alignItems: 'center' },
  column: { width: '100%', maxWidth: 560, gap: space.md },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  row: { flexDirection: 'row', gap: space.md },
  flex: { flex: 1 },
  meta: { color: colors.muted },
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
});
