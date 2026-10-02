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
  const router = useRouter();
  const list = useLoad(load, []);
  const { data } = list;

  return (
    <AdminPage
      title={`Quản lý thể loại${data ? ` (${data.items.length})` : ''}`}
      width={768}
      action={<Button label="Thêm thể loại" onPress={() => router.push('/admin/categories/new')} />}
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
                subtitle={`${category.name} · ${KIND_LABEL[category.kind]}${category.bggId ? ` · BGG #${category.bggId}` : ''}`}
                right={
                  <>
                    <SmallButton
                      label="Sửa"
                      onPress={() =>
                        router.push({
                          pathname: '/admin/categories/[id]/edit',
                          params: { id: category.id },
                        })
                      }
                    />
                    <ActionButton
                      danger
                      label="Xóa"
                      confirmText={`Xóa thể loại "${name}"?`}
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
