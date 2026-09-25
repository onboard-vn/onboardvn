import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { FriendQr } from '@/components/friend-qr';
import { getCurrentUser } from '@/lib/api-server';
import { AccountSecurity } from './account-security';
import { PrivacySettings } from './privacy-settings';
import { ProfileForm } from './profile-form';
import { SITE_NAME } from '@/lib/site';

export const metadata: Metadata = { title: `Tài khoản · ${SITE_NAME}`, robots: { index: false } };

export default async function AccountPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-6 px-6 py-10">
      <div className="flex items-baseline justify-between">
        <h1 className="text-2xl font-semibold">Tài khoản</h1>
        <div className="flex gap-3 text-sm">
          <Link href="/events/mine" className="underline">
            Kèo của tôi
          </Link>
          {user.username ? (
            <Link href={`/u/${user.username}`} className="underline">
              Xem hồ sơ công khai
            </Link>
          ) : null}
        </div>
      </div>
      <ProfileForm
        initial={{
          name: user.name,
          username: user.displayUsername ?? user.username ?? '',
          bggUsername: user.bggUsername ?? '',
        }}
      />
      <div className="rounded-lg border p-4">
        <h2 className="mb-3 text-sm font-medium">Mã mời kết bạn (QR)</h2>
        <FriendQr />
      </div>
      <PrivacySettings
        initial={{
          profileVisibility: user.profileVisibility,
          playsVisibility: user.playsVisibility,
          friendsVisibility: user.friendsVisibility,
          emailOnFriendRequest: user.emailOnFriendRequest,
        }}
      />
      <AccountSecurity />
    </main>
  );
}
