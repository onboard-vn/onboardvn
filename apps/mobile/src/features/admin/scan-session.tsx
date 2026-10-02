import type { BarcodeLookupResult, BulkAddGamesResult } from '@onboard/shared';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { api } from '../../api/client';
import { Badge, Button, Card, Hint } from '../../ui/primitives';
import { colors, space } from '../../ui/theme';
import { errorMessage } from '../errors';
import { BarcodeScanner } from './barcode-scanner';
import { displayName, type ResolvedGame } from './game-name';
import { GamePicker } from './game-picker';
import { applyLookup, readyGames, type ScanEntry } from './scan-entries';
import { ErrorText, Field, PickerField, SmallButton } from './ui';

const NETWORK_ERROR = 'Mất kết nối, thử lại sau';

function ScanEntryRow({
  entry,
  onLinked,
}: {
  entry: ScanEntry;
  onLinked: (code: string, game: ResolvedGame) => void;
}) {
  const [pending, setPending] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);

  async function link(gameId: string, gameName: string, submitUpstream: boolean) {
    setPending(true);
    setLinkError(null);
    try {
      await api(`/barcodes/${encodeURIComponent(entry.code)}/link`, {
        method: 'POST',
        body: { gameId, submitUpstream },
      });
      onLinked(entry.code, { id: gameId, name: gameName });
    } catch (e) {
      setLinkError(errorMessage(e, 'Không gắn được mã vạch'));
    } finally {
      setPending(false);
    }
  }

  return (
    <Card>
      <View style={styles.between}>
        <Text style={styles.code}>{entry.code}</Text>
        {entry.status === 'local' || entry.status === 'linked' ? (
          <Badge label={entry.game?.name ?? 'Đã gắn'} />
        ) : null}
        {entry.status === 'loading' ? <Hint>Đang tra cứu...</Hint> : null}
      </View>

      {entry.status === 'error' ? <ErrorText message={entry.error ?? NETWORK_ERROR} /> : null}

      {entry.status === 'candidates' && entry.candidates ? (
        <View style={{ gap: space.sm }}>
          {entry.candidates.map((c) => (
            <View key={c.bggId} style={styles.between}>
              <Text style={styles.text}>
                {c.name} <Text style={styles.muted}>({c.confidence}%)</Text>
                {c.localGame ? <Text style={styles.ok}> – có trong danh mục</Text> : null}
              </Text>
              {c.localGame ? (
                <SmallButton
                  tone="solid"
                  label="Dùng gợi ý này"
                  disabled={pending}
                  onPress={() => void link(c.localGame!.id, displayName(c.localGame!), true)}
                />
              ) : null}
            </View>
          ))}
          <GamePicker
            initialQuery={entry.candidates[0]?.name}
            onPick={(g) => void link(g.id, g.name, false)}
          />
        </View>
      ) : null}

      {entry.status === 'unknown' ? (
        <View style={{ gap: space.sm }}>
          <Hint>
            {entry.providerError
              ? 'Không tra cứu được từ GameUPC (lỗi tạm thời). Chọn game thủ công bên dưới.'
              : 'Chưa có gợi ý, chọn game thủ công.'}
          </Hint>
          <GamePicker onPick={(g) => void link(g.id, g.name, false)} />
        </View>
      ) : null}

      <ErrorText message={linkError} />
    </Card>
  );
}

export function ScanSession({ cafes }: { cafes: { id: string; name: string }[] }) {
  const [entries, setEntries] = useState<ScanEntry[]>([]);
  const [cafeId, setCafeId] = useState<string>(cafes[0]?.id ?? '');
  const [bulkPending, setBulkPending] = useState(false);
  const [bulkResult, setBulkResult] = useState<BulkAddGamesResult | null>(null);
  const [bulkError, setBulkError] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState('');

  const update = (code: string, fn: (e: ScanEntry) => ScanEntry) =>
    setEntries((prev) => prev.map((e) => (e.code === code ? fn(e) : e)));

  async function lookupCode(code: string) {
    setEntries((prev) =>
      prev.some((e) => e.code === code) ? prev : [{ code, status: 'loading' }, ...prev],
    );
    try {
      const body = await api<BarcodeLookupResult>(`/barcodes/${encodeURIComponent(code)}`);
      update(code, (e) => applyLookup(e, body));
    } catch (e) {
      update(code, (cur) => ({ ...cur, status: 'error', error: errorMessage(e, NETWORK_ERROR) }));
    }
  }

  function onManualSubmit() {
    const code = manualCode.trim();
    if (!code) return;
    setManualCode('');
    void lookupCode(code);
  }

  const ready = readyGames(entries);

  async function onBulkAdd() {
    if (!cafeId || ready.length === 0) return;
    setBulkPending(true);
    setBulkResult(null);
    setBulkError(null);
    try {
      setBulkResult(
        await api<BulkAddGamesResult>(`/cafes/${cafeId}/games/bulk`, {
          method: 'POST',
          body: { gameIds: ready.map((g) => g.id), addedVia: 'scan' },
        }),
      );
    } catch (e) {
      setBulkError(errorMessage(e, 'Không thêm được game vào kho'));
    } finally {
      setBulkPending(false);
    }
  }

  return (
    <View style={{ gap: space.xl }}>
      <BarcodeScanner onDetect={(code) => void lookupCode(code)} />

      <View style={styles.between}>
        <View style={{ flex: 1 }}>
          <Field
            value={manualCode}
            onChangeText={setManualCode}
            placeholder="Nhập mã vạch (EAN/UPC) khi camera kém"
            keyboardType="number-pad"
          />
        </View>
        <Button label="Tra cứu" onPress={onManualSubmit} />
      </View>

      <Card>
        <PickerField
          label="Địa điểm chơi"
          placeholder="Chọn địa điểm chơi"
          value={cafeId}
          options={cafes.map((c) => ({ value: c.id, label: c.name }))}
          onChange={setCafeId}
        />
        <Button
          label={`Thêm ${ready.length} game vào kho`}
          disabled={!cafeId || ready.length === 0 || bulkPending}
          onPress={() => void onBulkAdd()}
        />
        {bulkResult ? (
          <Hint>
            Đã thêm {bulkResult.added}, bỏ qua {bulkResult.skipped} (đã có sẵn).
          </Hint>
        ) : null}
        <ErrorText message={bulkError} />
      </Card>

      <View style={{ gap: space.sm }}>
        {entries.map((entry) => (
          <ScanEntryRow
            key={entry.code}
            entry={entry}
            onLinked={(code, game) => update(code, (e) => ({ ...e, status: 'linked', game }))}
          />
        ))}
        {entries.length === 0 ? <Hint>Chưa quét mã nào trong phiên này.</Hint> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  between: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.sm,
  },
  code: { fontFamily: 'monospace', fontSize: 15, color: colors.text },
  text: { fontSize: 14, color: colors.text, flex: 1 },
  muted: { fontSize: 12, color: colors.muted },
  ok: { fontSize: 12, color: colors.success },
});
