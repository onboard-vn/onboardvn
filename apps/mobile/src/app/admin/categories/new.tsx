import { t } from '../../../ui/i18n';
import { useAppPreferences } from '../../../ui/preferences';
import { CategoryForm } from '../../../features/admin/category-form';
import { AdminPage } from '../../../features/admin/ui';

export default function NewCategoryPage() {
  useAppPreferences();
  return (
    <AdminPage title={t('Thêm thể loại')} width={512}>
      <CategoryForm />
    </AdminPage>
  );
}
