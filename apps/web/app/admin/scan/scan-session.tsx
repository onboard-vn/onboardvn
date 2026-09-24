'use client';

import type { BarcodeLookupResult, GameUpcCandidate } from '@onboard/shared';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { BarcodeScanner } from '@/components/barcode-scanner';
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

const NETWORK_ERROR = 'Mất kết nối, thử lại sau';

async function errorMessage(res: Response): Promise<string | undefined> {
  const json = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
  return json?.error?.message;
}

function displayName(g: { nameVi: string | null; nameEn: string }): string {
  return g.nameVi || g.nameEn;
}

function GamePicker({
  onPick,
  initialQuery,
}: {
  onPick: (game: ResolvedGame) => void;
  initialQuery?: string;
}) {
  const [results, setResults] = useState<{ id: string; nameVi: string | null; nameEn: string }[]>(
    [],
  );
  const [searched, setSearched] = useState(false);

  async function onSearch(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const q = String(new FormData(e.currentTarget).get('q') ?? '').trim();
    setSearched(true);
    if (!q) {
      setResults([]);
      return;
    }
    const res = await api.api.games.$get({ query: { q, pageSize: '10' } });
    setResults(res.ok ? (await res.json()).items : []);
  }

  return (
    <div className="flex flex-col gap-2">
      <form onSubmit={onSearch} className="flex items-end gap-2">
        <Input
          name="q"
          placeholder="Tìm game trong danh mục..."
          defaultValue={initialQuery}
          className="flex-1"
        />
        <Button type="submit" size="sm">
          Tìm
        </Button>
      </form>
      {searched && results.length === 0 ? (
        <div className="flex items-center justify-between gap-2 text-sm">
          <span className="text-muted-foreground">Không tìm thấy.</span>
          <Button
            size="xs"
            variant="outline"
            render={
              <Link href={`/admin/games/new?nameEn=${encodeURIComponent(initialQuery ?? '')}`} />
            }
          >
            Tạo game nhanh
          </Button>
        </div>
      ) : null}
      {results.length > 0 ? (
        <ul className="flex flex-col gap-1 text-sm">
          {results.map((g) => (
            <li key={g.id} className="flex items-center justify-between gap-2">
              <span>{displayName(g)}</span>
              <Button size="xs" onClick={() => onPick({ id: g.id, name: displayName(g) })}>
                Chọn
              </Button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

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
            {entry.providerError
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

export function ScanSession({ cafes }: { cafes: CafeOption[] }) {
  const router = useRouter();
  const [entries, setEntries] = useState<ScanEntry[]>([]);
  const [cafeId, setCafeId] = useState<string | undefined>(cafes[0]?.id);
  const [bulkPending, setBulkPending] = useState(false);
  const [bulkResult, setBulkResult] = useState<{ added: number; skipped: number } | null>(null);
  const [bulkError, setBulkError] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState('');

  async function lookup(code: string) {
    setEntries((prev) => {
      if (prev.some((e) => e.code === code)) return prev;
      return [{ code, status: 'loading' }, ...prev];
    });

    const markError = (error: string | undefined) =>
      setEntries((prev) =>
        prev.map((e) => (e.code === code ? { ...e, status: 'error', error } : e)),
      );

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
    void lookup(code);
  }

  function onManualSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const code = manualCode.trim();
    if (!code) return;
    setManualCode('');
    void lookup(code);
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

  async function onBulkAdd() {
    if (!cafeId || readyGameIds.length === 0) return;
    setBulkPending(true);
    setBulkResult(null);
    setBulkError(null);
    try {
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
    } catch {
      setBulkError(NETWORK_ERROR);
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
            Quán
          </label>
          <Select
            value={cafeId}
            onValueChange={(value) => setCafeId(typeof value === 'string' ? value : undefined)}
          >
            <SelectTrigger id="cafe-select">
              <SelectValue placeholder="Chọn quán" />
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
            Thêm {readyGameIds.length} game vào kho
          </Button>
        </div>
        {bulkResult ? (
          <p className="text-sm text-muted-foreground">
            Đã thêm {bulkResult.added}, bỏ qua {bulkResult.skipped} (đã có sẵn).
          </p>
        ) : null}
        {bulkError ? <p className="text-sm text-destructive">{bulkError}</p> : null}
      </div>

      <ul className="flex flex-col gap-2">
        {entries.map((entry) => (
          <ScanEntryRow key={entry.code} entry={entry} onLinked={onLinked} />
        ))}
        {entries.length === 0 ? (
          <li className="text-muted-foreground text-sm">Chưa quét mã nào trong phiên này.</li>
        ) : null}
      </ul>
    </div>
  );
}
