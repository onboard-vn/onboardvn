import type { CategoryDto } from '@onboard/shared';
import { useLocalSearchParams } from 'expo-router';
import { api } from '../../../../api/client';
import { CategoryForm } from '../../../../features/admin/category-form';
import { AdminPage, LoadState } from '../../../../features/admin/ui';
import { Hint } from '../../../../ui/primitives';
import { useLoad } from '../../../../ui/use-load';

const load = () => api<{ items: CategoryDto[] }>('/categories');

export default function EditCategoryPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const state = useLoad(load, []);
  const category = state.data?.items.find((c) => c.id === id);

  return (
    <AdminPage title="Sửa thể loại" width={512}>
      <LoadState loading={!state.data} error={state.error} onRetry={state.reload} />
      {state.data && !category ? <Hint>Không tìm thấy thể loại.</Hint> : null}
      {category ? <CategoryForm initial={category} /> : null}
    </AdminPage>
  );
}
