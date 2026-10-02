import type { Metadata } from 'next';
import { AdminClubDeleteButton } from './delete-button';
import { serverApi } from '@/lib/api-server';
import { requireStaff } from '@/lib/require-staff';
import { SITE_NAME } from '@/lib/site';

export const metadata: Metadata = { title: `Quản lý club · ${SITE_NAME}` };

export default async function AdminClubsPage() {
  await requireStaff();

  const res = await (await serverApi()).api['clubs-admin'].$get();
  if (!res.ok) throw new Error('Không tải được danh sách club');
  const { items } = await res.json();

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-6 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">Quản lý club ({items.length})</h1>
      <ul className="flex flex-col divide-y rounded-lg border">
        {items.map((club) => (
          <li key={club.id} className="flex items-center justify-between gap-4 px-4 py-3">
            <div>
              <p className="font-medium">{club.name}</p>
              <p className="text-muted-foreground text-xs">
                {club.slug} · {club.memberCount} thành viên · {club.visibility}
              </p>
            </div>
            <AdminClubDeleteButton id={club.id} name={club.name} />
          </li>
        ))}
      </ul>
    </main>
  );
}
