import Link from 'next/link';
import { getCurrentUser } from '@/lib/api-server';
import { SignOutButton } from './sign-out-button';

const ROLE_LABEL = { user: 'Thành viên', maintainer: 'Maintainer', admin: 'Admin' } as const;

export async function SiteHeader() {
  const user = await getCurrentUser();

  return (
    <header className="border-b">
      <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between px-6">
        <div className="flex items-center gap-4">
          <Link href="/" className="font-semibold">
            Onboard VN
          </Link>
          <Link href="/games" className="text-sm font-medium">
            Game
          </Link>
          <Link href="/cafes" className="text-sm font-medium">
            Quán
          </Link>
          {user && user.role !== 'user' ? (
            <>
              <Link href="/admin/games" className="text-sm font-medium">
                Quản lý game
              </Link>
              <Link href="/admin/cafes" className="text-sm font-medium">
                Quản lý quán
              </Link>
              <Link href="/admin/scan" className="text-sm font-medium">
                Quét mã
              </Link>
              <Link href="/admin/categories" className="text-sm font-medium">
                Thể loại
              </Link>
            </>
          ) : null}
        </div>
        {user ? (
          <div className="flex items-center gap-3 text-sm">
            {user.image ? (
              // eslint-disable-next-line @next/next/no-img-element -- external avatar hosts vary
              <img src={user.image} alt="" className="size-7 rounded-full" />
            ) : null}
            <Link href="/tai-khoan" className="hover:underline">
              {user.name}
            </Link>
            <span className="rounded bg-muted px-1.5 py-0.5 text-xs">{ROLE_LABEL[user.role]}</span>
            <SignOutButton />
          </div>
        ) : (
          <div className="flex items-center gap-3 text-sm font-medium">
            <Link href="/login">Đăng nhập</Link>
            <Link href="/dang-ky">Đăng ký</Link>
          </div>
        )}
      </div>
    </header>
  );
}
