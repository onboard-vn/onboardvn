'use client';

import type { CafeMapPinDto, VenueType } from '@onboard/shared';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { VENUE_TYPE_LABELS } from '@/lib/cafe-labels';
import { api } from '@/lib/api';
import { mapFiltersToParams, mapFiltersToQuery, type MapFilterValues } from '@/lib/map-filters';

const CafeMap = dynamic(() => import('@/components/cafe-map').then((m) => m.CafeMap), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">
      Đang tải bản đồ…
    </div>
  ),
});

interface Province {
  code: string;
  name: string;
  slug: string;
}

export type { MapFilterValues };

const CRITERIA_CHIPS: { key: 'byog' | 'food' | 'free' | 'openNow'; label: string }[] = [
  { key: 'openNow', label: 'Đang mở' },
  { key: 'byog', label: 'Cho mang game tới' },
  { key: 'food', label: 'Có đồ ăn' },
  { key: 'free', label: 'Miễn phí ngồi' },
];

export function MapView({
  provinces,
  initialFilters,
  initialPins,
  initialGameName,
}: {
  provinces: Province[];
  initialFilters: MapFilterValues;
  initialPins: CafeMapPinDto[];
  /** Server-resolved name for `initialFilters.gameSlug`, so the chip renders without a client
   * round-trip and survives a hard refresh / shared link. */
  initialGameName: string | null;
}) {
  const router = useRouter();
  const [filters, setFilters] = useState(initialFilters);
  const [pins, setPins] = useState(initialPins);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [showList, setShowList] = useState(false);
  const [gameQuery, setGameQuery] = useState('');
  const [gameResults, setGameResults] = useState<
    { slug: string; nameVi: string | null; nameEn: string }[]
  >([]);
  const [selectedGameName, setSelectedGameName] = useState<string | null>(initialGameName);
  const [reloadNonce, setReloadNonce] = useState(0);
  // The very first render already has `initialPins` matching `initialFilters` from the server —
  // skip that one refetch; only fetch again once a filter changes or "Thử lại" is pressed.
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    let cancelled = false;

    async function loadPins() {
      setLoading(true);
      setLoadError(false);
      try {
        const res = await api.api.cafes.map.$get({ query: mapFiltersToQuery(filters) });
        const items = res.ok ? await res.json() : [];
        if (cancelled) return;
        setPins(items);
      } catch {
        if (!cancelled) setLoadError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void loadPins();

    router.replace(`/map?${mapFiltersToParams(filters).toString()}`, { scroll: false });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, reloadNonce]);

  async function onGameSearch(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const q = gameQuery.trim();
    if (!q) {
      setGameResults([]);
      return;
    }
    const res = await api.api.games.$get({ query: { q, pageSize: '8' } });
    setGameResults(res.ok ? (await res.json()).items : []);
  }

  function pickGame(game: { slug: string; nameVi: string | null; nameEn: string }) {
    setSelectedGameName(game.nameVi || game.nameEn);
    setGameResults([]);
    setGameQuery('');
    setFilters((f) => ({ ...f, gameSlug: game.slug }));
  }

  function clearGame() {
    setSelectedGameName(null);
    setFilters((f) => ({ ...f, gameSlug: undefined }));
  }

  function toggleCriterion(key: 'byog' | 'food' | 'free' | 'openNow') {
    setFilters((f) => ({ ...f, [key]: !f[key] || undefined }));
  }

  const fitToPins = useMemo(() => Boolean(filters.province), [filters.province]);

  return (
    <div className="flex h-full flex-1 flex-col md:flex-row">
      <div className="flex flex-col gap-3 border-b p-4 md:w-80 md:shrink-0 md:overflow-y-auto md:border-r md:border-b-0">
        <h1 className="text-lg font-semibold">Bản đồ quán</h1>

        <div className="flex flex-col gap-1">
          <Label htmlFor="map-province">Tỉnh/thành</Label>
          <select
            id="map-province"
            value={filters.province ?? ''}
            onChange={(e) => setFilters((f) => ({ ...f, province: e.target.value || undefined }))}
            className="border-input h-9 rounded-md border bg-transparent px-3 text-sm dark:bg-input/30"
          >
            <option value="">Tất cả</option>
            {provinces.map((p) => (
              <option key={p.code} value={p.slug}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <Label htmlFor="map-venueType">Loại địa điểm</Label>
          <select
            id="map-venueType"
            value={filters.venueType ?? ''}
            onChange={(e) =>
              setFilters((f) => ({
                ...f,
                venueType: (e.target.value || undefined) as VenueType | undefined,
              }))
            }
            className="border-input h-9 rounded-md border bg-transparent px-3 text-sm dark:bg-input/30"
          >
            <option value="">Tất cả</option>
            {Object.entries(VENUE_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <Label htmlFor="map-game">Có game</Label>
          {selectedGameName ? (
            <div className="flex items-center justify-between gap-2 rounded-md border px-3 py-1.5 text-sm">
              <span>{selectedGameName}</span>
              <button type="button" onClick={clearGame} className="text-muted-foreground text-xs">
                Xoá
              </button>
            </div>
          ) : (
            <form onSubmit={onGameSearch} className="flex gap-2">
              <Input
                id="map-game"
                value={gameQuery}
                onChange={(e) => setGameQuery(e.target.value)}
                placeholder="Tên game..."
                className="flex-1"
              />
              <Button type="submit" size="sm">
                Tìm
              </Button>
            </form>
          )}
          {gameResults.length > 0 ? (
            <ul className="flex flex-col gap-1 text-sm">
              {gameResults.map((g) => (
                <li key={g.slug}>
                  <button type="button" onClick={() => pickGame(g)} className="hover:underline">
                    {g.nameVi || g.nameEn}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-2">
          {CRITERIA_CHIPS.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => toggleCriterion(key)}
              aria-pressed={Boolean(filters[key])}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                filters[key]
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'hover:bg-muted border-input'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <Button
          type="button"
          variant="outline"
          className="md:hidden"
          onClick={() => setShowList((v) => !v)}
        >
          {showList ? 'Xem bản đồ' : 'Xem danh sách'}
        </Button>

        {loading ? <p className="text-muted-foreground text-xs">Đang tải…</p> : null}

        {loadError ? (
          <p className="text-destructive text-xs">
            Không tải được ghim bản đồ.{' '}
            <button
              type="button"
              onClick={() => setReloadNonce((n) => n + 1)}
              className="underline"
            >
              Thử lại
            </button>
          </p>
        ) : null}

        {pins.length === 0 && !loading && !loadError ? (
          <p className="text-muted-foreground text-sm">
            Chưa có quán nào được ghim trên bản đồ với bộ lọc này. Đội ngũ và chủ quán đang ghim dần
            vị trí — thử bỏ bớt bộ lọc hoặc xem{' '}
            <Link href="/cafes" className="underline">
              danh sách địa điểm chơi
            </Link>
            .
          </p>
        ) : null}

        {pins.length > 0 ? (
          <>
            {/* Mobile: the list replaces the map when "Xem danh sách" is toggled. */}
            <ul className={`flex flex-col gap-2 md:hidden ${showList ? '' : 'hidden'}`}>
              {pins.map((pin) => (
                <li key={pin.slug} className="rounded-md border p-2 text-sm">
                  <Link href={`/cafes/${pin.slug}`} className="font-medium hover:underline">
                    {pin.name}
                  </Link>
                  <p className="text-muted-foreground text-xs">
                    {VENUE_TYPE_LABELS[pin.venueType]}
                  </p>
                </li>
              ))}
            </ul>

            {/* Desktop: always-reachable, keyboard-accessible list next to the map (no pointer
                interaction with the canvas required to browse pins). */}
            <details className="hidden md:block" open>
              <summary className="cursor-pointer text-sm font-medium">
                Danh sách quán ({pins.length})
              </summary>
              <ul className="mt-2 flex flex-col gap-2">
                {pins.map((pin) => (
                  <li key={pin.slug} className="rounded-md border p-2 text-sm">
                    <Link href={`/cafes/${pin.slug}`} className="font-medium hover:underline">
                      {pin.name}
                    </Link>
                    <p className="text-muted-foreground text-xs">
                      {VENUE_TYPE_LABELS[pin.venueType]}
                    </p>
                  </li>
                ))}
              </ul>
            </details>
          </>
        ) : null}
      </div>

      <div className={`min-h-[50vh] flex-1 ${showList ? 'hidden md:block' : ''}`}>
        <CafeMap pins={pins} fitToPins={fitToPins} />
      </div>
    </div>
  );
}
