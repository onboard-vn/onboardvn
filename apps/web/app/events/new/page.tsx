import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { EventForm } from '@/components/events/event-form';
import { getCurrentUser, serverApi } from '@/lib/api-server';
import { SITE_NAME } from '@/lib/site';

export const metadata: Metadata = { title: `Tạo kèo · ${SITE_NAME}`, robots: { index: false } };

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function NewEventPage(props: PageProps<'/events/new'>) {
  const sp = await props.searchParams;
  const cafeSlug = firstValue(sp.cafe);
  const clubSlug = firstValue(sp.club);

  const user = await getCurrentUser();
  if (!user)
    redirect(
      `/login?next=${encodeURIComponent(`/events/new${cafeSlug ? `?cafe=${cafeSlug}` : clubSlug ? `?club=${clubSlug}` : ''}`)}`,
    );

  const client = await serverApi();
  const [provincesRes, clubsRes] = await Promise.all([
    client.api.locations.provinces.$get(),
    client.api.clubs.$get(),
  ]);
  const provinces = provincesRes.ok ? (await provincesRes.json()).items : [];
  const clubs = clubsRes.ok ? (await clubsRes.json()).items : [];
  const initialClubId = clubs.find((c) => c.slug === clubSlug)?.id;

  const prefillCafe = cafeSlug
    ? await client.api.cafes[':slug'].$get({ param: { slug: cafeSlug } }).then((res) =>
        res.ok
          ? res.json().then((cafe) => ({
              id: cafe.id,
              slug: cafe.slug,
              name: cafe.name,
              wardName: cafe.wardName,
              provinceName: cafe.provinceName,
            }))
          : undefined,
      )
    : undefined;

  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-6 px-6 py-10">
      <h1 className="text-2xl font-semibold">Tạo kèo</h1>
      <EventForm
        provinces={provinces}
        mode="create"
        prefillCafe={prefillCafe}
        clubs={clubs}
        initialClubId={initialClubId}
      />
    </main>
  );
}
