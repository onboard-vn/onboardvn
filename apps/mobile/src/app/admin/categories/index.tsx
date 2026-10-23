import { t } from '../../../ui/i18n';
import { useAppPreferences } from '../../../ui/preferences';
import type { CategoryDto } from '@onboard/shared';
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
import { Button } from '../../../ui/primitives';
import { useLoad } from '../../../ui/use-load';

const KIND_LABEL = { category: 'Thể loại', mechanic: 'Cơ chế' } as const;

const load = () => api<{ items: CategoryDto[] }>('/categories');

export default function AdminCategoriesPage() {
  useAppPreferences();
  const router = useRouter();
  const list = useLoad(load, []);
  const { data } = list;

  return (
    <AdminPage
      title={
        data ? t('Quản lý thể loại ({count})', { count: data.items.length }) : t('Quản lý thể loại')
      }
      width={768}
      action={
        <Button label={t('Thêm thể loại')} onPress={() => router.push('/admin/categories/new')} />
      }
    >
      <LoadState loading={list.loading && !data} error={list.error} onRetry={list.reload} />
      {data ? (
        <ListCard>
          {data.items.map((category) => {
            const name = category.nameVi ?? category.name;
            return (
              <Row
                key={category.id}
                title={name}
                subtitle={`${category.name} · ${t(KIND_LABEL[category.kind])}${category.bggId ? ` · BGG #${category.bggId}` : ''}`}
                right={
                  <>
                    <SmallButton
                      label={t('Sửa')}
                      onPress={() =>
                        router.push({
                          pathname: '/admin/categories/[id]/edit',
                          params: { id: category.id },
                        })
                      }
                    />
                    <ActionButton
                      danger
                      label={t('Xóa')}
                      confirmText={t('Xóa thể loại "{name}"?', { name })}
                      run={async () => {
                        await api(`/categories/${category.id}`, { method: 'DELETE' });
                        list.reload();
                      }}
                    />
                  </>
                }
              />
            );
          })}
        </ListCard>
      ) : null}
    </AdminPage>
  );
}
