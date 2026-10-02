import type {
  CafeConsentStatus,
  CafeCreateInput,
  CafeFeeModel,
  CafeMaintainerDto,
  ProvinceDto,
  VenueType,
  WardDto,
  WardListResponse,
} from '@onboard/shared';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { api } from '../../api/client';
import { Button } from '../../ui/primitives';
import { space } from '../../ui/theme';
import { FEE_MODEL_LABELS, VENUE_TYPE_LABELS } from '../cafes/labels';
import { errorMessage } from '../errors';
import { AmenitiesFields } from './amenities-fields';
import { buildCafeBody, emptyCafeValues, validateCafe, type CafeFormValues } from './cafe-body';
import { OpeningHoursEditor } from './opening-hours-editor';
import { PinEditor } from './pin-editor';
import { ErrorText, Field, PickerField, Section, SuccessText, type Option } from './ui';

const CONSENT_OPTIONS: Option<CafeConsentStatus>[] = [
  { value: 'granted', label: 'Đã đồng ý (granted)' },
  { value: 'pending', label: 'Chờ xác nhận (pending)' },
  { value: 'public_info_only', label: 'Chỉ thông tin công khai (public_info_only)' },
  { value: 'declined', label: 'Đã từ chối hiển thị (declined)' },
];

const VENUE_OPTIONS = (Object.keys(VENUE_TYPE_LABELS) as VenueType[]).map((value) => ({
  value,
  label: VENUE_TYPE_LABELS[value],
}));
const FEE_OPTIONS = (Object.keys(FEE_MODEL_LABELS) as CafeFeeModel[]).map((value) => ({
  value,
  label: FEE_MODEL_LABELS[value],
}));

const valuesFrom = (c: CafeMaintainerDto): CafeFormValues => ({
  name: c.name,
  provinceCode: c.provinceCode,
  wardCode: c.wardCode,
  addressLine: c.addressLine,
  legacyDistrict: c.legacyDistrict ?? '',
  lat: c.lat,
  lng: c.lng,
  venueType: c.venueType,
  fanpage: c.links?.fanpage ?? '',
  phone: c.links?.phone ?? '',
  maps: c.links?.maps ?? '',
  amenities: c.amenities ?? {},
  feeModel: c.feeModel ?? 'unknown',
  feeNote: c.feeNote ?? '',
  hours: c.openingHours,
  consentStatus: c.consentStatus,
  sourceUrl: c.sourceUrl ?? '',
  consentNote: c.consentNote ?? '',
});

export function CafeForm({
  provinces,
  initialWards = [],
  initial,
  onSaved,
}: {
  provinces: ProvinceDto[];
  initialWards?: WardDto[];
  initial?: CafeMaintainerDto;
  onSaved?: () => void;
}) {
  const router = useRouter();
  const [v, setV] = useState<CafeFormValues>(() =>
    initial ? valuesFrom(initial) : emptyCafeValues(),
  );
  const [wards, setWards] = useState<WardDto[]>(initialWards);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, setPending] = useState(false);

  const patch = (next: Partial<CafeFormValues>) => {
    setSaved(false);
    setV((cur) => ({ ...cur, ...next }));
  };

  async function onProvinceChange(code: string) {
    patch({ provinceCode: code, wardCode: '' });
    setWards([]);
    try {
      const res = await api<WardListResponse>(
        `/locations/provinces/${encodeURIComponent(code)}/wards`,
      );
      setWards(res.items);
    } catch {
      setWards([]);
    }
  }

  async function onSubmit() {
    const invalid = validateCafe(v);
    if (invalid) {
      setError(invalid);
      return;
    }
    setPending(true);
    setError(null);
    try {
      const body = buildCafeBody(v, !!initial, initial?.links);
      if (initial) {
        await api(`/cafes/${initial.id}`, { method: 'PATCH', body });
        setSaved(true);
        onSaved?.();
      } else {
        const cafe = await api<{ id: string }>('/cafes', {
          method: 'POST',
          body: body as unknown as CafeCreateInput,
        });
        router.replace({ pathname: '/admin/cafes/[id]/edit', params: { id: cafe.id } });
      }
    } catch (e) {
      setError(errorMessage(e, 'Có lỗi xảy ra, thử lại sau'));
    } finally {
      setPending(false);
    }
  }

  return (
    <View style={{ gap: space.lg }}>
      <Field label="Tên quán *" value={v.name} onChangeText={(name) => patch({ name })} />
      <PickerField
        label="Tỉnh/thành *"
        placeholder="Chọn tỉnh/thành"
        value={v.provinceCode}
        options={provinces.map((p) => ({ value: p.code, label: p.name }))}
        onChange={(code) => void onProvinceChange(code)}
      />
      <PickerField
        label="Phường/xã *"
        placeholder="Chọn phường/xã"
        value={v.wardCode}
        disabled={!v.provinceCode}
        options={wards.map((w) => ({ value: w.code, label: w.name }))}
        onChange={(wardCode) => patch({ wardCode })}
      />
      <Field
        label="Địa chỉ *"
        value={v.addressLine}
        onChangeText={(addressLine) => patch({ addressLine })}
      />
      <Field
        label="Địa bàn cũ (vd: Quận 3 cũ)"
        value={v.legacyDistrict}
        onChangeText={(legacyDistrict) => patch({ legacyDistrict })}
      />

      <PinEditor lat={v.lat} lng={v.lng} onChange={(lat, lng) => patch({ lat, lng })} />

      <PickerField
        label="Loại địa điểm"
        value={v.venueType}
        options={VENUE_OPTIONS}
        onChange={(venueType) => patch({ venueType })}
      />
      <Field label="Fanpage" value={v.fanpage} onChangeText={(fanpage) => patch({ fanpage })} />
      <Field label="Số điện thoại" value={v.phone} onChangeText={(phone) => patch({ phone })} />
      <Field label="Link chỉ đường" value={v.maps} onChangeText={(maps) => patch({ maps })} />

      <Section title="Tiêu chí">
        <AmenitiesFields value={v.amenities} onChange={(amenities) => patch({ amenities })} />
      </Section>

      <Section title="Cách tính phí">
        <PickerField
          label="Hình thức"
          value={v.feeModel}
          options={FEE_OPTIONS}
          onChange={(feeModel) => patch({ feeModel })}
        />
        <Field
          label="Ghi chú giá"
          maxLength={120}
          value={v.feeNote}
          onChangeText={(feeNote) => patch({ feeNote })}
        />
      </Section>

      <Section title="Giờ mở cửa">
        <OpeningHoursEditor value={v.hours} onChange={(hours) => patch({ hours })} />
      </Section>

      <PickerField
        label="Trạng thái đồng ý (provenance) *"
        value={v.consentStatus}
        options={CONSENT_OPTIONS}
        onChange={(consentStatus) => patch({ consentStatus })}
      />
      <Field
        label={`Nguồn dữ liệu (sourceUrl)${v.consentStatus !== 'granted' ? ' *' : ''}`}
        value={v.sourceUrl}
        onChangeText={(sourceUrl) => patch({ sourceUrl })}
      />
      <Field
        label="Ghi chú nội bộ (không hiển thị công khai)"
        multiline
        value={v.consentNote}
        onChangeText={(consentNote) => patch({ consentNote })}
      />

      <ErrorText message={error} />
      <SuccessText message={saved ? 'Đã lưu thay đổi' : null} />
      <Button
        label={initial ? 'Lưu thay đổi' : 'Tạo quán'}
        disabled={pending}
        onPress={() => void onSubmit()}
      />
    </View>
  );
}
