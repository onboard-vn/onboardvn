import type { InventoryImportApplyResponse, InventoryImportRowDto } from '@onboard/shared';
import { useState } from 'react';
import { Linking, Platform, StyleSheet, Text, View } from 'react-native';
import { api } from '../../api/client';
import { Badge, Button, Card, Hint } from '../../ui/primitives';
import { colors, space } from '../../ui/theme';
import { errorMessage } from '../errors';
import { GamePicker } from '../scan/game-picker';
import { NumberField } from '../../ui/number-field';
import { apiBody } from './request';
import { FilePick } from './file-pick';
import { CsvInput } from './csv-input';
import { FormError } from './form-bits';

interface RowState extends InventoryImportRowDto {
  selectedGameId: string | null;
  selectedGameName: string | null;
  copies: number;
}

const STATUS_LABEL: Record<InventoryImportRowDto['status'], string> = {
  matched: 'Khớp',
  suggested: 'Gợi ý',
  unmatched: 'Chưa khớp',
  error: 'Lỗi',
};

const toRowState = (row: InventoryImportRowDto): RowState => ({
  ...row,
  selectedGameId: row.gameId,
  selectedGameName: row.gameName,
  copies: row.input.copies,
});

const TEMPLATE_URL = '/templates/cafe-inventory.csv';

export function ImportManager({ cafeId, onApplied }: { cafeId: string; onApplied?: () => void }) {
  const [rows, setRows] = useState<RowState[] | null>(null);
  const [uploadPending, setUploadPending] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [applyPending, setApplyPending] = useState(false);
  const [applyError, setApplyError] = useState<string | null>(null);
  const [applyResult, setApplyResult] = useState<InventoryImportApplyResponse | null>(null);

  const dryRun = async (csv: string) => {
    setUploadPending(true);
    setUploadError(null);
    setApplyResult(null);
    setRows(null);
    try {
      const body = await apiBody<{ rows: InventoryImportRowDto[] }>(
        `/me/cafes/${encodeURIComponent(cafeId)}/inventory/import`,
        { method: 'POST', body: csv, contentType: 'text/csv', query: { dryRun: '1' } },
      );
      setRows(body.rows.map(toRowState));
    } catch (e) {
      setUploadError(errorMessage(e, 'Không đọc được file CSV'));
    } finally {
      setUploadPending(false);
    }
  };

  const onFile = (file: File) => {
    void file.text().then(dryRun, () => setUploadError('Không đọc được file CSV'));
  };

  const updateRow = (line: number, patch: Partial<RowState>) =>
    setRows((prev) => (prev ? prev.map((r) => (r.line === line ? { ...r, ...patch } : r)) : prev));

  const selectedCount = rows?.filter((r) => r.selectedGameId).length ?? 0;

  const onApply = async () => {
    if (!rows) return;
    const payload = rows
      .filter((r) => r.selectedGameId)
      .map((r) => ({ line: r.line, gameId: r.selectedGameId, copies: r.copies }));
    if (payload.length === 0) return;

    setApplyPending(true);
    setApplyError(null);
    try {
      setApplyResult(
        await api<InventoryImportApplyResponse>(
          `/me/cafes/${encodeURIComponent(cafeId)}/inventory/import/apply`,
          { method: 'POST', body: { rows: payload } },
        ),
      );
      onApplied?.();
    } catch (e) {
      setApplyError(errorMessage(e, 'Không áp dụng được import'));
    } finally {
      setApplyPending(false);
    }
  };

  return (
    <View style={styles.root}>
      <Card>
        <Text
          accessibilityRole="link"
          style={styles.link}
          onPress={() => void Linking.openURL(TEMPLATE_URL)}
        >
          Tải file mẫu CSV
        </Text>
        {Platform.OS === 'web' ? (
          <FilePick
            accept=".csv,text/csv"
            label="Chọn file CSV"
            disabled={uploadPending}
            onFile={onFile}
          />
        ) : (
          <CsvInput disabled={uploadPending} onCsv={(t) => void dryRun(t)} />
        )}
        {uploadPending ? <Hint>Đang đọc file...</Hint> : null}
        <FormError message={uploadError} />
      </Card>

      {rows ? (
        <View style={styles.root}>
          {rows.map((row) => (
            <Card key={row.line}>
              <View style={styles.head}>
                <Text style={styles.title}>
                  Dòng {row.line}: {row.input.name || '(trống)'}
                </Text>
                <Badge label={STATUS_LABEL[row.status]} />
              </View>
              {row.error ? <Text style={styles.error}>{row.error}</Text> : null}

              {row.selectedGameId ? (
                <View style={styles.head}>
                  <Text style={styles.muted}>→ {row.selectedGameName ?? row.gameName}</Text>
                  <NumberField
                    value={row.copies}
                    min={1}
                    max={99}
                    onChange={(copies) => updateRow(row.line, { copies })}
                  />
                  <Button
                    label="Bỏ qua"
                    tone="ghost"
                    onPress={() =>
                      updateRow(row.line, { selectedGameId: null, selectedGameName: null })
                    }
                  />
                </View>
              ) : null}

              {!row.selectedGameId && row.status !== 'error' ? (
                <View style={styles.root}>
                  {row.suggestions.map((s) => (
                    <View key={s.gameId} style={styles.head}>
                      <Text style={styles.suggestion}>
                        {s.name}{' '}
                        <Text style={styles.muted}>({Math.round(s.similarity * 100)}%)</Text>
                      </Text>
                      <Button
                        label="Dùng gợi ý này"
                        onPress={() =>
                          updateRow(row.line, {
                            selectedGameId: s.gameId,
                            selectedGameName: s.name,
                          })
                        }
                      />
                    </View>
                  ))}
                  <GamePicker
                    initialQuery={row.input.name}
                    onPick={(g) =>
                      updateRow(row.line, { selectedGameId: g.id, selectedGameName: g.name })
                    }
                  />
                </View>
              ) : null}
            </Card>
          ))}

          <Card>
            <Button
              label={`Thêm ${selectedCount} game vào kho`}
              disabled={selectedCount === 0 || applyPending}
              onPress={() => void onApply()}
            />
            {applyResult ? <Hint>Đã áp dụng {applyResult.rowsApplied} dòng.</Hint> : null}
            <FormError message={applyError} />
          </Card>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: space.md },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: space.sm,
  },
  title: { flex: 1, fontWeight: '600', color: colors.text },
  suggestion: { flex: 1, color: colors.text },
  muted: { color: colors.muted, fontSize: 13 },
  error: { color: colors.danger, fontSize: 13 },
  link: { color: colors.primary, textDecorationLine: 'underline', fontWeight: '600' },
});
