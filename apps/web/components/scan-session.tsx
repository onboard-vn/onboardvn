'use client';

import type {
  BarcodeLookupResult,
  GameUpcCandidate,
  LocalBarcodeLookupResult,
} from '@onboard/shared';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { BarcodeScanner } from '@/components/barcode-scanner';
import { GamePicker } from '@/components/game-picker';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { api } from '@/lib/api';
import { chunk } from '@/lib/chunk';
import { applyCommunityBatchResult, type CommunityTotals } from '@/lib/community-submit';

interface CafeOption {
  id: string;
  name: string;
}

interface ResolvedGame {
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

/** 'provider' (default, /admin/scan): looks up GameUPC and lets maintainers teach the system a
 * new barcode<->game link. 'local' (café-scoped /my-cafes/.../scan): owners/staff aren't allowed
 * to call the maintainer-only barcode/link endpoints, so lookup only checks barcodes already
 * linked locally and picking a game just stages it for bulk-add, without linking the barcode. */
type ScanLookupMode = 'local' | 'provider';

/** 'inventory' (default): scan feeds a café's own inventory via the bulk-add route.
 * 'community': any signed-in verified user contributes a game to a public café's inventory via
 * the community-games route — barcode lookup is always local-only, regardless of `lookup`. */
type ScanMode = 'inventory' | 'community';

const NETWORK_ERROR = 'Mất kết nối, thử lại sau';
const COMMUNITY_CHUNK_SIZE = 20;

async function errorMessage(res: Response): Promise<string | undefined> {
  const json = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
  return json?.error?.message;
}

function displayName(g: { nameVi: string | null; nameEn: string }): string {
  return g.nameVi || g.nameEn;
}

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

  async function link(gameId: string, gameName: string, submitUpstream: boolean) {
    // Owners/community contributors can't call the maintainer-only /barcodes/:code/link
    // endpoint — just stage the pick.
    if (lookup === 'local' || mode === 'community') {
      onLinked(entry.code, { id: gameId, name: gameName });
      return;
    }
    setPending(true);
    setLinkError(null);
    try {
      const res = await api.api.barcodes[':code'].link.$post({
        param: { code: entry.code },
        json: { gameId, submitUpstream },
      });
      if (!res.ok) {
        setLinkError((await errorMessage(res)) ?? 'Không gắn được mã vạch');
        return;
      }
      onLinked(entry.code, { id: gameId, name: gameName });
    } catch {
      setLinkError(NETWORK_ERROR);
    } finally {
      setPending(false);
    }
  }

