import { t } from '../../../ui/i18n';
import { useAppPreferences } from '../../../ui/preferences';
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
  useAppPreferences();
  const router = useRouter();
  const list = useLoad(load, []);
  const { data } = list;
  const unpinned = data?.items.filter((c) => c.lat === null || c.lng === null).length ?? 0;

  return (
    <AdminPage
      title={
        data
          ? t('Quản lý địa điểm chơi ({count})', { count: data.total })
          : t('Quản lý địa điểm chơi')
      }
      action={<Button label={t('Thêm quán')} onPress={() => router.push('/admin/cafes/new')} />}
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
          {t(
            '⚠ {count} quán chưa ghim vị trí nên không hiện trên bản đồ (chỉ có trong danh sách).',
            {
              count: unpinned,
            },
          )}
        </Text>
      ) : null}
      {data ? (
        <ListCard>
          {data.items.map((cafe) => (
            <Row
              key={cafe.id}
              title={cafe.name}
              subtitle={`${cafe.wardName}, ${cafe.provinceName} · ${t('{count} game', { count: cafe.gameCount })}${cafe.lat === null || cafe.lng === null ? ` · ⚠ ${t('Chưa ghim vị trí')}` : ''}`}
              right={
                <>
                  <SmallButton
                    label={t('Sửa')}
                    onPress={() =>
                      router.push({ pathname: '/admin/cafes/[id]/edit', params: { id: cafe.id } })
                    }
                  />
                  <ActionButton
                    danger
                    label={t('Xóa')}
                    confirmText={t('Xóa quán "{name}"?', { name: cafe.name })}
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
