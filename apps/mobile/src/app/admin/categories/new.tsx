import { CategoryForm } from '../../../features/admin/category-form';
import { AdminPage } from '../../../features/admin/ui';

export default function NewCategoryPage() {
  return (
    <AdminPage title="Thêm thể loại" width={512}>
      <CategoryForm />
    </AdminPage>
  );
}
