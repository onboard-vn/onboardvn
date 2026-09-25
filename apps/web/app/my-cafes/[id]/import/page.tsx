import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { getCurrentUser, serverApi } from '@/lib/api-server';
import { SITE_NAME } from '@/lib/site';
import { ImportManager } from './import-manager';

export const metadata: Metadata = {
  title: `Import kho từ CSV · ${SITE_NAME}`,
  robots: { index: false },
};

export default async function MyCafeImportPage(props: PageProps<'/my-cafes/[id]/import'>) {
  const { id } = await props.params;
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/my-cafes/${id}/import`)}`);

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
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Import kho · {cafe.name}</h1>
        <p className="text-muted-foreground text-sm">
          Tải file mẫu, điền tên game (tối đa 500 dòng), tải lên để xem trước rồi mới áp dụng vào
          kho. Không tạo game mới — chỉ khớp với danh mục hiện có.
        </p>
      </div>
      <ImportManager cafeId={cafe.id} />
    </main>
  );
}
