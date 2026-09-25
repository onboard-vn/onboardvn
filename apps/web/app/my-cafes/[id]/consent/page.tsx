import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { getCurrentUser, serverApi } from '@/lib/api-server';
import { SITE_NAME } from '@/lib/site';
import { ConsentForm } from '../consent-form';

export const metadata: Metadata = {
  title: `Đồng ý hiển thị · ${SITE_NAME}`,
  robots: { index: false },
};

export default async function CafeConsentPage(props: PageProps<'/my-cafes/[id]/consent'>) {
  const { id } = await props.params;
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/my-cafes/${id}/consent`)}`);

  const res = await (await serverApi()).api.cafes[':id'].manage.$get({ param: { id } });
  if (res.status === 404 || res.status === 422) notFound();
  if (res.status === 403) {
    return (
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 px-6 py-10">
        <p className="text-muted-foreground text-sm">Bạn không có quyền quản lý quán này.</p>
      </main>
    );
  }
  if (!res.ok) throw new Error('Không tải được quán');
  const cafe = await res.json();

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-6 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">Đồng ý hiển thị công khai</h1>
      <p className="text-muted-foreground text-sm">
        Quán &quot;{cafe.name}&quot; của bạn hiện chỉ hiện thông tin cơ bản. Bấm &quot;Đồng ý hiển
        thị&quot; để công khai đầy đủ thông tin, hoặc &quot;Từ chối hiển thị&quot; để ẩn quán khỏi
        các trang công khai.
      </p>
      <ConsentForm cafeId={id} consentStatus={cafe.consentStatus} />
    </main>
  );
}
