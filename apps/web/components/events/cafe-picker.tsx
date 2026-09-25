'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { api } from '@/lib/api';

interface Province {
  code: string;
  name: string;
  slug: string;
}
interface Ward {
  code: string;
  name: string;
  slug: string;
}
export interface CafeOption {
  id: string;
  slug: string;
  name: string;
  wardName: string;
  provinceName: string;
}

const DEBOUNCE_MS = 300;

/** Picks a publicly visible café: choose tỉnh/xã, then search by name (server-side, debounced). */
export function CafePicker({
  provinces,
  onPick,
}: {
  provinces: Province[];
  onPick: (cafe: CafeOption) => void;
}) {
  const [provinceCode, setProvinceCode] = useState('');
  const [wardCode, setWardCode] = useState('');
  const [wards, setWards] = useState<Ward[]>([]);
  const [results, setResults] = useState<CafeOption[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function search(provinceSlug: string, wardSlug: string, q: string) {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    setError(null);
    try {
      const res = await api.api.cafes.$get(
        {
          query: {
            province: provinceSlug,
            ...(wardSlug && { ward: wardSlug }),
            ...(q.trim() && { q: q.trim() }),
            pageSize: '50',
          },
        },
        { init: { signal: controller.signal } },
      );
      if (!res.ok) throw new Error();
      setResults((await res.json()).items);
    } catch (err) {
      if ((err as { name?: string }).name === 'AbortError') return;
      setError('Không tìm được quán, thử lại sau');
      setResults([]);
    } finally {
      if (abortRef.current === controller) setLoading(false);
    }
  }

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  async function onProvinceChange(code: string) {
    setProvinceCode(code);
    setWardCode('');
    setResults([]);
    if (!code) {
      setWards([]);
      return;
    }
    const res = await api.api.locations.provinces[':code'].wards.$get({ param: { code } });
    setWards(res.ok ? (await res.json()).items : []);
    const province = provinces.find((p) => p.code === code);
    if (province) await search(province.slug, '', query);
  }

  async function onWardChange(code: string) {
    setWardCode(code);
    const province = provinces.find((p) => p.code === provinceCode);
    const ward = wards.find((w) => w.code === code);
    if (province) await search(province.slug, ward?.slug ?? '', query);
  }

  function onQueryChange(value: string) {
    setQuery(value);
    const province = provinces.find((p) => p.code === provinceCode);
    if (!province) return;
    const ward = wards.find((w) => w.code === wardCode);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void search(province.slug, ward?.slug ?? '', value);
    }, DEBOUNCE_MS);
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <Label htmlFor="event-cafe-province">Tỉnh/thành</Label>
          <select
            id="event-cafe-province"
            className="h-8 rounded-lg border border-input bg-transparent px-2 text-sm"
            value={provinceCode}
            onChange={(e) => void onProvinceChange(e.target.value)}
          >
            <option value="">Chọn tỉnh/thành</option>
            {provinces.map((p) => (
              <option key={p.code} value={p.code}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="event-cafe-ward">Phường/xã</Label>
          <select
            id="event-cafe-ward"
            className="h-8 rounded-lg border border-input bg-transparent px-2 text-sm"
            value={wardCode}
            disabled={!provinceCode}
            onChange={(e) => void onWardChange(e.target.value)}
          >
            <option value="">Tất cả</option>
            {wards.map((w) => (
              <option key={w.code} value={w.code}>
                {w.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {provinceCode ? (
        <Input
          placeholder="Tìm theo tên quán..."
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
        />
      ) : null}

      {loading ? <p className="text-muted-foreground text-sm">Đang tải...</p> : null}
      {error ? <p className="text-destructive text-sm">{error}</p> : null}

      {results.length > 0 ? (
        <ul className="flex max-h-56 flex-col gap-1 overflow-y-auto text-sm">
          {results.map((cafe) => (
            <li key={cafe.id} className="flex items-center justify-between gap-2">
              <span>
                {cafe.name} <span className="text-muted-foreground">· {cafe.wardName}</span>
              </span>
              <Button type="button" size="xs" onClick={() => onPick(cafe)}>
                Chọn
              </Button>
            </li>
          ))}
        </ul>
      ) : provinceCode && !loading && !error ? (
        <p className="text-muted-foreground text-sm">Không tìm thấy quán phù hợp.</p>
      ) : null}
    </div>
  );
}
