import type { WardDto, WardListResponse } from '@onboard/shared';
import { useEffect, useState } from 'react';
import { api } from '../../api/client';

export function useWards(provinceCode: string): WardDto[] {
  const [loaded, setLoaded] = useState<{ code: string; items: WardDto[] }>({ code: '', items: [] });

  useEffect(() => {
    if (!provinceCode) return;
    let live = true;
    api<WardListResponse>(`/locations/provinces/${provinceCode}/wards`).then(
      (r) => live && setLoaded({ code: provinceCode, items: r.items }),
      () => live && setLoaded({ code: provinceCode, items: [] }),
    );
    return () => {
      live = false;
    };
  }, [provinceCode]);

  return loaded.code === provinceCode ? loaded.items : [];
}
