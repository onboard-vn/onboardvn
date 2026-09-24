import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { serverApi } from '@/lib/api-server';
import { requireStaff } from '@/lib/require-staff';
import { CategoryForm } from '../../category-form';

export const metadata: Metadata = { title: 'Sửa thể loại · Onboard VN' };

export default async function EditCategoryPage(props: PageProps<'/admin/categories/[id]/edit'>) {
  await requireStaff();
  const { id } = await props.params;

  const res = await (await serverApi()).api.categories.$get({ query: {} });
  if (!res.ok) throw new Error('Không tải được thể loại');
  const { items } = await res.json();
  const category = items.find((c) => c.id === id);
  if (!category) notFound();

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-6 px-6 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">Sửa thể loại</h1>
      <CategoryForm initial={category} />
    </main>
  );
}
