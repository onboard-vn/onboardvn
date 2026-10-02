import type {
  BarcodeLookupResult,
  BulkAddGamesResult,
  CommunityAddGamesResult,
  GameUpcCandidate,
  LocalBarcodeLookupResult,
} from '@onboard/shared';
import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { api, ApiError } from '../../api/client';
import { Badge, Button, Card, Chip, Hint } from '../../ui/primitives';
import { colors, space } from '../../ui/theme';
import { errorMessage } from '../errors';
import { inputStyle } from '../search-input';
import { BarcodeScanner } from './barcode-scanner';
import { chunk } from './chunk';
import { applyCommunityBatchResult, type CommunityTotals } from './community-submit';
import { GamePicker, type ResolvedGame } from './game-picker';

interface CafeOption {
  id: string;
  name: string;
}

interface ScanEntry {
  code: string;
  status: 'loading' | 'local' | 'candidates' | 'unknown' | 'linked' | 'error';
  game?: ResolvedGame;
  candidates?: GameUpcCandidate[];
  providerError?: boolean;
  error?: string;
}

type ScanLookupMode = 'local' | 'provider';
type ScanMode = 'inventory' | 'community';

const COMMUNITY_CHUNK_SIZE = 20;
const NETWORK_ERROR = 'Mất kết nối, thử lại sau';

const displayName = (g: { nameVi: string | null; nameEn: string }) => g.nameVi || g.nameEn;

