'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { FormError } from '@/components/form-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { api } from '@/lib/api';

export interface OwnerCafeFormInitial {
  id: string;
  name: string;
  addressLine: string;
  legacyDistrict: string | null;
  openingHours?: Record<string, string>;
  links?: { fanpage?: string; maps?: string };
}

/** Owner-facing café info form: same fields as the admin form minus `sourceUrl`/`consentStatus`,
 * which the API silently strips from a café-scoped PATCH anyway. */
export function OwnerCafeForm({ initial }: { initial: OwnerCafeFormInitial }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);

    const data = new FormData(e.currentTarget);
    const str = (key: string) => {
      const v = String(data.get(key) ?? '').trim();
      return v !== '' ? v : null;
    };
    const fanpageRaw = String(data.get('fanpage') ?? '').trim();
    const mapsRaw = String(data.get('maps') ?? '').trim();
    const openingHoursText = String(data.get('openingHours') ?? '').trim();

    const res = await api.api.cafes[':id'].$patch({
      param: { id: initial.id },
      json: {
        name: str('name') ?? initial.name,
        addressLine: str('addressLine') ?? initial.addressLine,
        legacyDistrict: str('legacyDistrict'),
        openingHours: openingHoursText ? { general: openingHoursText } : null,
        links:
          fanpageRaw || mapsRaw
            ? { fanpage: fanpageRaw || undefined, maps: mapsRaw || undefined }
            : null,
      },
    });

    setPending(false);
    if (!res.ok) {
      const json = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
      setError(json?.error?.message ?? 'Có lỗi xảy ra, thử lại sau');
      return;
    }
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4 rounded-lg border p-4">
      <h2 className="text-sm font-medium">Thông tin quán</h2>

      <div className="flex flex-col gap-1">
        <Label htmlFor="name">Tên quán *</Label>
        <Input id="name" name="name" required defaultValue={initial.name} />
      </div>

      <div className="flex flex-col gap-1">
        <Label htmlFor="addressLine">Địa chỉ *</Label>
        <Input id="addressLine" name="addressLine" required defaultValue={initial.addressLine} />
      </div>

      <div className="flex flex-col gap-1">
        <Label htmlFor="legacyDistrict">Địa bàn cũ (vd: Quận 3 cũ)</Label>
        <Input
          id="legacyDistrict"
          name="legacyDistrict"
          defaultValue={initial.legacyDistrict ?? ''}
        />
      </div>

      <div className="flex flex-col gap-1">
        <Label htmlFor="openingHours">Giờ mở cửa</Label>
        <Input
          id="openingHours"
          name="openingHours"
          placeholder="Vd: 8:00–22:00 hằng ngày"
          defaultValue={initial.openingHours?.general ?? ''}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1">
          <Label htmlFor="fanpage">Fanpage</Label>
          <Input id="fanpage" name="fanpage" defaultValue={initial.links?.fanpage ?? ''} />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="maps">Link chỉ đường</Label>
          <Input id="maps" name="maps" defaultValue={initial.links?.maps ?? ''} />
        </div>
      </div>

      <FormError message={error} />

      <Button type="submit" disabled={pending}>
        Lưu thay đổi
      </Button>
    </form>
  );
}
