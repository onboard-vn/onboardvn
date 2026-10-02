import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { ClubCreateForm } from '@/components/clubs/club-create-form';
import { getCurrentUser } from '@/lib/api-server';
import { SITE_NAME } from '@/lib/site';

export const metadata: Metadata = { title: `Tạo club · ${SITE_NAME}`, robots: { index: false } };

export default async function NewClubPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login?next=/clubs/new');

  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-6 px-6 py-10">
      <h1 className="text-2xl font-semibold">Tạo club</h1>
      <ClubCreateForm />
    </main>
  );
}
