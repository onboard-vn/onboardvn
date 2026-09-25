'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { api } from '@/lib/api';
import {
  eventFiltersToParams,
  type EventFilterValues,
  type EventsView,
} from '@/lib/events-filters';

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

export function EventFilters({
  provinces,
  initialProvinceCode,
  initialWardCode,
  initialWards,
  initialFilters,
  view,
  month,
}: {
  provinces: Province[];
  initialProvinceCode?: string;
  initialWardCode?: string;
  initialWards: Ward[];
  initialFilters: EventFilterValues;
  view: EventsView;
  month?: string;
}) {
  const router = useRouter();
  const [provinceCode, setProvinceCode] = useState(initialProvinceCode ?? '');
  const [wardCode, setWardCode] = useState(initialWardCode ?? '');
  const [wards, setWards] = useState<Ward[]>(initialWards);
  const [from, setFrom] = useState(initialFilters.from ?? '');

  async function onProvinceChange(code: string) {
    setProvinceCode(code);
    setWardCode('');
    if (!code) {
      setWards([]);
      return;
    }
    const res = await api.api.locations.provinces[':code'].wards.$get({ param: { code } });
    setWards(res.ok ? (await res.json()).items : []);
  }

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const province = provinces.find((p) => p.code === provinceCode);
    const ward = wards.find((w) => w.code === wardCode);
    const params = eventFiltersToParams(
      { province: province?.slug, ward: ward?.slug, from: from || undefined },
      view,
      month,
    );
    router.push(params.size ? `/events?${params.toString()}` : '/events');
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3 rounded-lg border p-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="flex flex-col gap-1">
          <Label htmlFor="events-tinh">Tỉnh/thành</Label>
          <select
            id="events-tinh"
            className="h-8 rounded-lg border border-input bg-transparent px-2 text-sm"
            value={provinceCode}
            onChange={(e) => void onProvinceChange(e.target.value)}
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
          <Label htmlFor="events-phuong">Phường/xã</Label>
          <select
            id="events-phuong"
            className="h-8 rounded-lg border border-input bg-transparent px-2 text-sm"
            value={wardCode}
            disabled={!provinceCode}
            onChange={(e) => setWardCode(e.target.value)}
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
          <Label htmlFor="events-from">Từ ngày</Label>
          <Input
            id="events-from"
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </div>
      </div>
      <Button type="submit" size="sm" className="self-start">
        Lọc
      </Button>
    </form>
  );
}
