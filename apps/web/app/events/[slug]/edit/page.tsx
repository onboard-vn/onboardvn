import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { EventForm } from '@/components/events/event-form';
import { getCurrentUser, serverApi } from '@/lib/api-server';
import { SITE_NAME } from '@/lib/site';

export const metadata: Metadata = { title: `Sửa kèo · ${SITE_NAME}`, robots: { index: false } };

export default async function EditEventPage(props: PageProps<'/events/[slug]/edit'>) {
  const { slug } = await props.params;
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/events/${slug}/edit`)}`);

  const client = await serverApi();
  const [meetupRes, provincesRes] = await Promise.all([
    client.api.events[':slug'].$get({ param: { slug }, query: {} }),
    client.api.locations.provinces.$get(),
  ]);
  if (meetupRes.status === 404) notFound();
  if (!meetupRes.ok) throw new Error('Không tải được Kèo');
  const meetup = await meetupRes.json();
  if (meetup.createdBy.id !== user.id) notFound();

  const provinces = provincesRes.ok ? (await provincesRes.json()).items : [];

  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-6 px-6 py-10">
      <h1 className="text-2xl font-semibold">Sửa kèo</h1>
      <EventForm
        provinces={provinces}
        mode="edit"
        initial={{
          id: meetup.id,
          title: meetup.title,
          description: meetup.description,
          startsAt: meetup.startsAt,
          endsAt: meetup.endsAt,
          cafe: meetup.cafe,
          addressLine: meetup.addressLine,
          provinceCode: meetup.provinceCode,
          wardCode: meetup.wardCode,
          capacity: meetup.capacity,
          visibility: meetup.visibility,
        }}
      />
    </main>
  );
}
