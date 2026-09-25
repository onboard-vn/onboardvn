import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { serverApi } from '@/lib/api-server';
import { requireStaff } from '@/lib/require-staff';
import { CafeForm } from '../../cafe-form';
import { InventoryManager } from '../../inventory-manager';
import { SITE_NAME } from '@/lib/site';

export const metadata: Metadata = { title: `Sửa quán · ${SITE_NAME}` };

export default async function EditCafePage(props: PageProps<'/admin/cafes/[id]/edit'>) {
  await requireStaff();
  const { id } = await props.params;

  const client = await serverApi();
  const [cafeRes, provincesRes] = await Promise.all([
    client.api.cafes[':id'].manage.$get({ param: { id } }),
    client.api.locations.provinces.$get(),
  ]);

  if (cafeRes.status === 404) notFound();
  if (!cafeRes.ok) throw new Error('Không tải được quán');

  const cafe = await cafeRes.json();
  const provinces = provincesRes.ok ? (await provincesRes.json()).items : [];
  const wardsRes = await client.api.locations.provinces[':code'].wards.$get({
    param: { code: cafe.provinceCode },
  });
  const initialWards = wardsRes.ok ? (await wardsRes.json()).items : [];

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-6 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">Sửa quán</h1>
      <CafeForm provinces={provinces} initialWards={initialWards} initial={cafe} />
      <InventoryManager cafeId={cafe.id} inventory={cafe.inventory} />
    </main>
  );
}
