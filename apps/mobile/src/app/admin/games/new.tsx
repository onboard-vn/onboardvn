import type { CategoryDto } from '@onboard/shared';
import { useLocalSearchParams } from 'expo-router';
import { api } from '../../../api/client';
import { GameForm } from '../../../features/admin/game-form';
import { normalizeFilterParam } from '../../../features/admin/filter-param';
import { AdminPage, LoadState } from '../../../features/admin/ui';
import { useLoad } from '../../../ui/use-load';

const load = () =>
  api<{ items: CategoryDto[] }>('/categories').catch(() => ({ items: [] as CategoryDto[] }));

export default function NewGamePage() {
  const { nameEn } = useLocalSearchParams<{ nameEn?: string }>();
  const categories = useLoad(load, []);
  return (
    <AdminPage title="Thêm game" width={672}>
      <LoadState loading={!categories.data} error={categories.error} onRetry={categories.reload} />
      {categories.data ? (
        <GameForm categories={categories.data.items} presetNameEn={normalizeFilterParam(nameEn)} />
      ) : null}
    </AdminPage>
  );
}
