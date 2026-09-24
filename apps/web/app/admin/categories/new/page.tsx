import type { Metadata } from 'next';
import { requireStaff } from '@/lib/require-staff';
import { CategoryForm } from '../category-form';

export const metadata: Metadata = { title: 'Thêm thể loại · Onboard VN' };

export default async function NewCategoryPage() {
  await requireStaff();

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-6 px-6 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">Thêm thể loại</h1>
      <CategoryForm />
    </main>
  );
}
