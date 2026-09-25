import Link from 'next/link';
import { getCurrentUser } from '@/lib/api-server';
import { FriendRequestBadge } from './friend-request-badge';
import { SignOutButton } from './sign-out-button';
import { SiteLogo } from './site-logo';

const ROLE_LABEL = { user: 'Thành viên', maintainer: 'Maintainer', admin: 'Admin' } as const;

export async function SiteHeader() {
  const user = await getCurrentUser();

  return (
    <header className="border-b">
      <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between px-6">
        <div className="flex items-center gap-4">
          <Link href="/" className="shrink-0">
            <SiteLogo />
          </Link>
          <Link href="/games" className="text-sm font-medium">
            Game
          </Link>
          <Link href="/cafes" className="text-sm font-medium">
            Địa điểm chơi
          </Link>
          <Link href="/map" className="text-sm font-medium">
            Bản đồ
          </Link>
          <Link href="/events" className="text-sm font-medium">
            Kèo
          </Link>
          {user ? (
            <Link href="/friends" className="flex items-center gap-1.5 text-sm font-medium">
              Bạn bè
              <FriendRequestBadge />
            </Link>
          ) : null}
          {user ? (
            <Link href="/shelf" className="text-sm font-medium">
              Tủ game
            </Link>
          ) : null}
          {user && user.cafeMembershipCount > 0 ? (
            <Link href="/my-cafes" className="text-sm font-medium">
              Địa điểm chơi của tôi
            </Link>
          ) : null}
          {user && user.role !== 'user' ? (
            <>
              <Link href="/admin/games" className="text-sm font-medium">
                Quản lý game
              </Link>
              <Link href="/admin/cafes" className="text-sm font-medium">
                Quản lý địa điểm chơi
              </Link>
              <Link href="/admin/scan" className="text-sm font-medium">
                Quét mã
              </Link>
              <Link href="/admin/categories" className="text-sm font-medium">
                Thể loại
              </Link>
              <Link href="/admin/events" className="text-sm font-medium">
                Quản lý Kèo
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
            <Link href="/account" className="hover:underline">
              {user.name}
            </Link>
            <span className="rounded bg-muted px-1.5 py-0.5 text-xs">{ROLE_LABEL[user.role]}</span>
            <SignOutButton />
          </div>
        ) : (
          <div className="flex items-center gap-3 text-sm font-medium">
            <Link href="/login">Đăng nhập</Link>
            <Link href="/signup">Đăng ký</Link>
          </div>
        )}
      </div>
    </header>
  );
}
