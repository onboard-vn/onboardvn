import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { ScanSession } from '@/components/scan-session';
import { getCurrentUser, serverApi } from '@/lib/api-server';
import { SITE_NAME } from '@/lib/site';

export const metadata: Metadata = {
  title: `Đóng góp game · ${SITE_NAME}`,
  robots: { index: false },
};

export default async function ContributeToCafePage(props: PageProps<'/cafes/[slug]/contribute'>) {
  const { slug } = await props.params;
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/cafes/${slug}/contribute`)}`);

  const res = await (await serverApi()).api.cafes[':slug'].$get({ param: { slug } });
  if (res.status === 404) notFound();
  if (!res.ok) throw new Error('Không tải được quán');
  const cafe = await res.json();

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-10">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Đóng góp game · {cafe.name}</h1>
        <p className="text-muted-foreground text-sm">
          Quét mã vạch hoặc tìm game trong danh mục để đóng góp vào kho của quán này. Chủ quán/staff
          có thể xác nhận hoặc gỡ đóng góp của bạn.
        </p>
      </div>
      <ScanSession cafes={[{ id: cafe.id, name: cafe.name }]} lookup="local" mode="community" />
    </main>
  );
}
