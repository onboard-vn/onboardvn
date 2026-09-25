import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { InventoryManager } from '@/app/admin/cafes/inventory-manager';
import { getCurrentUser, serverApi } from '@/lib/api-server';
import { SITE_NAME } from '@/lib/site';
import { OwnerCafeForm } from './cafe-info-form';
import { StaffForm } from './staff-form';

export const metadata: Metadata = {
  title: `Quản lý quán · ${SITE_NAME}`,
  robots: { index: false },
};

export default async function MyCafeDetailPage(props: PageProps<'/my-cafes/[id]'>) {
  const { id } = await props.params;
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/my-cafes/${id}`)}`);

  const res = await (await serverApi()).api.cafes[':id'].manage.$get({ param: { id } });
  if (res.status === 404 || res.status === 422) notFound();
  if (res.status === 403) {
    return (
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 px-6 py-10">
        <p className="text-muted-foreground text-sm">Bạn không có quyền quản lý quán này.</p>
      </main>
    );
  }
  if (!res.ok) throw new Error('Không tải được quán');
  const cafe = await res.json();

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-6 py-10">
      <div className="flex items-baseline justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">{cafe.name}</h1>
        <Link href={`/my-cafes/${id}/consent`} className="text-sm font-medium underline">
          Đồng ý hiển thị
        </Link>
      </div>

      <OwnerCafeForm
        initial={{
          id: cafe.id,
          name: cafe.name,
          addressLine: cafe.addressLine,
          legacyDistrict: cafe.legacyDistrict,
          openingHours: cafe.openingHours,
          links: cafe.links,
        }}
      />
      <InventoryManager cafeId={cafe.id} inventory={cafe.inventory} />
      <StaffForm cafeId={cafe.id} />
    </main>
  );
}
