import type { CafeMaintainerListResponse } from '@onboard/shared';
import { api } from '../../api/client';
import { ScanSession } from '../../features/admin/scan-session';
import { AdminPage, LoadState } from '../../features/admin/ui';
import { Hint } from '../../ui/primitives';
import { useLoad } from '../../ui/use-load';

const load = async () => {
  const res = await api<CafeMaintainerListResponse>('/cafes/manage', {
    query: { pageSize: 50 },
  }).catch(() => null);
  return (res?.items ?? []).map((c) => ({ id: c.id, name: c.name }));
};

export default function ScanPage() {
  const cafes = useLoad(load, []);
  return (
    <AdminPage title="Quét mã vạch" width={768}>
      <Hint>Quét liên tục nhiều hộp game, chọn quán rồi thêm vào kho bằng một lần bấm.</Hint>
      <LoadState loading={!cafes.data} error={cafes.error} onRetry={cafes.reload} />
      {cafes.data ? <ScanSession cafes={cafes.data} /> : null}
    </AdminPage>
  );
}
