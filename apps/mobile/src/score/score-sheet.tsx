import { useState } from 'react';
import { ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NumberField } from '../ui/number-field';
import { Badge, Button, Card, Chip, Heading, Hint, Segmented } from '../ui/primitives';
import { colors } from '../ui/theme';
import { GenericCategories } from './generic-categories';
import { expansionsOf, isCoop, isRankable, needsOutcome, type SheetMode } from './model';
import { PlayerEditor } from './player-editor';
import { scoreInputRegistry } from './registry';
import { SummaryCard } from './summary-card';
import { useSheet } from './use-sheet';
import type { ScoreTemplate } from '@onboard/shared';

type InputStyle = 'custom' | 'generic';

export function ScoreSheet({ template }: { template: ScoreTemplate }) {
  const sheet = useSheet(template);
  const Custom = scoreInputRegistry[template.slug];
  const [inputStyle, setInputStyle] = useState<InputStyle>('custom');
  const { state } = sheet;
  const expansions = expansionsOf(template);
  const detailed = state.mode === 'detailed';

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
                  <Text style={styles.quickName}>{p.name}</Text>
                  <NumberField
                    value={state.quickTotals[p.id] ?? 0}
                    width={96}
                    onChange={(n) => sheet.setQuickTotal(p.id, n)}
                  />
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
                <Segmented<InputStyle>
                  value={inputStyle}
                  onChange={setInputStyle}
                  options={[
                    { value: 'custom', label: 'Giao diện riêng' },
                    { value: 'generic', label: 'Giao diện chung' },
                  ]}
                />
              ) : null}

              {Custom && inputStyle === 'custom' ? (
                <Custom sheet={sheet} />
              ) : (
                <GenericCategories sheet={sheet} />
              )}
            </>
          ) : isCoop(template) ? (
            <Hint>Chuyển sang chế độ Chi tiết để ghi số phi vụ thành công/thất bại.</Hint>
          ) : null}

          <Button label="Làm lại từ đầu" tone="ghost" onPress={sheet.reset} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, alignItems: 'center' },
  column: { width: '100%', maxWidth: 720, gap: 12 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  quickRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  quickName: { flex: 1, fontSize: 15, fontWeight: '600', color: colors.text },
});
