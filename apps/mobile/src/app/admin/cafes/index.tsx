import type { CafeMaintainerListResponse } from '@onboard/shared';
import { useRouter } from 'expo-router';
import { api } from '../../../api/client';
import {
  ActionButton,
  AdminPage,
  ListCard,
  LoadState,
  Row,
  SmallButton,
} from '../../../features/admin/ui';
import { useLoad } from '../../../ui/use-load';
import { Text } from 'react-native';
import { Button } from '../../../ui/primitives';
import { colors } from '../../../ui/theme';

const load = () => api<CafeMaintainerListResponse>('/cafes/manage', { query: { pageSize: 50 } });

export default function AdminCafesPage() {
  const router = useRouter();
  const list = useLoad(load, []);
  const { data } = list;
  const unpinned = data?.items.filter((c) => c.lat === null || c.lng === null).length ?? 0;

  return (
    <AdminPage
      title={`Quản lý địa điểm chơi${data ? ` (${data.total})` : ''}`}
      action={<Button label="Thêm quán" onPress={() => router.push('/admin/cafes/new')} />}
    >
      <LoadState loading={list.loading && !data} error={list.error} onRetry={list.reload} />
      {unpinned > 0 ? (
        <Text
          style={{
            color: colors.warn,
            backgroundColor: colors.warnSoft,
            padding: 12,
            borderRadius: 10,
          }}
        >
          ⚠ {unpinned} quán chưa ghim vị trí nên không hiện trên bản đồ (chỉ có trong danh sách).
        </Text>
      ) : null}
      {data ? (
        <ListCard>
          {data.items.map((cafe) => (
            <Row
              key={cafe.id}
              title={cafe.name}
              subtitle={`${cafe.wardName}, ${cafe.provinceName} · ${cafe.gameCount} game${cafe.lat === null || cafe.lng === null ? ' · ⚠ Chưa ghim vị trí' : ''}`}
              right={
                <>
                  <SmallButton
                    label="Sửa"
                    onPress={() =>
                      router.push({ pathname: '/admin/cafes/[id]/edit', params: { id: cafe.id } })
                    }
                  />
                  <ActionButton
                    danger
                    label="Xóa"
                    confirmText={`Xóa quán "${cafe.name}"?`}
                    run={async () => {
                      await api(`/cafes/${cafe.id}`, { method: 'DELETE' });
                      list.reload();
                    }}
                  />
                </>
              }
            />
          ))}
        </ListCard>
      ) : null}
    </AdminPage>
  );
}
