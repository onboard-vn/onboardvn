import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { buttonVariants } from '@/components/ui/button';
import { LeaveClubButton } from '@/components/clubs/leave-club-button';
import { getCurrentUser, serverApi } from '@/lib/api-server';
import { formatVnDateTime } from '@/lib/events-time';
import { SITE_NAME } from '@/lib/site';

export const metadata: Metadata = { title: `Club · ${SITE_NAME}`, robots: { index: false } };

const ROLE_LABEL = { owner: 'Owner', admin: 'Admin', member: 'Thành viên' } as const;

export default async function ClubDetailPage(props: PageProps<'/clubs/[slug]'>) {
  const { slug } = await props.params;
  const client = await serverApi();
  const [res, user] = await Promise.all([
    client.api.clubs[':slug'].$get({ param: { slug } }),
    getCurrentUser(),
  ]);
  if (res.status === 404) notFound();
  if (!res.ok) throw new Error('Không tải được club');
  const { club, myRole, memberCount, members } = await res.json();

  const meetupsRes =
    club.id && myRole
      ? await client.api.events.$get({ query: { clubId: club.id, pageSize: '20' } })
      : null;
  const meetups = meetupsRes?.ok ? (await meetupsRes.json()).items : [];
  const canManage = myRole === 'owner' || myRole === 'admin';

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-6 py-10">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">{club.name}</h1>
        <p className="text-muted-foreground text-sm">
          {memberCount} thành viên · Club riêng tư
          {myRole ? ` · ${ROLE_LABEL[myRole]}` : ''}
        </p>
        {club.description ? (
          <p className="text-sm whitespace-pre-wrap">{club.description}</p>
        ) : null}
      </div>

      {!myRole ? (
        <p className="text-muted-foreground text-sm">
          {user
            ? 'Đây là club riêng tư. Hãy mở link mời từ quản trị viên để tham gia.'
            : 'Đăng nhập và mở link mời để tham gia club này.'}
        </p>
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            <Link href={`/events/new?club=${club.slug}`} className={buttonVariants({ size: 'sm' })}>
              Tạo Kèo cho club
            </Link>
            {canManage ? (
              <Link
                href={`/clubs/${club.slug}/manage`}
                className={buttonVariants({ variant: 'outline', size: 'sm' })}
              >
                Quản lý
              </Link>
            ) : null}
            {myRole !== 'owner' && club.id ? <LeaveClubButton clubId={club.id} /> : null}
          </div>

          <section className="flex flex-col gap-3">
            <h2 className="text-sm font-medium">Kèo sắp tới ({meetups.length})</h2>
            {meetups.length === 0 ? (
              <p className="text-muted-foreground text-sm">Chưa có Kèo nào.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {meetups.map((meetup) => (
                  <li key={meetup.id}>
                    <Link
                      href={`/events/${meetup.slug}`}
                      className="hover:border-foreground/40 block rounded-lg border p-3 transition"
                    >
                      <p className="font-medium">{meetup.title}</p>
                      <p className="text-muted-foreground text-sm">
                        {formatVnDateTime(meetup.startsAt)} · {meetup.locationLabel}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="text-sm font-medium">Thành viên ({memberCount})</h2>
            <ul className="flex flex-col divide-y rounded-lg border">
              {(members ?? []).map((m) => (
                <li key={m.user.id} className="flex items-center justify-between px-3 py-2 text-sm">
                  {m.user.username ? (
                    <Link href={`/u/${m.user.username}`} className="hover:underline">
                      {m.user.displayUsername ?? m.user.name}
                    </Link>
                  ) : (
                    <span>{m.user.name}</span>
                  )}
                  <span className="text-muted-foreground text-xs">{ROLE_LABEL[m.role]}</span>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </main>
  );
}
