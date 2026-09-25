import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { publicApi } from '@/lib/api-public';
import { SITE_URL } from '@/lib/env';
import { SITE_NAME } from '@/lib/site';

async function fetchProfile(username: string) {
  const res = await publicApi().api.users[':username'].$get({ param: { username } });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Profile fetch failed: ${res.status}`);
  return res.json();
}

export async function generateMetadata({ params }: PageProps<'/u/[username]'>): Promise<Metadata> {
  const profile = await fetchProfile((await params).username);
  if (!profile) return { title: `Không tìm thấy · ${SITE_NAME}` };
  return {
    title: `${profile.name} (@${profile.username}) · ${SITE_NAME}`,
    alternates: { canonical: `${SITE_URL}/u/${profile.username}` },
  };
}

export default async function ProfilePage({ params }: PageProps<'/u/[username]'>) {
  const profile = await fetchProfile((await params).username);
  if (!profile) notFound();
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-4 px-6 py-10">
      <div className="flex items-center gap-4">
        {profile.image ? (
          // eslint-disable-next-line @next/next/no-img-element -- external avatar hosts vary
          <img src={profile.image} alt="" className="size-16 rounded-full" />
        ) : null}
        <div>
          <h1 className="text-2xl font-semibold">{profile.name}</h1>
          <p className="text-muted-foreground">@{profile.displayUsername ?? profile.username}</p>
        </div>
      </div>
      {profile.bggUrl ? (
        <p className="text-sm">
          BoardGameGeek:{' '}
          <a href={profile.bggUrl} target="_blank" rel="noopener noreferrer" className="underline">
            {profile.bggUsername}
          </a>
        </p>
      ) : null}
    </main>
  );
}
