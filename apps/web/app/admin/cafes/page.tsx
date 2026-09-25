import type { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { serverApi } from '@/lib/api-server';
import { requireStaff } from '@/lib/require-staff';
import { DeleteCafeButton } from './delete-cafe-button';
import { SITE_NAME } from '@/lib/site';

export const metadata: Metadata = { title: `Quản lý quán · ${SITE_NAME}` };

export default async function AdminCafesPage() {
  await requireStaff();

  const res = await (await serverApi()).api.cafes.manage.$get({ query: { pageSize: '50' } });
  if (!res.ok) throw new Error('Không tải được danh sách quán');
  const { items, total } = await res.json();

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-6 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Quản lý quán ({total})</h1>
        <Button render={<Link href="/admin/cafes/new" />}>Thêm quán</Button>
      </div>

      <ul className="flex flex-col divide-y rounded-lg border">
        {items.map((cafe) => (
          <li key={cafe.id} className="flex items-center justify-between gap-4 px-4 py-3">
            <div>
              <p className="font-medium">{cafe.name}</p>
              <p className="text-muted-foreground text-xs">
                {cafe.wardName}, {cafe.provinceName} · {cafe.gameCount} game
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                render={<Link href={`/admin/cafes/${cafe.id}/edit`} />}
              >
                Sửa
              </Button>
              <DeleteCafeButton id={cafe.id} name={cafe.name} />
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
