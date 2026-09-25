import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { InventoryManager } from '@/app/admin/cafes/inventory-manager';
import { getCurrentUser, serverApi } from '@/lib/api-server';
import { SITE_NAME } from '@/lib/site';
import { CafeMediaForm } from './cafe-media-form';
import { OwnerCafeForm } from './cafe-info-form';
import { StaffForm } from './staff-form';

export const metadata: Metadata = {
  title: `Quản lý địa điểm chơi · ${SITE_NAME}`,
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
      <div className="flex items-baseline justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">{cafe.name}</h1>
        <div className="flex flex-wrap gap-3 text-sm font-medium">
          <Link href={`/my-cafes/${id}/import`} className="underline">
            Import kho CSV
          </Link>
          <Link href={`/my-cafes/${id}/scan`} className="underline">
            Quét mã vạch
          </Link>
          <Link href={`/my-cafes/${id}/consent`} className="underline">
            Đồng ý hiển thị
          </Link>
        </div>
      </div>

      <CafeMediaForm
        cafeId={cafe.id}
        logoUrl={cafe.logoUrl}
        coverUrl={cafe.coverUrl}
        photos={cafe.photos}
      />

      <OwnerCafeForm
        initial={{
          id: cafe.id,
          name: cafe.name,
          addressLine: cafe.addressLine,
          legacyDistrict: cafe.legacyDistrict,
          openingHours: cafe.openingHours,
          links: cafe.links,
          venueType: cafe.venueType,
          amenities: cafe.amenities,
          feeModel: cafe.feeModel,
          feeNote: cafe.feeNote,
        }}
      />
      <InventoryManager cafeId={cafe.id} inventory={cafe.inventory} />
      <StaffForm cafeId={cafe.id} />
    </main>
  );
}
