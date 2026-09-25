'use client';

import type { CafeAmenities, CafeFeeModel, CafeOpeningHours, VenueType } from '@onboard/shared';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { AmenitiesFields } from '@/components/cafe/amenities-fields';
import { OpeningHoursEditor } from '@/components/cafe/opening-hours-editor';
import { FormError } from '@/components/form-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FEE_MODEL_LABELS, VENUE_TYPE_LABELS } from '@/lib/cafe-labels';
import { api } from '@/lib/api';

export interface OwnerCafeFormInitial {
  id: string;
  name: string;
  addressLine: string;
  legacyDistrict: string | null;
  openingHours?: CafeOpeningHours;
  links?: { fanpage?: string; maps?: string };
  venueType: VenueType;
  amenities?: CafeAmenities;
  feeModel?: CafeFeeModel;
  feeNote?: string | null;
}

/** Owner-facing café info form: same fields as the admin form minus `sourceUrl`/`consentStatus`,
 * which the API silently strips from a café-scoped PATCH anyway. */
export function OwnerCafeForm({ initial }: { initial: OwnerCafeFormInitial }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [saved, setSaved] = useState(false);
  const [venueType, setVenueType] = useState<VenueType>(initial.venueType);
  const [amenities, setAmenities] = useState<CafeAmenities>(initial.amenities ?? {});
  const [feeModel, setFeeModel] = useState<CafeFeeModel>(initial.feeModel ?? 'unknown');
  const [hours, setHours] = useState<CafeOpeningHours>(initial.openingHours);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);
    setSaved(false);

    const data = new FormData(e.currentTarget);
    const str = (key: string) => {
      const v = String(data.get(key) ?? '').trim();
      return v !== '' ? v : null;
    };
    const fanpageRaw = String(data.get('fanpage') ?? '').trim();
    const mapsRaw = String(data.get('maps') ?? '').trim();
    const feeNoteRaw = String(data.get('feeNote') ?? '').trim();

    const res = await api.api.cafes[':id'].$patch({
      param: { id: initial.id },
      json: {
        name: str('name') ?? initial.name,
        addressLine: str('addressLine') ?? initial.addressLine,
        legacyDistrict: str('legacyDistrict'),
        venueType,
        amenities,
        feeModel,
        feeNote: feeNoteRaw || null,
        openingHours: hours ?? null,
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
    setSaved(true);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4 rounded-lg border p-4">
      <h2 className="text-sm font-medium">Thông tin địa điểm</h2>

      <div className="flex flex-col gap-1">
        <Label htmlFor="name">Tên địa điểm *</Label>
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
        <Label htmlFor="venueType">Loại địa điểm</Label>
        <select
          id="venueType"
          value={venueType}
          onChange={(e) => setVenueType(e.target.value as VenueType)}
          className="border-input h-9 rounded-md border bg-transparent px-3 text-sm dark:bg-input/30"
        >
          {Object.entries(VENUE_TYPE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
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

      <div className="flex flex-col gap-2 border-t pt-4">
        <h3 className="text-sm font-medium">Tiêu chí</h3>
        <AmenitiesFields value={amenities} onChange={setAmenities} />
      </div>

      <div className="flex flex-col gap-2 border-t pt-4">
        <h3 className="text-sm font-medium">Cách tính phí</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <Label htmlFor="feeModel">Hình thức</Label>
            <select
              id="feeModel"
              value={feeModel}
              onChange={(e) => setFeeModel(e.target.value as CafeFeeModel)}
              className="border-input h-9 rounded-md border bg-transparent px-3 text-sm dark:bg-input/30"
            >
              {Object.entries(FEE_MODEL_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="feeNote">Ghi chú giá</Label>
            <Input
              id="feeNote"
              name="feeNote"
              maxLength={120}
              defaultValue={initial.feeNote ?? ''}
            />
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2 border-t pt-4">
        <h3 className="text-sm font-medium">Giờ mở cửa</h3>
        <OpeningHoursEditor value={hours} onChange={setHours} />
      </div>

      <FormError message={error} />
      {saved ? <p className="text-sm text-muted-foreground">Đã lưu.</p> : null}

      <Button type="submit" disabled={pending}>
        Lưu thay đổi
      </Button>
    </form>
  );
}
