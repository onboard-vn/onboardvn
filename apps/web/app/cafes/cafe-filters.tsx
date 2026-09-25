'use client';

import type { VenueType } from '@onboard/shared';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { VENUE_TYPE_LABELS } from '@/lib/cafe-labels';
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

export interface CafeFilterValues {
  venueType?: VenueType;
  byog?: boolean;
  food?: boolean;
  privateRoom?: boolean;
  largeTables?: boolean;
  free?: boolean;
  openNow?: boolean;
}

const CRITERIA_CHIPS: { key: keyof CafeFilterValues; label: string }[] = [
  { key: 'openNow', label: 'Đang mở' },
  { key: 'byog', label: 'Cho mang game tới' },
  { key: 'food', label: 'Có đồ ăn' },
  { key: 'privateRoom', label: 'Phòng riêng' },
  { key: 'largeTables', label: 'Bàn nhóm đông' },
  { key: 'free', label: 'Miễn phí ngồi' },
];

export function CafeFilters({
  provinces,
  initialProvinceCode,
  initialWardCode,
  initialWards,
  initialFilters,
}: {
  provinces: Province[];
  initialProvinceCode?: string;
  initialWardCode?: string;
  initialWards: Ward[];
  initialFilters: CafeFilterValues;
}) {
  const router = useRouter();
  const [provinceCode, setProvinceCode] = useState(initialProvinceCode ?? '');
  const [wardCode, setWardCode] = useState(initialWardCode ?? '');
  const [wards, setWards] = useState<Ward[]>(initialWards);
  const [loadingWards, setLoadingWards] = useState(false);
  const [venueType, setVenueType] = useState(initialFilters.venueType ?? '');
  const [criteria, setCriteria] = useState<CafeFilterValues>(initialFilters);

  async function onProvinceChange(code: string) {
    setProvinceCode(code);
    setWardCode('');
    if (!code) {
      setWards([]);
      return;
    }
    setLoadingWards(true);
    const res = await api.api.locations.provinces[':code'].wards.$get({ param: { code } });
    setLoadingWards(false);
    setWards(res.ok ? (await res.json()).items : []);
  }

  function toggleCriterion(key: keyof CafeFilterValues) {
    setCriteria((prev) => ({ ...prev, [key]: !prev[key] || undefined }));
  }

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const province = provinces.find((p) => p.code === provinceCode);
    const ward = wards.find((w) => w.code === wardCode);
    const params = new URLSearchParams();
    if (province) params.set('province', province.slug);
    if (ward) params.set('phuong', ward.slug);
    if (venueType) params.set('venueType', venueType);
    for (const { key } of CRITERIA_CHIPS) {
      if (criteria[key]) params.set(key, 'true');
    }
    router.push(params.size ? `/cafes?${params.toString()}` : '/cafes');
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3 rounded-lg border p-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="flex flex-col gap-1">
          <Label htmlFor="tinh">Tỉnh/thành</Label>
          <select
            id="tinh"
            value={provinceCode}
            onChange={(e) => onProvinceChange(e.target.value)}
            className="border-input h-9 rounded-md border bg-transparent px-3 text-sm dark:bg-input/30"
          >
            <option value="">Tất cả</option>
            {provinces.map((p) => (
              <option key={p.code} value={p.code}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="phuong">Phường/xã</Label>
          <select
            id="phuong"
            value={wardCode}
            onChange={(e) => setWardCode(e.target.value)}
            disabled={!provinceCode || loadingWards}
            className="border-input h-9 rounded-md border bg-transparent px-3 text-sm dark:bg-input/30"
          >
            <option value="">Tất cả</option>
            {wards.map((w) => (
              <option key={w.code} value={w.code}>
                {w.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="venueType">Loại địa điểm</Label>
          <select
            id="venueType"
            value={venueType}
            onChange={(e) => setVenueType(e.target.value as VenueType | '')}
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
      </div>

      <div className="flex flex-wrap gap-2">
        {CRITERIA_CHIPS.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => toggleCriterion(key)}
            aria-pressed={Boolean(criteria[key])}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
              criteria[key]
                ? 'bg-primary text-primary-foreground border-primary'
                : 'hover:bg-muted border-input'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="flex justify-end">
        <Button type="submit">Lọc</Button>
      </div>
    </form>
  );
}
