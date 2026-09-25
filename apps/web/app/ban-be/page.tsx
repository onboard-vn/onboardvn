import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/api-server';
import { SITE_NAME } from '@/lib/site';
import { BanBeTabs } from './ban-be-tabs';

export const metadata: Metadata = { title: `Bạn bè · ${SITE_NAME}`, robots: { index: false } };

export default async function FriendsPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login?next=/ban-be');
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-6 px-6 py-10">
      <h1 className="text-2xl font-semibold">Bạn bè</h1>
      <BanBeTabs />
    </main>
  );
}
