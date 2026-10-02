import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CreateTableForm } from '@/components/events/create-table-form';
import { CreatorActions } from '@/components/events/creator-actions';
import { RsvpButtons } from '@/components/events/rsvp-buttons';
import { SessionTableCard } from '@/components/session-table-card';
import { getCurrentUser, serverApi } from '@/lib/api-server';
import { SITE_URL } from '@/lib/env';
import { formatVnDateTime } from '@/lib/events-time';
import { SITE_NAME } from '@/lib/site';

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export async function generateMetadata(props: PageProps<'/events/[slug]'>): Promise<Metadata> {
  const { slug } = await props.params;
  const sp = await props.searchParams;
  const code = firstValue(sp.code);
  const res = await (
    await serverApi()
  ).api.events[':slug'].$get({ param: { slug }, query: { ...(code && { code }) } });
  if (!res.ok) return { title: `Kèo · ${SITE_NAME}` };
  const meetup = await res.json();
  const isPublic = meetup.visibility === 'public' && !code;
  const title = `${meetup.title} · ${SITE_NAME}`;

  return {
    title,
    robots: isPublic ? undefined : { index: false },
    // The invite `?code=` is a bearer secret — never let it leak to an external site's logs
    // via the Referer header from an outbound link on this page.
    ...(code && { referrer: 'no-referrer' }),
    ...(isPublic && {
      description: `Kèo board game tại ${meetup.locationLabel}, ${formatVnDateTime(meetup.startsAt)}.`,
      alternates: { canonical: `/events/${slug}` },
      openGraph: { title, url: `${SITE_URL}/events/${slug}` },
    }),
  };
}

export default async function EventDetailPage(props: PageProps<'/events/[slug]'>) {
  const { slug } = await props.params;
  const sp = await props.searchParams;
  const code = firstValue(sp.code);

  const [meetupRes, user] = await Promise.all([
    (await serverApi()).api.events[':slug'].$get({
      param: { slug },
      query: { ...(code && { code }) },
    }),
    getCurrentUser(),
  ]);
  if (meetupRes.status === 404) notFound();
  if (!meetupRes.ok) throw new Error('Không tải được Kèo');
  const meetup = await meetupRes.json();

  const isCreator = user?.id === meetup.createdBy.id;
  const viewerTableId =
    (user && meetup.tables.find((t) => t.seatedUsers.some((u) => u.id === user.id))?.id) ?? null;
  const viewerGoing = meetup.viewerStatus === 'going';

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-6 py-10">
      <div className="flex flex-col gap-2">
        {meetup.status === 'cancelled' ? (
          <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">
            Kèo này đã bị hủy
          </p>
        ) : null}
        <h1 className="text-2xl font-semibold tracking-tight">{meetup.title}</h1>
        {meetup.club ? (
          <p className="text-sm">
            Club:{' '}
            <Link href={`/clubs/${meetup.club.slug}`} className="underline">
              {meetup.club.name}
            </Link>
          </p>
        ) : null}
        <p className="text-muted-foreground text-sm">{formatVnDateTime(meetup.startsAt)}</p>
        <p className="text-sm">
          {meetup.cafe ? (
            <Link href={`/cafes/${meetup.cafe.slug}`} className="underline">
              {meetup.locationLabel}
            </Link>
          ) : (
            meetup.locationLabel
          )}
        </p>
        {meetup.description ? (
          <p className="text-sm whitespace-pre-wrap">{meetup.description}</p>
        ) : null}
        <p className="text-xs text-muted-foreground">
          {meetup.goingCount}
          {meetup.capacity ? `/${meetup.capacity}` : ''} người đi
          {meetup.viewerStatus === 'waitlist' ? ' · bạn đang trong danh sách chờ' : ''}
        </p>
      </div>

      {user && meetup.status === 'scheduled' ? (
        <RsvpButtons
          meetupId={meetup.id}
          code={code}
          viewerStatus={meetup.viewerStatus}
          waitlistPosition={meetup.waitlistPosition}
        />
      ) : !user ? (
        <a
          href={`/login?next=${encodeURIComponent(`/events/${slug}${code ? `?code=${code}` : ''}`)}`}
          className="text-sm underline"
        >
          Đăng nhập để tham gia
        </a>
      ) : null}

      {isCreator ? (
        <CreatorActions meetupId={meetup.id} slug={meetup.slug} title={meetup.title} />
      ) : null}

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium">Bàn ({meetup.tables.length})</h2>
          {viewerGoing && meetup.status === 'scheduled' ? (
            <CreateTableForm meetupId={meetup.id} />
          ) : null}
        </div>
        {meetup.tables.length === 0 ? (
          <p className="text-muted-foreground text-sm">Chưa có bàn nào.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {meetup.tables.map((table) => (
              <SessionTableCard
                key={table.id}
                meetupId={meetup.id}
                table={table}
                meetupStatus={meetup.status}
                viewerId={user?.id ?? null}
                viewerGoing={viewerGoing}
                viewerTableId={viewerTableId}
                canManage={isCreator}
              />
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
