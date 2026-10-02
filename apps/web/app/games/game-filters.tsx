'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface Category {
  id: string;
  name: string;
  nameVi: string | null;
}

export interface GameFiltersValues {
  q?: string;
  players?: string;
  minPlayers?: string;
  maxPlayers?: string;
  minTime?: string;
  maxTime?: string;
  minWeight?: string;
  maxWeight?: string;
  categoryId?: string;
}

type Range = readonly [number, number];
type Bounds = { min: number; max: number; step: number };

const DEBOUNCE_MS = 300;
const PLAYERS: Bounds = { min: 1, max: 12, step: 1 };
const TIME: Bounds = { min: 15, max: 300, step: 15 };
const WEIGHT: Bounds = { min: 1, max: 5, step: 0.5 };

const categoryLabel = (c: Category) => c.nameVi ?? c.name;

function parseBound(value: string | undefined, fallback: number, bounds: Bounds): number {
  const n = Number(value);
  if (!value || !Number.isFinite(n)) return fallback;
  return Math.min(bounds.max, Math.max(bounds.min, n));
}

function initialRange(low: string | undefined, high: string | undefined, bounds: Bounds): Range {
  const lo = parseBound(low, bounds.min, bounds);
  return [lo, Math.max(lo, parseBound(high, bounds.max, bounds))];
}

function buildHref(values: GameFiltersValues): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) {
    if (value) params.set(key, value);
  }
  return params.size ? `/games?${params.toString()}` : '/games';
}

const THUMB =
  'pointer-events-none absolute inset-0 h-full w-full appearance-none bg-transparent focus-visible:outline-none ' +
  '[&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:size-5 [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-primary [&::-webkit-slider-thumb]:bg-background ' +
  '[&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:size-4 [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-primary [&::-moz-range-thumb]:bg-background ' +
  'focus-visible:[&::-webkit-slider-thumb]:ring-3 focus-visible:[&::-webkit-slider-thumb]:ring-ring/50';

function RangeField({
  id,
  label,
  display,
  value: [lo, hi],
  bounds,
  onChange,
}: {
  id: string;
  label: string;
  display: string;
  value: Range;
  bounds: Bounds;
  onChange: (value: Range) => void;
}) {
  const span = bounds.max - bounds.min;
  const left = ((lo - bounds.min) / span) * 100;
  const right = ((hi - bounds.min) / span) * 100;
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <div className="flex items-baseline justify-between gap-2">
        <Label htmlFor={`${id}-min`}>{label}</Label>
        <span className="text-muted-foreground text-xs">{display}</span>
      </div>
      <div className="relative mx-2.5 h-9">
        <div className="bg-muted absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full" />
        <div
          className="bg-primary absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full"
          style={{ left: `${left}%`, width: `${right - left}%` }}
        />
        <input
          id={`${id}-min`}
          type="range"
          aria-label={`${label} - tối thiểu`}
          {...bounds}
          value={lo}
          onChange={(e) => onChange([Math.min(Number(e.target.value), hi), hi])}
          className={`${THUMB} ${lo > bounds.min + span / 2 ? 'z-20' : 'z-10'}`}
        />
        <input
          id={`${id}-max`}
          type="range"
          aria-label={`${label} - tối đa`}
          {...bounds}
          value={hi}
          onChange={(e) => onChange([lo, Math.max(Number(e.target.value), lo)])}
          className={`${THUMB} z-10`}
        />
      </div>
    </div>
  );
}

function rangeDisplay([lo, hi]: Range, bounds: Bounds, unit: string): string {
  if (lo === bounds.min && hi === bounds.max) return 'Bất kỳ';
  const text = lo === hi ? `${lo}` : `${lo} – ${hi}`;
  return unit ? `${text} ${unit}` : text;
}

export function GameFilters({
  categories,
  initialValues,
}: {
  categories: Category[];
  initialValues: GameFiltersValues;
}) {
  const router = useRouter();
  const [q, setQ] = useState(initialValues.q ?? '');
  const [players, setPlayers] = useState<Range>(() =>
    initialRange(
      initialValues.minPlayers ?? initialValues.players,
      initialValues.maxPlayers ?? initialValues.players,
      PLAYERS,
    ),
  );
  const [time, setTime] = useState<Range>(() =>
    initialRange(initialValues.minTime, initialValues.maxTime, TIME),
  );
  const [weight, setWeight] = useState<Range>(() =>
    initialRange(initialValues.minWeight, initialValues.maxWeight, WEIGHT),
  );
  const [categoryText, setCategoryText] = useState(() => {
    const initial = categories.find((c) => c.id === initialValues.categoryId);
    return initial ? categoryLabel(initial) : '';
  });

  const category = categories.find(
    (c) => categoryLabel(c).toLowerCase() === categoryText.trim().toLowerCase(),
  );

  const href = buildHref({
    q: q.trim(),
    minPlayers: players[0] > PLAYERS.min ? String(players[0]) : undefined,
    maxPlayers: players[1] < PLAYERS.max ? String(players[1]) : undefined,
    minTime: time[0] > TIME.min ? String(time[0]) : undefined,
    maxTime: time[1] < TIME.max ? String(time[1]) : undefined,
    minWeight: weight[0] > WEIGHT.min ? String(weight[0]) : undefined,
    maxWeight: weight[1] < WEIGHT.max ? String(weight[1]) : undefined,
    categoryId: category?.id,
  });
  const appliedHref = useRef(buildHref(initialValues));

  useEffect(() => {
    if (href === appliedHref.current) return;
    const timer = setTimeout(() => {
      appliedHref.current = href;
      router.replace(href, { scroll: false });
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [href, router]);

  function reset() {
    setQ('');
    setPlayers([PLAYERS.min, PLAYERS.max]);
    setTime([TIME.min, TIME.max]);
    setWeight([WEIGHT.min, WEIGHT.max]);
    setCategoryText('');
  }

  return (
    <form
      onSubmit={(e) => e.preventDefault()}
      className="grid grid-cols-1 gap-4 rounded-lg border p-4 sm:grid-cols-2 lg:grid-cols-3"
    >
      <div className="flex min-w-0 flex-col gap-1">
        <Label htmlFor="q">Tìm kiếm</Label>
        <Input
          id="q"
          type="search"
          placeholder="Tên game..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>
      <div className="flex min-w-0 flex-col gap-1">
        <Label htmlFor="categoryId">Thể loại</Label>
        <Input
          id="categoryId"
          list="category-options"
          placeholder="Gõ để tìm thể loại..."
          autoComplete="off"
          value={categoryText}
          onChange={(e) => setCategoryText(e.target.value)}
        />
        <datalist id="category-options">
          {categories.map((c) => (
            <option key={c.id} value={categoryLabel(c)} />
          ))}
        </datalist>
      </div>
      <RangeField
        id="players"
        label="Số người chơi"
        display={rangeDisplay(players, PLAYERS, 'người')}
        value={players}
        bounds={PLAYERS}
        onChange={setPlayers}
      />
      <RangeField
        id="time"
        label="Thời gian (phút)"
        display={rangeDisplay(time, TIME, 'phút')}
        value={time}
        bounds={TIME}
        onChange={setTime}
      />
      <RangeField
        id="weight"
        label="Độ khó"
        display={rangeDisplay(weight, WEIGHT, '')}
        value={weight}
        bounds={WEIGHT}
        onChange={setWeight}
      />
      <div className="flex items-end">
        <Button type="button" variant="outline" className="w-full" onClick={reset}>
          Xóa bộ lọc
        </Button>
      </div>
    </form>
  );
}
