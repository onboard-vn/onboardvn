import type { CafePublicSummaryDto, ProvinceDto } from '@onboard/shared';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { api, ApiError } from '../../api/client';
import { space } from '../../ui/theme';
import { Select } from './select';
import { useWards } from './use-wards';
import { Body, Btn, Muted, Row, TextField } from './ui';

export interface CafeOption {
  id: string;
  slug: string;
  name: string;
  wardName: string;
  provinceName: string;
}

const DEBOUNCE_MS = 300;

export function CafePicker({
  provinces,
  onPick,
}: {
  provinces: ProvinceDto[];
  onPick: (cafe: CafeOption) => void;
}) {
  const [provinceCode, setProvinceCode] = useState('');
  const [wardCode, setWardCode] = useState('');
  const wards = useWards(provinceCode);
  const [found, setFound] = useState<{ key: string; items: CafeOption[] }>({ key: '', items: [] });
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const province = provinces.find((p) => p.code === provinceCode);
    if (!province) return;
    const ward = wards.find((w) => w.code === wardCode);
    const ctrl = new AbortController();
    const timer = setTimeout(() => {
      setLoading(true);
      setError(null);
      api<{ items: CafePublicSummaryDto[] }>('/cafes', {
        query: {
          province: province.slug,
          ward: ward?.slug,
          q: query.trim() || undefined,
          pageSize: 50,
        },
        signal: ctrl.signal,
      })
        .then((r) => setFound({ key: provinceCode, items: r.items }))
        .catch((e: unknown) => {
          if (ctrl.signal.aborted) return;
          setError(e instanceof ApiError ? e.message : 'Không tìm được quán, thử lại sau');
          setFound({ key: '', items: [] });
        })
        .finally(() => {
          if (!ctrl.signal.aborted) setLoading(false);
        });
    }, DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [provinceCode, wardCode, wards, query, provinces]);

  const results = found.key === provinceCode ? found.items : [];

  return (
    <View style={{ gap: space.sm }}>
      <Select
        label="Tỉnh/thành"
        placeholder="Chọn tỉnh/thành"
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
      {provinceCode ? (
        <TextField placeholder="Tìm theo tên quán..." value={query} onChangeText={setQuery} />
      ) : null}

      {loading ? <Muted>Đang tải...</Muted> : null}
      {error ? <Body>{error}</Body> : null}

      {results.length > 0 ? (
        <View style={{ gap: space.sm }}>
          {results.map((cafe) => (
            <Row key={cafe.id} style={{ justifyContent: 'space-between', flexWrap: 'nowrap' }}>
              <View style={{ flex: 1 }}>
                <Body>
                  {cafe.name} · {cafe.wardName}
                </Body>
              </View>
              <Btn small label="Chọn" onPress={() => onPick(cafe)} />
            </Row>
          ))}
        </View>
      ) : provinceCode && !loading && !error ? (
        <Muted>Không tìm thấy quán phù hợp.</Muted>
      ) : null}
    </View>
  );
}
