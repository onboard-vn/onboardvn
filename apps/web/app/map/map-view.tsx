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
import { DEFAULT_MAP_CENTER } from '@/lib/map-style';
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
  const [draftCenter, setDraftCenter] = useState<[number, number]>(() =>
    initialFilters.centerLng !== undefined && initialFilters.centerLat !== undefined
      ? [initialFilters.centerLng, initialFilters.centerLat]
      : DEFAULT_MAP_CENTER,
  );
  const [mapCenter, setMapCenter] = useState<[number, number]>(() =>
    initialFilters.centerLng !== undefined && initialFilters.centerLat !== undefined
      ? [initialFilters.centerLng, initialFilters.centerLat]
      : DEFAULT_MAP_CENTER,
  );
  const [radiusInput, setRadiusInput] = useState(String(initialFilters.radiusKm ?? 5));
  const [manualCenter, setManualCenter] = useState(Boolean(initialFilters.radiusKm));
  const [locationMessage, setLocationMessage] = useState('');
  const [locating, setLocating] = useState(false);
  const locationRequest = useRef(0);
  const radius = Number(radiusInput);
  const validRadius =
    radiusInput.trim() !== '' && Number.isFinite(radius) && radius >= 1 && radius <= 50;
  const nearby = useMemo(
    () => ({ center: draftCenter, radiusKm: validRadius ? radius : 5 }),
    [draftCenter, radius, validRadius],
  );

  useEffect(
    () => () => {
      locationRequest.current += 1;
    },
    [],
  );

  function moveCenter(center: [number, number]) {
    locationRequest.current += 1;
    setLocating(false);
    setDraftCenter(center);
    setManualCenter(true);
  }

  function locate() {
    if (!navigator.geolocation) {
      setLocationMessage(
        'Trình duyệt không hỗ trợ vị trí. Bạn vẫn có thể kéo tâm tìm kiếm trên bản đồ.',
      );
      return;
    }
    const request = ++locationRequest.current;
    setLocating(true);
    setLocationMessage('');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (request !== locationRequest.current) return;
        setLocating(false);
        setDraftCenter([position.coords.longitude, position.coords.latitude]);
        setMapCenter([position.coords.longitude, position.coords.latitude]);
        setManualCenter(true);
        setLocationMessage('Đã chọn vị trí của bạn. Bấm Tìm quanh đây để tìm quán.');
      },
      () => {
        if (request !== locationRequest.current) return;
        setLocating(false);
        setLocationMessage('Không lấy được vị trí. Bạn vẫn có thể kéo tâm tìm kiếm trên bản đồ.');
      },
      { timeout: 10000, maximumAge: 60000 },
    );
  }

  function searchNearby() {
    if (!validRadius) return;
    locationRequest.current += 1;
    setLocating(false);
    setManualCenter(true);
    setFilters((f) => ({
      ...f,
      centerLng: draftCenter[0],
      centerLat: draftCenter[1],
      radiusKm: radius,
    }));
  }
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
        if (!res.ok) throw new Error('Không tải được ghim');
        const items = await res.json();
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

  const fitToPins = Boolean(filters.province) && !manualCenter;

  return (
    <div className="flex h-full flex-1 flex-col md:flex-row">
      <div className="flex flex-col gap-3 border-b p-4 md:w-80 md:shrink-0 md:overflow-y-auto md:border-r md:border-b-0">
        <h1 className="text-lg font-semibold">Bản đồ quán</h1>

        <fieldset className="flex flex-col gap-2 rounded-md border p-3">
          <legend className="px-1 text-sm font-medium">Tìm quanh đây</legend>
          <p className="text-muted-foreground text-xs">
            Kéo tâm đỏ trên bản đồ, chọn bán kính rồi tìm. Bộ lọc bên dưới vẫn được áp dụng.
          </p>
          <Label htmlFor="nearby-radius">Bán kính (km)</Label>
          <Input
            id="nearby-radius"
            type="number"
            min={1}
            max={50}
            step="any"
            value={radiusInput}
            onChange={(e) => setRadiusInput(e.target.value)}
            aria-invalid={!validRadius}
          />
          {!validRadius ? (
            <p className="text-destructive text-xs">Chọn bán kính từ 1 đến 50 km.</p>
          ) : null}
          <Button type="button" onClick={searchNearby} disabled={!validRadius}>
            Tìm quanh đây
          </Button>
          <Button type="button" variant="outline" onClick={locate} disabled={locating}>
            {locating ? 'Đang lấy vị trí…' : 'Vị trí của tôi'}
          </Button>
          {locationMessage ? (
            <p role="status" className="text-muted-foreground text-xs">
              {locationMessage}
            </p>
          ) : null}
          <p className="text-muted-foreground text-xs">
            Tâm: {draftCenter[1].toFixed(5)}, {draftCenter[0].toFixed(5)}
          </p>
          {filters.radiusKm !== undefined ? (
            <>
              <p className="text-xs">
                Kết quả trong {filters.radiusKm} km quanh tâm đã tìm. Kéo tâm hoặc đổi bán kính rồi
                bấm tìm để cập nhật.
              </p>
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  locationRequest.current += 1;
                  setLocating(false);
                  setManualCenter(false);
                  setFilters((f) => ({
                    ...f,
                    centerLat: undefined,
                    centerLng: undefined,
                    radiusKm: undefined,
                  }));
                }}
              >
                Bỏ lọc bán kính
              </Button>
            </>
          ) : null}
        </fieldset>

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
        <CafeMap
          pins={pins}
          fitToPins={fitToPins}
          center={mapCenter}
          nearby={nearby}
          onNearbyCenterChange={moveCenter}
          onViewportCenterChange={(center, userDrag) => {
            if (userDrag) moveCenter(center);
            else if (!manualCenter)
              setDraftCenter((previous) =>
                previous[0] === center[0] && previous[1] === center[1] ? previous : center,
              );
          }}
        />
      </div>
    </div>
  );
}
