import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentUser, serverApi } from '@/lib/api-server';
import { formatVnDateTime } from '@/lib/events-time';
import { SITE_NAME } from '@/lib/site';

export const metadata: Metadata = { title: `Kèo của tôi · ${SITE_NAME}`, robots: { index: false } };

export default async function MyEventsPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login?next=/events/mine');

  const res = await (await serverApi()).api.me.events.$get();
  if (!res.ok) throw new Error('Không tải được Kèo của tôi');
  const { items } = await res.json();

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-6 py-10">
      <h1 className="text-2xl font-semibold">Kèo của tôi</h1>
      {items.length === 0 ? (
        <p className="text-muted-foreground text-sm">Bạn chưa tham gia Kèo nào.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {items.map((meetup) => (
            <li key={meetup.id}>
              <Link
                href={`/events/${meetup.slug}`}
                className="hover:border-foreground/40 block rounded-lg border p-4 transition"
              >
                <h2 className="font-medium">
                  {meetup.title}
                  {meetup.status === 'cancelled' ? (
                    <span className="text-destructive ml-2 text-xs font-normal">Đã hủy</span>
                  ) : null}
                </h2>
                <p className="text-muted-foreground text-sm">{formatVnDateTime(meetup.startsAt)}</p>
                <p className="text-muted-foreground text-sm">{meetup.locationLabel}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