function ScanEntryRow({
  entry,
  lookup,
  mode,
  onLinked,
}: {
  entry: ScanEntry;
  lookup: ScanLookupMode;
  mode: ScanMode;
  onLinked: (code: string, game: ResolvedGame) => void;
}) {
  const [pending, setPending] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);

  const link = async (gameId: string, gameName: string, submitUpstream: boolean) => {
    if (lookup === 'local' || mode === 'community') {
      onLinked(entry.code, { id: gameId, name: gameName });
      return;
    }
    setPending(true);
    setLinkError(null);
    try {
      await api(`/barcodes/${encodeURIComponent(entry.code)}/link`, {
        method: 'POST',
        body: { gameId, submitUpstream },
      });
      onLinked(entry.code, { id: gameId, name: gameName });
    } catch (e) {
      setLinkError(e instanceof ApiError ? e.message : NETWORK_ERROR);
    } finally {
      setPending(false);
    }
  };

  return (
    <Card>
      <View style={styles.head}>
        <Text style={styles.code}>{entry.code}</Text>
        {entry.status === 'local' || entry.status === 'linked' ? (
          <Badge label={entry.game?.name ?? 'Đã gắn'} />
        ) : null}
        {entry.status === 'loading' ? <Hint>Đang tra cứu...</Hint> : null}
      </View>
      {entry.status === 'error' ? (
        <Text style={styles.error}>{entry.error ?? 'Không tra cứu được mã vạch'}</Text>
      ) : null}

      {entry.status === 'candidates' && entry.candidates ? (
        <View style={styles.stack}>
          {entry.candidates.map((c) => (
            <View key={c.bggId} style={styles.head}>
              <Text style={styles.name}>
                {c.name} <Text style={styles.muted}>({c.confidence}%)</Text>
                {c.localGame ? <Text style={styles.ok}> – có trong danh mục</Text> : null}
              </Text>
              {c.localGame ? (
                <Button
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
        <View style={styles.stack}>
          <Hint>
            {mode === 'community'
              ? 'Chưa có trong catalog, chọn game thủ công.'
              : entry.providerError
                ? 'Không tra cứu được từ GameUPC (lỗi tạm thời). Chọn game thủ công bên dưới.'
                : 'Chưa có gợi ý, chọn game thủ công.'}
          </Hint>
          <GamePicker onPick={(g) => void link(g.id, g.name, false)} />
        </View>
      ) : null}

      {linkError ? <Text style={styles.error}>{linkError}</Text> : null}
    </Card>
  );
}

export function ScanSession({
  cafes,
  lookup = 'provider',
  mode = 'inventory',
}: {
  cafes: CafeOption[];
  lookup?: ScanLookupMode;
  mode?: ScanMode;
}) {
  const effectiveLookup: ScanLookupMode = mode === 'community' ? 'local' : lookup;
  const [entries, setEntries] = useState<ScanEntry[]>([]);
  const [cafeId, setCafeId] = useState<string | undefined>(cafes[0]?.id);
  const [bulkPending, setBulkPending] = useState(false);
  const [bulkResult, setBulkResult] = useState<CommunityTotals | null>(null);
  const [bulkError, setBulkError] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState('');

  const patchEntry = (code: string, patch: (e: ScanEntry) => ScanEntry) =>
    setEntries((prev) => prev.map((e) => (e.code === code ? patch(e) : e)));

  const lookupCode = async (code: string) => {
    setEntries((prev) =>
      prev.some((e) => e.code === code) ? prev : [{ code, status: 'loading' }, ...prev],
    );
    const markError = (error: string) =>
      patchEntry(code, (e) => ({ ...e, status: 'error', error }));

    try {
      if (effectiveLookup === 'local') {
        const body = await api<LocalBarcodeLookupResult>(
          `/barcodes/local/${encodeURIComponent(code)}`,
        );
        patchEntry(code, (e) =>
          body.game
            ? { ...e, status: 'local', game: { id: body.game.id, name: displayName(body.game) } }
            : { ...e, status: 'unknown' },
        );
        return;
      }
      const body = await api<BarcodeLookupResult>(`/barcodes/${encodeURIComponent(code)}`);
      patchEntry(code, (e) => {
        if (body.kind === 'local') {
          return {
            ...e,
            status: 'local',
            game: { id: body.game.id, name: displayName(body.game) },
          };
        }
        if (body.kind === 'candidates') {
          return { ...e, status: 'candidates', candidates: body.items };
        }
        return { ...e, status: 'unknown', providerError: body.providerError };
      });
    } catch (e) {
      markError(e instanceof ApiError ? e.message : NETWORK_ERROR);
    }
  };

  const onManualSubmit = () => {
    const code = manualCode.trim();
    if (!code) return;
    setManualCode('');
    void lookupCode(code);
  };

  const onLinked = (code: string, game: ResolvedGame) =>
    patchEntry(code, (e) => ({ ...e, status: 'linked', game }));

  const readyGames = [
    ...new Map(
      entries
        .filter((e) => (e.status === 'local' || e.status === 'linked') && e.game)
        .map((e) => [e.game!.id, e.game!] as const),
    ).values(),
  ];

  const submitCommunity = async (
    id: string,
    gameIds: string[],
  ): Promise<{ totals: CommunityTotals; error?: string }> => {
    let totals: CommunityTotals = { added: 0, skipped: 0, skippedRemoved: 0 };
    for (const batch of chunk(gameIds, COMMUNITY_CHUNK_SIZE)) {
      try {
        const body = await api<CommunityAddGamesResult>(
          `/cafes/${encodeURIComponent(id)}/community-games`,
          { method: 'POST', body: { gameIds: batch } },
        );
        totals = applyCommunityBatchResult(totals, { kind: 'ok', ...body }).totals;
      } catch (e) {
        if (e instanceof ApiError && e.status === 409) {
          totals = applyCommunityBatchResult(totals, {
            kind: 'conflict',
            size: batch.length,
          }).totals;
          continue;
        }
        return applyCommunityBatchResult(totals, {
          kind: 'error',
          message: e instanceof ApiError ? e.message : NETWORK_ERROR,
        });
      }
    }
    return { totals };
  };

  const onBulkAdd = async () => {
    if (!cafeId || readyGames.length === 0) return;
    setBulkPending(true);
    setBulkResult(null);
    setBulkError(null);
    try {
      if (mode === 'community') {
        const { totals, error } = await submitCommunity(
          cafeId,
          readyGames.map((g) => g.id),
        );
        setBulkResult(totals);
        if (error) setBulkError(error);
        return;
      }
      const res = await api<BulkAddGamesResult>(`/cafes/${encodeURIComponent(cafeId)}/games/bulk`, {
        method: 'POST',
        body: { gameIds: readyGames.map((g) => g.id), addedVia: 'scan' },
      });
      setBulkResult({ ...res, skippedRemoved: 0 });
    } catch (e) {
      setBulkError(errorMessage(e, NETWORK_ERROR));
    } finally {
      setBulkPending(false);
    }
  };

  return (
    <View style={styles.root}>
      <BarcodeScanner onDetect={(code) => void lookupCode(code)} />

      <View style={styles.head}>
        <TextInput
          style={[inputStyle, styles.grow]}
          value={manualCode}
          onChangeText={setManualCode}
          onSubmitEditing={onManualSubmit}
          placeholder="Nhập mã vạch (EAN/UPC) khi camera kém"
          placeholderTextColor={colors.muted}
          keyboardType="number-pad"
          accessibilityLabel="Mã vạch"
        />
        <Button label="Tra cứu" onPress={onManualSubmit} />
      </View>

      <Card>
        <Text style={styles.label}>Địa điểm chơi</Text>
        <View style={styles.chips}>
          {cafes.map((c) => (
            <Chip
              key={c.id}
              label={c.name}
              selected={c.id === cafeId}
              onPress={() => setCafeId(c.id)}
            />
          ))}
        </View>
        <Button
          label={
            mode === 'community'
              ? `Đóng góp ${readyGames.length} game`
              : `Thêm ${readyGames.length} game vào kho`
          }
          disabled={!cafeId || readyGames.length === 0 || bulkPending}
          onPress={() => void onBulkAdd()}
        />
        {bulkResult ? (
          <Hint>
            Đã thêm {bulkResult.added}, bỏ qua {bulkResult.skipped} (đã có sẵn)
            {mode === 'community' && bulkResult.skippedRemoved
              ? `, ${bulkResult.skippedRemoved} bị quán gỡ nên cần xác nhận lại`
              : ''}
            .
          </Hint>
        ) : null}
        {bulkError ? <Text style={styles.error}>{bulkError}</Text> : null}
      </Card>

      <View style={styles.stack}>
        {entries.map((entry) => (
          <ScanEntryRow
            key={entry.code}
            entry={entry}
            lookup={effectiveLookup}
            mode={mode}
            onLinked={onLinked}
          />
        ))}
        {entries.length === 0 ? <Hint>Chưa quét mã nào trong phiên này.</Hint> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: space.lg },
  stack: { gap: space.sm },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.sm,
    flexWrap: 'wrap',
  },
  grow: { flex: 1, minWidth: 180 },
  code: { fontFamily: 'monospace', color: colors.text },
  name: { flex: 1, color: colors.text },
  muted: { color: colors.muted, fontSize: 12 },
  ok: { color: colors.success, fontSize: 12 },
  label: { fontSize: 13, fontWeight: '600', color: colors.muted },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  error: { color: colors.danger, fontSize: 13 },
});
