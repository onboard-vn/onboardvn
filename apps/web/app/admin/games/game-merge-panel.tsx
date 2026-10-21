'use client';

import { useEffect, useRef, useState } from 'react';
import type { GameMergePreviewDto } from '@onboard/shared';
import { useRouter } from 'next/navigation';
import { GameSelection, type SelectedGame } from '@/components/game-selection';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { api } from '@/lib/api';

const COUNT_LABELS: Record<string, string> = {
  plays: 'Ván chơi',
  user_games: 'Kho cá nhân',
  cafe_games: 'Kho quán',
  score_templates: 'Bảng điểm',
  game_revisions: 'Lịch sử chỉnh sửa',
  game_barcodes: 'Mã vạch',
  meetup_tables: 'Bàn chơi',
  game_categories: 'Thể loại',
  game_aliases: 'Tên gọi',
  cafe_game_events: 'Lịch sử kho quán',
  game_external_metadata: 'Liên kết dữ liệu ngoài',
  club_game_owners: 'Kho club',
  club_external_ownerships: 'Kho đồng bộ club',
};

export function GameMergePanel({ source }: { source: SelectedGame }) {
  const router = useRouter();
  const [target, setTarget] = useState<SelectedGame | null>(null);
  const [preview, setPreview] = useState<GameMergePreviewDto | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [pending, setPending] = useState<'preview' | 'merge' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const generation = useRef(0);
  const inFlight = useRef(false);
  useEffect(
    () => () => {
      generation.current += 1;
    },
    [],
  );

  function changeTarget(next: SelectedGame | null) {
    generation.current += 1;
    setTarget(next);
    setPreview(null);
    setConfirmed(false);
    setError(null);
  }

  async function requestPreview() {
    if (!target || inFlight.current) return;
    const current = ++generation.current;
    inFlight.current = true;
    setPending('preview');
    setError(null);
    setPreview(null);
    setConfirmed(false);
    try {
      const res = await api.api.games[':id']['merge-preview'].$post({
        param: { id: source.id },
        json: { targetId: target.id },
      });
      const data = await res.json();
      if (current !== generation.current) return;
      if (!res.ok) {
        const failure = data as { error?: { message?: string } };
        throw new Error(failure.error?.message ?? 'Không xem trước được thao tác gộp.');
      }
      setPreview(data as GameMergePreviewDto);
    } catch (cause) {
      if (current === generation.current)
        setError(cause instanceof Error ? cause.message : 'Không kết nối được máy chủ.');
    } finally {
      inFlight.current = false;
      if (current === generation.current) setPending(null);
    }
  }

  async function merge() {
    if (!target || !preview || !confirmed || preview.blockers.length || inFlight.current) return;
    const current = ++generation.current;
    inFlight.current = true;
    setPending('merge');
    setError(null);
    try {
      const res = await api.api.games[':id'].merge.$post({
        param: { id: source.id },
        json: { targetId: target.id, fingerprint: preview.fingerprint },
      });
      const data = await res.json();
      if (current !== generation.current) return;
      if (!res.ok) {
        setPreview(null);
        setConfirmed(false);
        const failure = data as { error?: { message?: string } };
        throw new Error(failure.error?.message ?? 'Dữ liệu đã thay đổi. Hãy xem trước lại.');
      }
      const game = data as { slug: string };
      router.push(`/admin/games/${game.slug}/edit`);
      router.refresh();
    } catch (cause) {
      if (current === generation.current)
        setError(
          cause instanceof Error
            ? cause.message
            : 'Không kết nối được máy chủ. Hãy xem trước lại trước khi thử tiếp.',
        );
    } finally {
      inFlight.current = false;
      if (current === generation.current) setPending(null);
    }
  }

  return (
    <section className="flex flex-col gap-3 rounded-lg border p-4">
      <h2 className="text-sm font-medium">Gộp game trùng</h2>
      <p className="text-muted-foreground text-sm">
        Lưu các chỉnh sửa phía trên trước khi gộp. Chỉ gộp khi đây là cùng một game và cùng luật.
      </p>
      <p className="text-sm">
        Nguồn: <strong>{source.nameVi || source.nameEn}</strong>
      </p>
      <Label htmlFor="merge-target">Game đích sẽ được giữ trong danh mục</Label>
      <GameSelection
        inputId="merge-target"
        value={target}
        onChange={changeTarget}
        excludeId={source.id}
        disabled={pending !== null}
      />
      <Button
        type="button"
        variant="outline"
        className="self-start"
        disabled={!target || pending !== null}
        onClick={() => void requestPreview()}
      >
        {pending === 'preview' ? 'Đang kiểm tra…' : 'Xem trước'}
      </Button>
      {preview && target ? (
        <div className="flex flex-col gap-3 rounded border p-3 text-sm" aria-live="polite">
          <p>
            Gộp <strong>{source.nameVi || source.nameEn}</strong> vào{' '}
            <strong>{target.nameVi || target.nameEn}</strong>.
          </p>
          <dl className="grid grid-cols-2 gap-2">
            {Object.entries(preview.counts).map(([key, count]) => (
              <div key={key}>
                <dt className="text-muted-foreground">{COUNT_LABELS[key] ?? key}</dt>
                <dd>{count}</dd>
              </div>
            ))}
          </dl>
          {preview.blockers.length ? (
            <div role="alert">
              <p className="font-medium">Chưa thể gộp. Cần xử lý các xung đột:</p>
              <ul className="list-disc pl-5">
                {preview.blockers.map((blocker, i) => (
                  <li key={i}>
                    {COUNT_LABELS[blocker.table] ?? blocker.table}: {blocker.reason}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <>
              <p>
                Liên kết cũ sẽ trỏ về game đích. Lịch sử chơi, bảng điểm và nguồn dữ liệu được giữ
                lại; không tự cộng số lượng kho.
              </p>
              <label className="flex items-start gap-2">
                <input
                  type="checkbox"
                  checked={confirmed}
                  disabled={pending !== null}
                  onChange={(event) => setConfirmed(event.target.checked)}
                  className="mt-1"
                />
                Tôi đã kiểm tra nguồn, đích và ảnh hưởng của thao tác gộp.
              </label>
              <Button
                type="button"
                variant="destructive"
                disabled={!confirmed || pending !== null}
                onClick={() => void merge()}
              >
                {pending === 'merge' ? 'Đang gộp…' : `Gộp vào ${target.nameVi || target.nameEn}`}
              </Button>
            </>
          )}
        </div>
      ) : null}
      {error ? (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      ) : null}
    </section>
  );
}
