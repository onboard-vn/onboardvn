import { t } from '../../../ui/i18n';
import { useAppPreferences } from '../../../ui/preferences';
import type { ProvinceListResponse } from '@onboard/shared';
import { api } from '../../../api/client';
import { CafeForm } from '../../../features/admin/cafe-form';
import { AdminPage, LoadState } from '../../../features/admin/ui';
import { useLoad } from '../../../ui/use-load';

const loadProvinces = () =>
  api<ProvinceListResponse>('/locations/provinces').catch(() => ({ items: [] }));

export default function NewCafePage() {
  useAppPreferences();
  const provinces = useLoad(loadProvinces, []);
  return (
    <AdminPage title={t('Thêm địa điểm chơi')} width={672}>
      <LoadState loading={!provinces.data} error={provinces.error} onRetry={provinces.reload} />
      {provinces.data ? <CafeForm provinces={provinces.data.items} /> : null}
    </AdminPage>
  );
}
