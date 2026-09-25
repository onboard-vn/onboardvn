import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { ScanSession } from '@/components/scan-session';
import { getCurrentUser, serverApi } from '@/lib/api-server';
import { SITE_NAME } from '@/lib/site';

export const metadata: Metadata = {
  title: `Quét mã vạch · ${SITE_NAME}`,
  robots: { index: false },
};

export default async function MyCafeScanPage(props: PageProps<'/my-cafes/[id]/scan'>) {
  const { id } = await props.params;
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/my-cafes/${id}/scan`)}`);

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
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-10">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Quét mã vạch · {cafe.name}</h1>
        <p className="text-muted-foreground text-sm">
          Quét liên tục nhiều hộp game rồi thêm vào kho quán này bằng một lần bấm.
        </p>
      </div>
      <ScanSession cafes={[{ id: cafe.id, name: cafe.name }]} lookup="local" />
    </main>
  );
}
