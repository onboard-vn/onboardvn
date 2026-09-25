import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getCurrentUser, serverApi } from '@/lib/api-server';
import { SITE_NAME } from '@/lib/site';
import { AcceptInviteButton } from './accept-invite-button';

async function fetchPreview(token: string) {
  const res = await (await serverApi()).api['owner-invites'][':token'].$get({ param: { token } });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Invite preview failed: ${res.status}`);
  return res.json();
}

export const metadata: Metadata = {
  title: `Lời mời chủ quán · ${SITE_NAME}`,
  robots: { index: false },
};

const STATUS_MESSAGE: Record<string, string> = {
  used: 'Link mời này đã được dùng.',
  expired: 'Link mời này đã hết hạn.',
  revoked: 'Link mời này đã bị thu hồi.',
};

export default async function OwnerInvitePage({ params }: PageProps<'/my-cafes/invite/[token]'>) {
  const { token } = await params;
  const preview = await fetchPreview(token);
  if (!preview) notFound();

  const user = await getCurrentUser();
  const next = `/my-cafes/invite/${token}`;

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center gap-4 px-6 py-10 text-center">
      <h1 className="text-xl font-semibold">Lời mời làm chủ quán &quot;{preview.cafeName}&quot;</h1>

      {preview.status !== 'valid' ? (
        <p className="text-muted-foreground text-sm">{STATUS_MESSAGE[preview.status]}</p>
      ) : !user ? (
        <div className="flex flex-col gap-2">
          <p className="text-muted-foreground text-sm">
            Đăng nhập hoặc đăng ký tài khoản để nhận quyền quản lý quán.
          </p>
          <div className="flex justify-center gap-3 text-sm font-medium underline">
            <Link href={`/login?next=${encodeURIComponent(next)}`}>Đăng nhập</Link>
            <Link href={`/signup?next=${encodeURIComponent(next)}`}>Đăng ký</Link>
          </div>
        </div>
      ) : (
        <AcceptInviteButton token={token} />
      )}
    </main>
  );
}