  return (
    <li className="flex flex-col gap-2 rounded-lg border p-3 text-sm">
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono">{entry.code}</span>
        {entry.status === 'local' || entry.status === 'linked' ? (
          <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-xs text-emerald-800">
            {entry.game ? displayName({ nameVi: null, nameEn: entry.game.name }) : 'Đã gắn'}
          </span>
        ) : null}
        {entry.status === 'loading' ? (
          <span className="text-muted-foreground text-xs">Đang tra cứu...</span>
        ) : null}
      </div>

      {entry.status === 'candidates' && entry.candidates ? (
        <div className="flex flex-col gap-2">
          <ul className="flex flex-col gap-1">
            {entry.candidates.map((c) => (
              <li key={c.bggId} className="flex items-center justify-between gap-2">
                <span>
                  {c.name} <span className="text-muted-foreground text-xs">({c.confidence}%)</span>
                  {c.localGame ? (
                    <span className="ml-1 text-emerald-700 text-xs">– có trong danh mục</span>
                  ) : null}
                </span>
                {c.localGame ? (
                  <Button
                    size="xs"
                    disabled={pending}
                    onClick={() => void link(c.localGame!.id, displayName(c.localGame!), true)}
                  >
                    Dùng gợi ý này
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
          <GamePicker
            initialQuery={entry.candidates[0]?.name}
            onPick={(g) => void link(g.id, g.name, false)}
          />
        </div>
      ) : null}

      {entry.status === 'unknown' ? (
        <div className="flex flex-col gap-2">
          <p className="text-muted-foreground text-xs">
            {mode === 'community'
              ? 'Chưa có trong catalog, chọn game thủ công.'
              : entry.providerError
                ? 'Không tra cứu được từ GameUPC (lỗi tạm thời). Chọn game thủ công bên dưới.'
                : 'Chưa có gợi ý, chọn game thủ công.'}
          </p>
          <GamePicker onPick={(g) => void link(g.id, g.name, false)} />
        </div>
      ) : null}

      {linkError ? <p className="text-destructive text-xs">{linkError}</p> : null}
    </li>
  );
}

interface BulkResult {
  added: number;
  skipped: number;
  skippedRemoved?: number;
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
  const router = useRouter();
  const effectiveLookup: ScanLookupMode = mode === 'community' ? 'local' : lookup;
  const [entries, setEntries] = useState<ScanEntry[]>([]);
  const [cafeId, setCafeId] = useState<string | undefined>(cafes[0]?.id);
  const [bulkPending, setBulkPending] = useState(false);
  const [bulkResult, setBulkResult] = useState<BulkResult | null>(null);
  const [bulkError, setBulkError] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState('');

  async function lookupCode(code: string) {
    setEntries((prev) => {
      if (prev.some((e) => e.code === code)) return prev;
      return [{ code, status: 'loading' }, ...prev];
    });

    const markError = (error: string | undefined) =>
      setEntries((prev) =>
        prev.map((e) => (e.code === code ? { ...e, status: 'error', error } : e)),
      );

    if (effectiveLookup === 'local') {
      let localRes: Awaited<ReturnType<(typeof api.api.barcodes.local)[':code']['$get']>>;
      try {
        localRes = await api.api.barcodes.local[':code'].$get({ param: { code } });
      } catch {
        markError(NETWORK_ERROR);
        return;
      }
      if (!localRes.ok) {
        markError(await errorMessage(localRes));
        return;
      }
      const body = (await localRes.json()) as LocalBarcodeLookupResult;
      setEntries((prev) =>
        prev.map((e) => {
          if (e.code !== code) return e;
          return body.game
            ? { ...e, status: 'local', game: { id: body.game.id, name: displayName(body.game) } }
            : { ...e, status: 'unknown' };
        }),
      );
      return;
    }

    let res: Awaited<ReturnType<(typeof api.api.barcodes)[':code']['$get']>>;
    try {
      res = await api.api.barcodes[':code'].$get({ param: { code } });
    } catch {
      markError(NETWORK_ERROR);
      return;
    }
    if (!res.ok) {
      markError(await errorMessage(res));
      return;
    }
    const body = (await res.json()) as BarcodeLookupResult;
    setEntries((prev) =>
      prev.map((e) => {
        if (e.code !== code) return e;
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
      }),
    );
  }

  function onDetect(code: string) {
    void lookupCode(code);
  }

  function onManualSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const code = manualCode.trim();
    if (!code) return;
    setManualCode('');
    void lookupCode(code);
  }

  function onLinked(code: string, game: ResolvedGame) {
    setEntries((prev) => prev.map((e) => (e.code === code ? { ...e, status: 'linked', game } : e)));
  }

  const readyGameIds = [
    ...new Map(
      entries
        .filter((e) => (e.status === 'local' || e.status === 'linked') && e.game)
        .map((e) => [e.game!.id, e.game!] as const),
    ).values(),
  ];

  /** Submits in batches of `COMMUNITY_CHUNK_SIZE`. A 409 (whole batch previously removed by
   * staff/owner) is folded into `skippedRemoved` and submission continues; any other failure
   * stops the loop but keeps the totals already accumulated from earlier batches. */
  async function submitCommunity(
    id: string,
    gameIds: string[],
  ): Promise<{ totals: CommunityTotals; error?: string }> {
    let totals: CommunityTotals = { added: 0, skipped: 0, skippedRemoved: 0 };
    for (const batch of chunk(gameIds, COMMUNITY_CHUNK_SIZE)) {
      let res: Awaited<ReturnType<(typeof api.api.cafes)[':id']['community-games']['$post']>>;
      try {
        res = await api.api.cafes[':id']['community-games'].$post({
          param: { id },
          json: { gameIds: batch },
        });
      } catch {
        return applyCommunityBatchResult(totals, { kind: 'error', message: NETWORK_ERROR });
      }
      // Success is typed as the literal 201, so a plain `res.status === 409` comparison doesn't
      // type-check — widen to `number` first.
      if ((res.status as number) === 409) {
        totals = applyCommunityBatchResult(totals, {
          kind: 'conflict',
          size: batch.length,
        }).totals;
        continue;
      }
      if (!res.ok) {
        const step = applyCommunityBatchResult(totals, {
          kind: 'error',
          message: (await errorMessage(res)) ?? 'Không đóng góp được game',
        });
        return step;
      }
      const body = await res.json();
      totals = applyCommunityBatchResult(totals, { kind: 'ok', ...body }).totals;
    }
    return { totals };
  }

  async function onBulkAdd() {
    if (!cafeId || readyGameIds.length === 0) return;
    setBulkPending(true);
    setBulkResult(null);
    setBulkError(null);
    try {
      if (mode === 'community') {
        const { totals, error } = await submitCommunity(
          cafeId,
          readyGameIds.map((g) => g.id),
        );
        setBulkResult(totals);
        if (error) setBulkError(error);
        if (totals.added > 0) router.refresh();
        return;
      }
      const res = await api.api.cafes[':id'].games.bulk.$post({
        param: { id: cafeId },
        json: { gameIds: readyGameIds.map((g) => g.id), addedVia: 'scan' },
      });
      if (!res.ok) {
        setBulkError((await errorMessage(res)) ?? 'Không thêm được game vào kho');
        return;
      }
      setBulkResult(await res.json());
      router.refresh();
    } catch (err) {
      setBulkError(err instanceof Error ? err.message : NETWORK_ERROR);
    } finally {
      setBulkPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <BarcodeScanner onDetect={onDetect} />

      <form onSubmit={onManualSubmit} className="flex items-end gap-2">
        <Input
          value={manualCode}
          onChange={(e) => setManualCode(e.target.value)}
          placeholder="Nhập mã vạch (EAN/UPC) khi camera kém"
          className="flex-1"
        />
        <Button type="submit">Tra cứu</Button>
      </form>

      <div className="flex flex-col gap-3 rounded-lg border p-4">
        <div className="flex flex-wrap items-center gap-3">
          <label className="text-sm font-medium" htmlFor="cafe-select">
            Địa điểm chơi
          </label>
          <Select
            value={cafeId}
            onValueChange={(value) => setCafeId(typeof value === 'string' ? value : undefined)}
          >
            <SelectTrigger id="cafe-select">
              <SelectValue placeholder="Chọn địa điểm chơi" />
            </SelectTrigger>
            <SelectContent>
              {cafes.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            disabled={!cafeId || readyGameIds.length === 0 || bulkPending}
            onClick={() => void onBulkAdd()}
          >
            {mode === 'community'
              ? `Đóng góp ${readyGameIds.length} game`
              : `Thêm ${readyGameIds.length} game vào kho`}
          </Button>
        </div>
        {bulkResult ? (
          <p className="text-sm text-muted-foreground">
            Đã thêm {bulkResult.added}, bỏ qua {bulkResult.skipped} (đã có sẵn)
            {mode === 'community' && bulkResult.skippedRemoved
              ? `, ${bulkResult.skippedRemoved} bị quán gỡ nên cần xác nhận lại`
              : ''}
            .
          </p>
        ) : null}
        {bulkError ? <p className="text-sm text-destructive">{bulkError}</p> : null}
      </div>

      <ul className="flex flex-col gap-2">
        {entries.map((entry) => (
          <ScanEntryRow
            key={entry.code}
            entry={entry}
            lookup={effectiveLookup}
            mode={mode}
            onLinked={onLinked}
          />
        ))}
        {entries.length === 0 ? (
          <li className="text-muted-foreground text-sm">Chưa quét mã nào trong phiên này.</li>
        ) : null}
      </ul>
    </div>
  );
}
