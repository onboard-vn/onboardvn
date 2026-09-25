'use client';

import type { InventoryImportRowDto } from '@onboard/shared';
import { useRouter } from 'next/navigation';
import { useState, type ChangeEvent } from 'react';
import { FormError } from '@/components/form-error';
import { GamePicker } from '@/components/game-picker';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';

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

const STATUS_CLASS: Record<InventoryImportRowDto['status'], string> = {
  matched: 'bg-emerald-100 text-emerald-800',
  suggested: 'bg-amber-100 text-amber-800',
  unmatched: 'bg-slate-100 text-slate-700',
  error: 'bg-red-100 text-red-800',
};

async function errorMessage(res: Response): Promise<string | undefined> {
  const json = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
  return json?.error?.message;
}

function toRowState(row: InventoryImportRowDto): RowState {
  return {
    ...row,
    selectedGameId: row.gameId,
    selectedGameName: row.gameName,
    copies: row.input.copies,
  };
}

export function ImportManager({ cafeId }: { cafeId: string }) {
  const router = useRouter();
  const [rows, setRows] = useState<RowState[] | null>(null);
  const [uploadPending, setUploadPending] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [applyPending, setApplyPending] = useState(false);
  const [applyError, setApplyError] = useState<string | null>(null);
  const [applyResult, setApplyResult] = useState<{ rowsApplied: number } | null>(null);

  async function onFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setUploadPending(true);
    setUploadError(null);
    setApplyResult(null);
    setRows(null);

    try {
      const form = new FormData();
      form.set('file', file);
      const res = await fetch(`/api/me/cafes/${cafeId}/inventory/import?dryRun=1`, {
        method: 'POST',
        credentials: 'include',
        body: form,
      });
      if (!res.ok) {
        setUploadError((await errorMessage(res)) ?? 'Không đọc được file CSV');
        return;
      }
      const body = (await res.json()) as { rows: InventoryImportRowDto[] };
      setRows(body.rows.map(toRowState));
    } catch {
      setUploadError('Mất kết nối, thử lại sau');
    } finally {
      setUploadPending(false);
    }
  }

  function updateRow(line: number, patch: Partial<RowState>) {
    setRows((prev) => (prev ? prev.map((r) => (r.line === line ? { ...r, ...patch } : r)) : prev));
  }

  async function onApply() {
    if (!rows) return;
    const payload = rows
      .filter((r) => r.selectedGameId)
      .map((r) => ({ line: r.line, gameId: r.selectedGameId, copies: r.copies }));
    if (payload.length === 0) return;

    setApplyPending(true);
    setApplyError(null);
    try {
      const res = await api.api.me.cafes[':id'].inventory.import.apply.$post({
        param: { id: cafeId },
        json: { rows: payload },
      });
      if (!res.ok) {
        setApplyError((await errorMessage(res)) ?? 'Không áp dụng được import');
        return;
      }
      setApplyResult(await res.json());
      router.refresh();
    } catch {
      setApplyError('Mất kết nối, thử lại sau');
    } finally {
      setApplyPending(false);
    }
  }

  const selectedCount = rows?.filter((r) => r.selectedGameId).length ?? 0;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2 rounded-lg border p-4">
        <div className="flex flex-wrap items-center gap-3">
          <a
            href="/templates/cafe-inventory.csv"
            download
            className="text-sm font-medium underline"
          >
            Tải file mẫu CSV
          </a>
          <label className="text-sm">
            <span className="sr-only">Chọn file CSV</span>
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={(e) => void onFileChange(e)}
              disabled={uploadPending}
            />
          </label>
        </div>
        {uploadPending ? <p className="text-muted-foreground text-xs">Đang đọc file...</p> : null}
        <FormError message={uploadError} />
      </div>

      {rows ? (
        <div className="flex flex-col gap-3">
          <ul className="flex flex-col gap-2">
            {rows.map((row) => (
              <li key={row.line} className="flex flex-col gap-2 rounded-lg border p-3 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">
                    Dòng {row.line}: {row.input.name || '(trống)'}
                  </span>
                  <span className={`rounded px-1.5 py-0.5 text-xs ${STATUS_CLASS[row.status]}`}>
                    {STATUS_LABEL[row.status]}
                  </span>
                </div>

                {row.error ? <p className="text-destructive text-xs">{row.error}</p> : null}

                {row.selectedGameId ? (
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">
                      → {row.selectedGameName ?? row.gameName}
                    </span>
                    <Input
                      type="number"
                      min={1}
                      max={99}
                      value={row.copies}
                      className="w-20"
                      onChange={(e) => updateRow(row.line, { copies: Number(e.target.value) || 1 })}
                    />
                    <Button
                      size="xs"
                      variant="outline"
                      onClick={() =>
                        updateRow(row.line, { selectedGameId: null, selectedGameName: null })
                      }
                    >
                      Bỏ qua
                    </Button>
                  </div>
                ) : null}

                {!row.selectedGameId && row.status !== 'error' ? (
                  <div className="flex flex-col gap-2">
                    {row.suggestions.length > 0 ? (
                      <ul className="flex flex-col gap-1">
                        {row.suggestions.map((s) => (
                          <li key={s.gameId} className="flex items-center justify-between gap-2">
                            <span>
                              {s.name}{' '}
                              <span className="text-muted-foreground text-xs">
                                ({Math.round(s.similarity * 100)}%)
                              </span>
                            </span>
                            <Button
                              size="xs"
                              onClick={() =>
                                updateRow(row.line, {
                                  selectedGameId: s.gameId,
                                  selectedGameName: s.name,
                                })
                              }
                            >
                              Dùng gợi ý này
                            </Button>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                    <GamePicker
                      initialQuery={row.input.name}
                      onPick={(g) =>
                        updateRow(row.line, { selectedGameId: g.id, selectedGameName: g.name })
                      }
                    />
                  </div>
                ) : null}
              </li>
            ))}
          </ul>

          <div className="flex items-center gap-3 rounded-lg border p-4">
            <Button disabled={selectedCount === 0 || applyPending} onClick={() => void onApply()}>
              Thêm {selectedCount} game vào kho
            </Button>
            {applyResult ? (
              <p className="text-sm text-muted-foreground">
                Đã áp dụng {applyResult.rowsApplied} dòng.
              </p>
            ) : null}
            <FormError message={applyError} />
          </div>
        </div>
      ) : null}
    </div>
  );
}
