import type { ProvinceDto } from '@onboard/shared';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { DateField } from './date-field';
import { eventFiltersToParams, type EventFilterValues, type EventsView } from './filters';
import { Select } from './select';
import { useWards } from './use-wards';
import { Box, Btn, href } from './ui';

export function EventFilters({
  provinces,
  initialProvinceCode,
  initialWardCode,
  initialFilters,
  view,
  month,
}: {
  provinces: ProvinceDto[];
  initialProvinceCode?: string;
  initialWardCode?: string;
  initialFilters: EventFilterValues;
  view: EventsView;
  month?: string;
}) {
  const router = useRouter();
  const [provinceCode, setProvinceCode] = useState(initialProvinceCode ?? '');
  const [wardCode, setWardCode] = useState(initialWardCode ?? '');
  const wards = useWards(provinceCode);
  const [from, setFrom] = useState(initialFilters.from ?? '');

  function onSubmit() {
    const province = provinces.find((p) => p.code === provinceCode);
    const ward = wards.find((w) => w.code === wardCode);
    const params = eventFiltersToParams(
      { province: province?.slug, ward: ward?.slug, from: from || undefined },
      view,
      month,
    );
    const qs = params.toString();
    router.push(href(qs ? `/events?${qs}` : '/events'));
  }

  return (
    <Box>
      <Select
        label="Tỉnh/thành"
        placeholder="Tất cả"
        value={provinceCode}
        options={provinces.map((p) => ({ value: p.code, label: p.name }))}
        onChange={(code) => {
          setProvinceCode(code);
          setWardCode('');
        }}
      />
      <Select
        label="Phường/xã"
        placeholder="Tất cả"
        value={wardCode}
        disabled={!provinceCode}
        options={wards.map((w) => ({ value: w.code, label: w.name }))}
        onChange={setWardCode}
      />
      <DateField label="Từ ngày" kind="date" value={from} onChange={setFrom} />
      <Btn small label="Lọc" onPress={onSubmit} style={{ alignSelf: 'flex-start' }} />
    </Box>
  );
}
