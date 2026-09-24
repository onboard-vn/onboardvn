'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
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

export function CafeFilters({
  provinces,
  initialProvinceCode,
  initialWardCode,
  initialWards,
}: {
  provinces: Province[];
  initialProvinceCode?: string;
  initialWardCode?: string;
  initialWards: Ward[];
}) {
  const router = useRouter();
  const [provinceCode, setProvinceCode] = useState(initialProvinceCode ?? '');
  const [wardCode, setWardCode] = useState(initialWardCode ?? '');
  const [wards, setWards] = useState<Ward[]>(initialWards);
  const [loadingWards, setLoadingWards] = useState(false);

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

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const province = provinces.find((p) => p.code === provinceCode);
    const ward = wards.find((w) => w.code === wardCode);
    const params = new URLSearchParams();
    if (province) params.set('tinh', province.slug);
    if (ward) params.set('phuong', ward.slug);
    router.push(params.size ? `/cafes?${params.toString()}` : '/cafes');
  }

  return (
    <form
      onSubmit={onSubmit}
      className="grid grid-cols-1 gap-3 rounded-lg border p-4 sm:grid-cols-3"
    >
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
      <div className="flex items-end">
        <Button type="submit" className="w-full">
          Lọc
        </Button>
      </div>
    </form>
  );
}
