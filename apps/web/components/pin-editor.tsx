'use client';

import dynamic from 'next/dynamic';
import { useRef, useState, type KeyboardEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { RecenterTarget } from './pin-editor-map';

const PinEditorMap = dynamic(() => import('./pin-editor-map'), {
  ssr: false,
  loading: () => (
    <div className="text-muted-foreground flex h-64 w-full items-center justify-center rounded-md border text-sm">
      Đang tải bản đồ…
    </div>
  ),
});

// Vietnam bounding box — client-side hint only; the API is the source of truth.
const VN_LAT_RANGE = [8, 24] as const;
const VN_LNG_RANGE = [102, 110] as const;

interface NominatimResult {
  lat: string;
  lon: string;
  display_name: string;
}

const SEARCH_MIN_INTERVAL_MS = 1000;

/** Café ghim-tay picker: draggable marker + click-to-place, plus a Nominatim search box that
 * only recenters the map (never sets the marker/coordinates) — the user must click/drag and the
 * value is only persisted when the surrounding form is saved. */
export function PinEditor({
  lat,
  lng,
  onChange,
}: {
  lat: number | null;
  lng: number | null;
  onChange: (lat: number | null, lng: number | null) => void;
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<NominatimResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [recenterTo, setRecenterTo] = useState<RecenterTarget | null>(null);
  const lastSearchAtRef = useRef(0);

  const outOfVn =
    lat !== null &&
    lng !== null &&
    (lat < VN_LAT_RANGE[0] ||
      lat > VN_LAT_RANGE[1] ||
      lng < VN_LNG_RANGE[0] ||
      lng > VN_LNG_RANGE[1]);

  async function onSearch() {
    const q = query.trim();
    if (!q) return;

    const now = Date.now();
    if (now - lastSearchAtRef.current < SEARCH_MIN_INTERVAL_MS) return;
    lastSearchAtRef.current = now;

    setSearching(true);
    setSearchError(null);
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&countrycodes=vn&limit=5&q=${encodeURIComponent(q)}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('search failed');
      setResults((await res.json()) as NominatimResult[]);
    } catch {
      setSearchError('Không tìm được địa chỉ, thử lại sau');
      setResults([]);
    } finally {
      setSearching(false);
    }
  }

  function onPickResult(result: NominatimResult) {
    // Recenter only — never touches lat/lng; the user still has to click/drag the marker.
    setRecenterTo({ lat: Number(result.lat), lng: Number(result.lon), zoom: 15 });
    setResults([]);
    setQuery(result.display_name);
  }

  function onManualChange(field: 'lat' | 'lng', value: string) {
    const num = value.trim() === '' ? null : Number(value);
    if (num !== null && Number.isNaN(num)) return;
    onChange(field === 'lat' ? num : lat, field === 'lng' ? num : lng);
  }

  return (
    <div className="flex flex-col gap-2">
      <Label>Vị trí trên bản đồ</Label>

      {/* A plain div, not <form>, since PinEditor is always nested inside the café form. */}
      <div className="flex gap-2">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              void onSearch();
            }
          }}
          placeholder="Tìm địa chỉ để định vị bản đồ (không tự ghim)..."
          className="flex-1"
        />
        <Button type="button" size="sm" disabled={searching} onClick={() => void onSearch()}>
          Tìm
        </Button>
      </div>
      <p className="text-muted-foreground text-xs">Tìm kiếm © OpenStreetMap/Nominatim</p>
      {searchError ? <p className="text-destructive text-xs">{searchError}</p> : null}
      {results.length > 0 ? (
        <ul className="flex flex-col gap-1 text-sm">
          {results.map((r) => (
            <li key={`${r.lat}-${r.lon}`}>
              <button
                type="button"
                onClick={() => onPickResult(r)}
                className="text-left hover:underline"
              >
                {r.display_name}
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <PinEditorMap
        lat={lat}
        lng={lng}
        onPick={(la, ln) => onChange(la, ln)}
        recenterTo={recenterTo}
      />

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1">
          <Label htmlFor="pin-lat">Vĩ độ (lat)</Label>
          <Input
            id="pin-lat"
            type="number"
            step="0.000001"
            value={lat ?? ''}
            onChange={(e) => onManualChange('lat', e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="pin-lng">Kinh độ (lng)</Label>
          <Input
            id="pin-lng"
            type="number"
            step="0.000001"
            value={lng ?? ''}
            onChange={(e) => onManualChange('lng', e.target.value)}
          />
        </div>
      </div>

      {outOfVn ? (
        <p className="text-destructive text-xs">
          Toạ độ nằm ngoài lãnh thổ Việt Nam — hệ thống sẽ từ chối khi lưu.
        </p>
      ) : null}

      {lat !== null || lng !== null ? (
        <Button type="button" variant="outline" size="sm" onClick={() => onChange(null, null)}>
          Xoá vị trí
        </Button>
      ) : null}
    </div>
  );
}
