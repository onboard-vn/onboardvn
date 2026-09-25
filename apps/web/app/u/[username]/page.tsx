import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { FriendButton } from '@/components/friend-button';
import { publicApi } from '@/lib/api-public';
import { getCurrentUser } from '@/lib/api-server';
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
  const label = profile.hidden ? (profile.displayUsername ?? profile.username) : profile.name;
  return {
    title: `${label} (@${profile.username}) · ${SITE_NAME}`,
    alternates: { canonical: `${SITE_URL}/u/${profile.username}` },
  };
}

export default async function ProfilePage({ params }: PageProps<'/u/[username]'>) {
  const { username } = await params;
  const profile = await fetchProfile(username);
  if (!profile) notFound();
  const viewer = await getCurrentUser();
  const isSelf = viewer?.id === profile.id;

  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-4 px-6 py-10">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          {!profile.hidden && profile.image ? (
            // eslint-disable-next-line @next/next/no-img-element -- external avatar hosts vary
            <img src={profile.image} alt="" className="size-16 rounded-full" />
          ) : null}
          <div>
            <h1 className="text-2xl font-semibold">
              {profile.hidden ? (profile.displayUsername ?? profile.username) : profile.name}
            </h1>
            <p className="text-muted-foreground">@{profile.displayUsername ?? profile.username}</p>
          </div>
        </div>
        {isSelf ? null : viewer ? (
          <FriendButton username={profile.username} />
        ) : (
          <Link
            href={`/login?next=${encodeURIComponent(`/u/${profile.username}`)}`}
            className="text-sm underline"
          >
            Đăng nhập để kết bạn
          </Link>
        )}
      </div>
      {profile.hidden ? (
        <p className="text-muted-foreground text-sm">Hồ sơ riêng tư.</p>
      ) : profile.bggUrl ? (
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
