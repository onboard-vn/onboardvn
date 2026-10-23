import { useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { FinishReceipt } from '../api/plays-types';
import { Button, Heading, Hint } from '../ui/primitives';
import { themeStyles, colors } from '../ui/theme';
import type { Summary } from './model';
import type { SheetApi } from './use-sheet';
import { scoreFeedbackText, scoreLocale, scorePlayerName, scoreText } from './localization';
import { useAppPreferences } from '../ui/preferences';

export const receiptLines = (r: FinishReceipt): string[] => [
  scoreText('Đã lưu vào lịch sử của {memberCount} người', { memberCount: r.memberCount }),
  ...(r.guestCount > 0
    ? [scoreText('{guestCount} khách sẽ thấy khi nhận hồ sơ', { guestCount: r.guestCount })]
    : []),
];

export function FinishDialog({
  sheet,
  summary: suppliedSummary,
  visible,
  onClose,
  onConfirm,
  onDone,
}: {
  sheet: SheetApi;
  summary?: Summary;
  visible: boolean;
  onClose: () => void;
  onConfirm: () => Promise<FinishReceipt>;
  onDone: () => void;
}) {
  const { language } = useAppPreferences();
  const fmt = (n: number) => n.toLocaleString(scoreLocale(language));
  const summary = suppliedSummary ?? sheet.summary;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<FinishReceipt | null>(null);
  const rows = [...summary.rows].sort((a, b) => (a.rank ?? 99) - (b.rank ?? 99));

  const confirm = async () => {
    setBusy(true);
    setError(null);
    try {
      setReceipt(await onConfirm());
    } catch {
      setError('Không thể lưu ván. Kiểm tra kết nối rồi thử lại.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.dialog}>
          {receipt ? (
            <>
              <Heading>{scoreText('Đã kết thúc ván')}</Heading>
              {receiptLines(receipt).map((l) => (
                <Text key={l} style={styles.receipt}>
                  {l}
                </Text>
              ))}
              <Button label={scoreText('Về danh sách bàn')} onPress={onDone} />
            </>
          ) : (
            <>
              <Heading>{scoreText('Xác nhận kết thúc ván')}</Heading>
              {summary.error ? (
                <Text style={styles.error}>{scoreFeedbackText(summary.error)}</Text>
              ) : null}
              <ScrollView style={{ maxHeight: 320 }}>
                {rows.map((r) => {
                  const won = summary.winners.includes(r.id);
                  return (
                    <View key={r.id} style={[styles.row, won && styles.win]}>
                      <Text style={styles.rank}>{r.rank ? `#${r.rank}` : ''}</Text>
                      <Text style={styles.name} numberOfLines={1}>
                        {scorePlayerName(
                          sheet.state.players.find((player) => player.id === r.id) ?? {
                            name: r.name,
                          },
                        )}
                        {won ? '  🏆' : ''}
                      </Text>
                      <Text style={styles.total}>{fmt(r.total)}</Text>
                    </View>
                  );
                })}
              </ScrollView>
              {summary.note ? <Hint>{scoreFeedbackText(summary.note)}</Hint> : null}
              {error ? <Text style={styles.error}>{scoreFeedbackText(error)}</Text> : null}
              <Button
                label={busy ? scoreText('Đang lưu...') : scoreText('Xác nhận kết thúc')}
                onPress={confirm}
                disabled={busy || !!summary.error}
              />
              <Button
                label={scoreText('Quay lại sửa')}
                tone="ghost"
                onPress={onClose}
                disabled={busy}
              />
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = themeStyles(() =>
  StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.4)',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 16,
    },
    dialog: {
      width: '100%',
      maxWidth: 480,
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 18,
      gap: 12,
    },
    row: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 8, borderRadius: 10 },
    win: { backgroundColor: colors.successSoft },
    rank: { width: 30, fontWeight: '700', color: colors.muted },
    name: { flex: 1, fontSize: 16, color: colors.text },
    total: { fontSize: 18, fontWeight: '800', color: colors.text },
    receipt: { fontSize: 15, color: colors.text },
    error: { color: colors.danger, fontSize: 14 },
  }),
);
