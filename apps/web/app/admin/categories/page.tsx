import type { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { serverApi } from '@/lib/api-server';
import { requireStaff } from '@/lib/require-staff';
import { DeleteCategoryButton } from './delete-category-button';

export const metadata: Metadata = { title: 'Quản lý thể loại · Onboard VN' };

const KIND_LABEL = { category: 'Thể loại', mechanic: 'Cơ chế' } as const;

export default async function AdminCategoriesPage() {
  await requireStaff();

  const res = await (await serverApi()).api.categories.$get({ query: {} });
  if (!res.ok) throw new Error('Không tải được danh sách thể loại');
  const { items } = await res.json();

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Quản lý thể loại ({items.length})</h1>
        <Button render={<Link href="/admin/categories/new" />}>Thêm thể loại</Button>
      </div>

      <ul className="flex flex-col divide-y rounded-lg border">
        {items.map((category) => (
          <li key={category.id} className="flex items-center justify-between gap-4 px-4 py-3">
            <div>
              <p className="font-medium">{category.nameVi ?? category.name}</p>
              <p className="text-muted-foreground text-xs">
                {category.name} · {KIND_LABEL[category.kind]}
                {category.bggId ? ` · BGG #${category.bggId}` : ''}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                render={<Link href={`/admin/categories/${category.id}/edit`} />}
              >
                Sửa
              </Button>
              <DeleteCategoryButton id={category.id} name={category.nameVi ?? category.name} />
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
