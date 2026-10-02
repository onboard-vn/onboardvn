import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { buttonVariants } from '@/components/ui/button';
import { getCurrentUser, serverApi } from '@/lib/api-server';
import { SITE_NAME } from '@/lib/site';

export const metadata: Metadata = { title: `Club · ${SITE_NAME}`, robots: { index: false } };

const ROLE_LABEL = { owner: 'Owner', admin: 'Admin', member: 'Thành viên' } as const;

export default async function ClubsPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login?next=/clubs');

  const res = await (await serverApi()).api.clubs.$get();
  if (!res.ok) throw new Error('Không tải được danh sách club');
  const { items } = await res.json();

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-6 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Club của tôi</h1>
        <Link href="/clubs/new" className={buttonVariants({ size: 'sm' })}>
          Tạo club
        </Link>
      </div>
      {items.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          Bạn chưa tham gia club nào. Tạo club mới hoặc mở link mời từ bạn bè.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {items.map((club) => (
            <li key={club.id}>
              <Link
                href={`/clubs/${club.slug}`}
                className="hover:border-foreground/40 flex items-center justify-between rounded-lg border p-4 transition"
              >
                <span className="font-medium">{club.name}</span>
                <span className="text-muted-foreground text-sm">
                  {club.memberCount} thành viên · {ROLE_LABEL[club.myRole]}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
