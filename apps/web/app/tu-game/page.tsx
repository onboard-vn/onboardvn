import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/api-server';
import { SITE_NAME } from '@/lib/site';
import { ShelfManager } from './shelf-manager';

export const metadata: Metadata = { title: `Tủ game · ${SITE_NAME}`, robots: { index: false } };

export default async function ShelfPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login?next=/tu-game');
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-6 px-6 py-10">
      <h1 className="text-2xl font-semibold">Tủ game của bạn</h1>
      <ShelfManager />
    </main>
  );
}
