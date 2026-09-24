import type { Metadata } from 'next';
import { serverApi } from '@/lib/api-server';
import { requireStaff } from '@/lib/require-staff';
import { CafeForm } from '../cafe-form';

export const metadata: Metadata = { title: 'Thêm quán · Onboard VN' };

export default async function NewCafePage() {
  await requireStaff();

  const res = await (await serverApi()).api.locations.provinces.$get();
  const provinces = res.ok ? (await res.json()).items : [];

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-6 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">Thêm quán</h1>
      <CafeForm provinces={provinces} />
    </main>
  );
}
