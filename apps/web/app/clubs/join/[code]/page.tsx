import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { ClubJoinForm } from '@/components/clubs/club-join-form';
import { getCurrentUser } from '@/lib/api-server';
import { SITE_NAME } from '@/lib/site';

export const metadata: Metadata = {
  title: `Tham gia club · ${SITE_NAME}`,
  robots: { index: false },
  referrer: 'no-referrer',
};

export default async function JoinClubPage(props: PageProps<'/clubs/join/[code]'>) {
  const { code } = await props.params;
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/clubs/join/${code}`)}`);

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-6 py-10">
      <h1 className="text-2xl font-semibold">Tham gia club</h1>
      <ClubJoinForm code={code} />
    </main>
  );
}
