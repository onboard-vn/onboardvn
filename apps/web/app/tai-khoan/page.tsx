import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/api-server';
import { AccountSecurity } from './account-security';
import { ProfileForm } from './profile-form';

export const metadata: Metadata = { title: 'Tài khoản · Onboard VN', robots: { index: false } };

export default async function AccountPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-6 px-6 py-10">
      <div className="flex items-baseline justify-between">
        <h1 className="text-2xl font-semibold">Tài khoản</h1>
        {user.username ? (
          <Link href={`/u/${user.username}`} className="text-sm underline">
            Xem hồ sơ công khai
          </Link>
        ) : null}
      </div>
      <ProfileForm
        initial={{
          name: user.name,
          username: user.displayUsername ?? user.username ?? '',
          bggUsername: user.bggUsername ?? '',
        }}
      />
      <AccountSecurity />
    </main>
  );
}
