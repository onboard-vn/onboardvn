import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { getCurrentUser, serverApi } from '@/lib/api-server';
import { SITE_NAME } from '@/lib/site';
import { ConfirmInviteButton } from './confirm-invite-button';

async function fetchPreview(code: string) {
  const res = await (await serverApi()).api.friends.invite[':code'].$get({ param: { code } });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Invite preview failed: ${res.status}`);
  return res.json();
}

export const metadata: Metadata = { title: `Kết bạn · ${SITE_NAME}`, robots: { index: false } };

export default async function InvitePage({ params }: PageProps<'/invite/[code]'>) {
  const { code } = await params;
  const preview = await fetchPreview(code);
  if (!preview) notFound();

  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/invite/${code}`)}`);

  const isSelf = user.id === preview.id;

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center gap-4 px-6 py-10 text-center">
      <div className="flex items-center gap-3">
        {preview.image ? (
          // eslint-disable-next-line @next/next/no-img-element -- external avatar hosts vary
          <img src={preview.image} alt="" className="size-14 rounded-full" />
        ) : null}
        <div className="text-left">
          <h1 className="text-xl font-semibold">{preview.name}</h1>
          <p className="text-muted-foreground text-sm">
            @{preview.displayUsername ?? preview.username}
          </p>
        </div>
      </div>
      {isSelf ? (
        <p className="text-muted-foreground text-sm">Đây là mã mời kết bạn của chính bạn.</p>
      ) : (
        <ConfirmInviteButton code={code} />
      )}
    </main>
  );
}
