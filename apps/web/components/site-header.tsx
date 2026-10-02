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
      <div className="mx-auto flex min-h-14 w-full max-w-5xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-6 py-2">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <Link href="/" className="shrink-0">
            <SiteLogo />
          </Link>
          <Link href="/games" className="text-sm font-medium whitespace-nowrap">
            Game
          </Link>
          <Link href="/cafes" className="text-sm font-medium whitespace-nowrap">
            Địa điểm chơi
          </Link>
          <Link href="/map" className="text-sm font-medium whitespace-nowrap">
            Bản đồ
          </Link>
          <Link href="/events" className="text-sm font-medium whitespace-nowrap">
            Kèo
          </Link>
          {user ? (
            <Link href="/clubs" className="text-sm font-medium whitespace-nowrap">
              Club
            </Link>
          ) : null}
          {user ? (
            <Link
              href="/friends"
              className="flex items-center gap-1.5 text-sm font-medium whitespace-nowrap"
            >
              Bạn bè
              <FriendRequestBadge />
            </Link>
          ) : null}
          {user ? (
            <Link href="/shelf" className="text-sm font-medium whitespace-nowrap">
              Tủ game
            </Link>
          ) : null}
          {user && user.cafeMembershipCount > 0 ? (
            <Link href="/my-cafes" className="text-sm font-medium whitespace-nowrap">
              Địa điểm chơi của tôi
            </Link>
          ) : null}
          {user && user.role !== 'user' ? (
            <>
              <Link href="/admin/games" className="text-sm font-medium whitespace-nowrap">
                Quản lý game
              </Link>
              <Link href="/admin/cafes" className="text-sm font-medium whitespace-nowrap">
                Quản lý địa điểm chơi
              </Link>
              <Link href="/admin/scan" className="text-sm font-medium whitespace-nowrap">
                Quét mã
              </Link>
              <Link href="/admin/categories" className="text-sm font-medium whitespace-nowrap">
                Thể loại
              </Link>
              <Link href="/admin/events" className="text-sm font-medium whitespace-nowrap">
                Quản lý Kèo
              </Link>
              <Link href="/admin/clubs" className="text-sm font-medium whitespace-nowrap">
                Quản lý club
              </Link>
            </>
          ) : null}
          {user && user.role === 'admin' ? (
            <Link href="/admin/contributions" className="text-sm font-medium whitespace-nowrap">
              Đóng góp cộng đồng
            </Link>
          ) : null}
        </div>
        {user ? (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
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
          <div className="flex items-center gap-3 text-sm font-medium whitespace-nowrap">
            <Link href="/login">Đăng nhập</Link>
            <Link href="/signup">Đăng ký</Link>
          </div>
        )}
      </div>
    </header>
  );
}
