import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { ClubManagePanel } from '@/components/clubs/club-manage-panel';
import { getCurrentUser, serverApi } from '@/lib/api-server';
import { SITE_NAME } from '@/lib/site';

export const metadata: Metadata = {
  title: `Quản lý club · ${SITE_NAME}`,
  robots: { index: false },
};

export default async function ManageClubPage(props: PageProps<'/clubs/[slug]/manage'>) {
  const { slug } = await props.params;
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/clubs/${slug}/manage`)}`);

  const client = await serverApi();
  const res = await client.api.clubs[':slug'].$get({ param: { slug } });
  if (res.status === 404) notFound();
  if (!res.ok) throw new Error('Không tải được club');
  const { club, myRole, members } = await res.json();
  if (!club.id || (myRole !== 'owner' && myRole !== 'admin')) notFound();

  const externalRes = await client.api.clubs[':id']['external-members'].$get({
    param: { id: club.id },
  });
  const externalMembers = externalRes.ok ? (await externalRes.json()).items : [];

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-6 py-10">
      <h1 className="text-2xl font-semibold">Quản lý {club.name}</h1>
      <ClubManagePanel
        club={{ id: club.id, slug: club.slug, name: club.name, description: club.description }}
        myRole={myRole}
        viewerId={user.id}
        members={members ?? []}
        externalMembers={externalMembers}
      />
    </main>
  );
}
