'use client';

import type { CafeCreateInput } from '@onboard/shared';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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

export interface CafeFormInitial {
  id: string;
  name: string;
  provinceCode: string;
  wardCode: string;
  addressLine: string;
  legacyDistrict: string | null;
  lat: number | null;
  lng: number | null;
  openingHours?: Record<string, string>;
  links?: { fanpage?: string; maps?: string };
  sourceUrl: string | null;
  consentStatus: 'granted' | 'pending' | 'public_info_only';
  consentNote: string | null;
}

const CONSENT_OPTIONS = [
  { value: 'granted', label: 'Đã đồng ý (granted)' },
  { value: 'pending', label: 'Chờ xác nhận (pending)' },
  { value: 'public_info_only', label: 'Chỉ thông tin công khai (public_info_only)' },
] as const;

export function CafeForm({
  provinces,
  initialWards = [],
  initial,
}: {
  provinces: Province[];
  initialWards?: Ward[];
  initial?: CafeFormInitial;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [provinceCode, setProvinceCode] = useState(initial?.provinceCode ?? '');
  const [wardCode, setWardCode] = useState(initial?.wardCode ?? '');
  const [wards, setWards] = useState<Ward[]>(initialWards);
  const [consentStatus, setConsentStatus] = useState(initial?.consentStatus ?? 'granted');

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

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);

    const data = new FormData(e.currentTarget);
    // On edit, an emptied field sends `null` to clear the stored value; on create it's simply omitted.
    const str = (key: string) => {
      const v = String(data.get(key) ?? '').trim();
      if (v !== '') return v;
      return initial ? null : undefined;
    };
    const num = (key: string) => {
      const v = String(data.get(key) ?? '').trim();
      if (v !== '') return Number(v);
      return initial ? null : undefined;
    };

    const fanpageRaw = String(data.get('fanpage') ?? '').trim();
    const mapsRaw = String(data.get('maps') ?? '').trim();
    const openingHoursText = String(data.get('openingHours') ?? '').trim();

    const body = {
      name: str('name') ?? '',
      provinceCode,
      wardCode,
      addressLine: str('addressLine') ?? '',
      legacyDistrict: str('legacyDistrict'),
      lat: num('lat'),
      lng: num('lng'),
      openingHours: openingHoursText ? { general: openingHoursText } : initial ? null : undefined,
      links:
        fanpageRaw || mapsRaw
          ? { fanpage: fanpageRaw || undefined, maps: mapsRaw || undefined }
          : initial
            ? null
            : undefined,
      sourceUrl: str('sourceUrl'),
      consentStatus,
      consentNote: str('consentNote'),
    };

    const res = initial
      ? await api.api.cafes[':id'].$patch({ param: { id: initial.id }, json: body })
      : // str()/num() only return null on edit (see above), so this is a safe create-time narrowing.
        await api.api.cafes.$post({ json: body as unknown as CafeCreateInput });

    setPending(false);
    if (!res.ok) {
      const json = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
      setError(json?.error?.message ?? 'Có lỗi xảy ra, thử lại sau');
      return;
    }
    const cafe = await res.json();
    if (initial) {
      router.refresh();
    } else {
      router.push(`/admin/cafes/${cafe.id}/edit`);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <Label htmlFor="name">Tên quán *</Label>
        <Input id="name" name="name" required defaultValue={initial?.name ?? ''} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1">
          <Label htmlFor="provinceCode">Tỉnh/thành *</Label>
          <select
            id="provinceCode"
            required
            value={provinceCode}
            onChange={(e) => onProvinceChange(e.target.value)}
            className="border-input h-9 rounded-md border bg-transparent px-3 text-sm dark:bg-input/30"
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
          <Label htmlFor="wardCode">Phường/xã *</Label>
          <select
            id="wardCode"
            required
            value={wardCode}
            onChange={(e) => setWardCode(e.target.value)}
            disabled={!provinceCode}
            className="border-input h-9 rounded-md border bg-transparent px-3 text-sm dark:bg-input/30"
          >
            <option value="">Chọn phường/xã</option>
            {wards.map((w) => (
              <option key={w.code} value={w.code}>
                {w.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <Label htmlFor="addressLine">Địa chỉ *</Label>
        <Input
          id="addressLine"
          name="addressLine"
          required
          defaultValue={initial?.addressLine ?? ''}
        />
      </div>

      <div className="flex flex-col gap-1">
        <Label htmlFor="legacyDistrict">Địa bàn cũ (vd: Quận 3 cũ)</Label>
        <Input
          id="legacyDistrict"
          name="legacyDistrict"
          defaultValue={initial?.legacyDistrict ?? ''}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1">
          <Label htmlFor="lat">Vĩ độ (lat)</Label>
          <Input
            id="lat"
            name="lat"
            type="number"
            step="0.000001"
            defaultValue={initial?.lat ?? ''}
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="lng">Kinh độ (lng)</Label>
          <Input
            id="lng"
            name="lng"
            type="number"
            step="0.000001"
            defaultValue={initial?.lng ?? ''}
          />
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <Label htmlFor="openingHours">Giờ mở cửa</Label>
        <Input
          id="openingHours"
          name="openingHours"
          placeholder="Vd: 8:00–22:00 hằng ngày"
          defaultValue={initial?.openingHours?.general ?? ''}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1">
          <Label htmlFor="fanpage">Fanpage</Label>
          <Input id="fanpage" name="fanpage" defaultValue={initial?.links?.fanpage ?? ''} />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="maps">Link chỉ đường</Label>
          <Input id="maps" name="maps" defaultValue={initial?.links?.maps ?? ''} />
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <Label htmlFor="consentStatus">Trạng thái đồng ý (provenance) *</Label>
        <select
          id="consentStatus"
          value={consentStatus}
          onChange={(e) => setConsentStatus(e.target.value as typeof consentStatus)}
          className="border-input h-9 rounded-md border bg-transparent px-3 text-sm dark:bg-input/30"
        >
          {CONSENT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <Label htmlFor="sourceUrl">
          Nguồn dữ liệu (sourceUrl){consentStatus !== 'granted' ? ' *' : ''}
        </Label>
        <Input
          id="sourceUrl"
          name="sourceUrl"
          required={consentStatus !== 'granted'}
          defaultValue={initial?.sourceUrl ?? ''}
        />
      </div>

      <div className="flex flex-col gap-1">
        <Label htmlFor="consentNote">Ghi chú nội bộ (không hiển thị công khai)</Label>
        <Textarea
          id="consentNote"
          name="consentNote"
          rows={3}
          defaultValue={initial?.consentNote ?? ''}
        />
      </div>

      {error ? <p className="text-destructive text-sm">{error}</p> : null}

      <Button type="submit" disabled={pending}>
        {initial ? 'Lưu thay đổi' : 'Tạo quán'}
      </Button>
    </form>
  );
}
